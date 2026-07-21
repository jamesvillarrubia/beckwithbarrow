# Feature: IaC Full Ownership — Canonical Config Fan-out + DigitalOcean Strapi Migration

**Branch:** feature/static-data-cdn-cache (planning); implementation branch TBD
**Created:** 2026-06-19
**Status:** Approved — ready for implementation

---

## Problem

Three classes of configuration currently live OUTSIDE code and are therefore not IaC:

1. **GitHub Actions secrets** (`PULUMI_ACCESS_TOKEN`, `VERCEL_API_TOKEN`) and **variables**
   (`VITE_PROD_API_URL`, `VITE_RECAPTCHA_SITE_KEY`) — set by hand in the GitHub UI, consumed
   by `.github/workflows/deploy.yml`.
2. **The Vercel connection** — env vars are managed by Pulumi (`infra/index.ts`), but the
   canonical values are duplicated by hand into GitHub for the CI build step. The same logical
   value (e.g. the prod API URL) is maintained in two places that can silently diverge.
3. **The Strapi connection** — Strapi Cloud has no public API for env-var management, so its
   config is a comment-only checklist, set by hand in the Strapi Cloud dashboard. Strapi Cloud
   also offers no staging environment.

The result: a value like the prod API URL must be edited in Pulumi config AND in a GitHub
variable AND (after migration) in the Strapi app config. Three edits, three chances to drift.

**Goal: maximal IaC coverage.** One canonical source of truth per value that fans out to every
consumer. Change once → `pulumi up` → propagates everywhere. Declarative, non-circular, and
fails with a clear instructional error when a bootstrap credential is missing.

---

## Goals

- [ ] Every GitHub Actions secret and variable that `deploy.yml` consumes is created and owned
      by Pulumi via `@pulumi/github` — never touched in the GitHub UI again.
- [ ] A single declarative `MANAGED` table is the one source of truth for every projected value.
      One canonical Pulumi config key fans out to its GitHub and/or Vercel consumers from one row.
- [ ] The Vercel env-var loop in `index.ts` is driven off the same `MANAGED` table (no second list).
- [ ] Bootstrap credentials are validated-but-never-managed: the program throws a clear,
      instructional, multi-line error naming the missing env var and how to fix it.
- [ ] (Half B) Strapi runs on DigitalOcean App Platform + DigitalOcean Managed Postgres, fully
      defined in Pulumi, with a staging environment alongside prod, giving free PITR backups and
      multi-environment support. Cloudinary remains the external asset provider, untouched.

---

## Non-Goals

- **Repo settings / branch-protection-as-code** — deferred to Phase 2 (see Future Work).
- **Managing the Tier-0 bootstrap roots themselves** — by definition Pulumi cannot manage the
  credentials it authenticates with. They are validated, not managed.
- **Moving Cloudinary** — assets stay in Cloudinary. The migration touches Postgres only.
- **DNS / registrar management** — unchanged.
- **Replacing `strapi transfer` workflows with IaC** — the data migration uses
  `pg_dump` / `pg_restore` of Postgres ONLY (see Behavior → Data migration safety).

---

## Architecture

### Two-tier secret model (the core idea)

**Tier 0 — Bootstrap roots.** Credentials Pulumi needs to authenticate *before* the program
runs. Read from environment variables, validated at program start, and **never managed by
Pulumi** — managing the token that authenticates you is circular. If a Tier-0 var is missing,
the program throws an instructional error and exits.

| Env var | Used by | Scope / notes |
|---|---|---|
| `PULUMI_ACCESS_TOKEN` | Pulumi engine (unlocks the Cloud backend) | Also dual-homed in config — see the honest exception below |
| `GITHUB_TOKEN` | `@pulumi/github` provider | GitHub PAT, scope `repo` |
| `VERCEL_API_TOKEN` | `@pulumiverse/vercel` provider + deploy-hook dynamic resource | |
| `DIGITALOCEAN_TOKEN` | `@pulumi/digitalocean` provider (Half B) | |

**Tier 1 — Managed values.** The canonical value lives in Pulumi config
(`pulumi config set [--secret] <key> <value>`). Pulumi PROJECTS each value out to its consumers
via the declarative fan-out table. Change the Pulumi config once → `pulumi up` → every consumer
updates.

```
                 ┌─────────────────────────┐
                 │  Pulumi config (canon)  │   <- single source of truth
                 │  e.g. viteProdApiUrl    │
                 └───────────┬─────────────┘
                             │  MANAGED[] fan-out table
              ┌──────────────┼──────────────────┐
              ▼              ▼                   ▼
   github.ActionsVariable  github.ActionsSecret  vercel.ProjectEnvironmentVariable
   (VITE_PROD_API_URL)     (PULUMI_ACCESS_TOKEN) (VITE_PROD_API_URL, ...)
```

### The declarative fan-out table

A single `MANAGED: ManagedValue[]` array in `infra/config.ts` is the one source of truth for
projections.

```ts
interface ManagedValue {
  /** Canonical Pulumi config key, e.g. "viteProdApiUrl". */
  config: string;
  /** true → config.requireSecret(); false → config.require(). */
  secret: boolean;
  /** Project to a GitHub Actions secret or variable. Omit if not projected to GitHub. */
  github?: { name: string; kind: "secret" | "variable" };
  /** Project to a Vercel project environment variable. Omit if not projected to Vercel. */
  vercel?: { key: string };
}
```

The program iterates `MANAGED` and creates the right resources:

- `github.ActionsSecret`   for `github.kind === "secret"`
- `github.ActionsVariable` for `github.kind === "variable"`
- `vercel.ProjectEnvironmentVariable` for any row with a `vercel` projection

**Adding a new managed value = adding one row.** No other edits.

### Known consumers encoded by `MANAGED` (Phase 1)

Derived from `.github/workflows/deploy.yml` and `infra/index.ts`:

| Canonical config key | secret | GitHub projection | Vercel projection |
|---|---|---|---|
| `pulumiAccessToken` | yes | secret `PULUMI_ACCESS_TOKEN` | — |
| `vercelApiToken` | yes | secret `VERCEL_API_TOKEN` | — |
| `viteProdApiUrl` | no | variable `VITE_PROD_API_URL` | `VITE_PROD_API_URL` |
| `viteRecaptchaSiteKey` | no | variable `VITE_RECAPTCHA_SITE_KEY` | `VITE_RECAPTCHA_SITE_KEY` |
| `resendApiKey` | yes | — | `RESEND_API_KEY` |
| `recaptchaSecretKey` | yes | — | `RECAPTCHA_SECRET_KEY` |
| `contactEmail` | no | — | `CONTACT_EMAIL` |
| `viteUseProdApi` | no | — | `VITE_USE_PROD_API` |

Note `viteProdApiUrl` and `viteRecaptchaSiteKey` each fan out to BOTH a GitHub variable AND a
Vercel env var from a single canonical row — that is the entire point of the table.

`deploy.yml` GitHub consumers, for reference:
- secrets: `PULUMI_ACCESS_TOKEN`, `VERCEL_API_TOKEN` (the `pulumi/actions@v5` step's `env:`)
- variables: `VITE_PROD_API_URL`, `VITE_RECAPTCHA_SITE_KEY` (the frontend build step's `env:`)

### Bootstrap guard behavior

A `requireBootstrapEnv(name, helpText)` helper in `infra/config.ts` reads `process.env[name]`,
returns it when set, and throws an `Error` whose message is a clear, instructional, multi-line
block when unset. The exact rendered format for `GITHUB_TOKEN`:

```
✗ GITHUB_TOKEN not set.
  The @pulumi/github provider needs a GitHub PAT (scope: repo) to manage
  repo secrets and variables. This is a BOOTSTRAP credential — Pulumi cannot
  manage the token it authenticates with.
  Fix once:  export GITHUB_TOKEN=ghp_xxx   then re-run `pulumi up`.
```

The first line (`✗ <NAME> not set.`) and the final `Fix once:` line are produced by the helper;
the middle explanatory lines come from the per-call `helpText`. This keeps the guard generic
while letting each call site explain its own credential.

### The one honest exception (documented, not hidden)

`PULUMI_ACCESS_TOKEN` is **dual-homed**:

1. It lives in the **environment**, because the Pulumi engine needs it BEFORE the program runs
   to unlock the Pulumi Cloud backend. (Tier 0.)
2. It also lives in **Pulumi config** (`pulumiAccessToken`), because the program must project it
   to the `PULUMI_ACCESS_TOKEN` GitHub secret that `deploy.yml` consumes. (Tier 1.)

This is the one irreducible non-single-source value: the same secret is held in two places by
necessity. It is documented honestly as a known exception in `infra/config.ts` rather than
pretended to be single-source. The operator sets it twice on first bootstrap
(`export PULUMI_ACCESS_TOKEN=...` for the engine; `pulumi config set --secret pulumiAccessToken
...` for the projection).

### File layout (Phase 1)

```
infra/
├── config.ts        # NEW: ManagedValue interface, requireBootstrapEnv guard,
│                    #      MANAGED table, splitManaged() helper
├── github.ts        # NEW: @pulumi/github provider + ActionsSecret/ActionsVariable loop
├── index.ts         # REFACTORED: Vercel env loop driven off MANAGED; imports github.ts
├── webhooks.ts      # unchanged (Vercel deploy hook dynamic resource)
├── config.test.ts   # NEW: Vitest unit tests for guard + splitManaged()
└── package.json     # + @pulumi/github, + vitest, + build/test scripts
```

### File layout (Phase 1 + Half B)

```
infra/
├── digitalocean.ts  # NEW (Half B): DO Managed Postgres + App Platform (prod + staging)
└── ... (as above)
```

---

## Interfaces

### `infra/config.ts`

```ts
export interface ManagedValue {
  config: string;
  secret: boolean;
  github?: { name: string; kind: "secret" | "variable" };
  vercel?: { key: string };
}

/** Validate a Tier-0 bootstrap credential. Throws instructional error if unset. */
export function requireBootstrapEnv(name: string, helpText: string): string;

/** Split MANAGED into the three consumer buckets. Pure; unit-tested. */
export function splitManaged(managed: ManagedValue[]): {
  githubSecrets: ManagedValue[];
  githubVariables: ManagedValue[];
  vercelVars: ManagedValue[];
};

export const MANAGED: ManagedValue[];
```

### `infra/github.ts`

```ts
// Configures @pulumi/github provider (owner jamesvillarrubia, repo beckwithbarrow,
// token from requireBootstrapEnv("GITHUB_TOKEN", ...)) and creates one
// github.ActionsSecret / github.ActionsVariable per MANAGED row with a github projection.
// Exports nothing required by index.ts beyond the side effect of resource creation;
// index.ts imports the module so the resources are registered in the stack.
```

---

## Behavior

- **Change once, propagate everywhere.** `pulumi config set viteProdApiUrl <new-url>` then
  `pulumi up` updates both the `VITE_PROD_API_URL` GitHub variable and the Vercel env var.
- **Missing bootstrap credential → clear failure.** Running `pulumi up` without `GITHUB_TOKEN`
  exported throws the instructional block above and aborts before any resource is touched.
- **Adding a consumer is one row.** A new value projected to GitHub + Vercel is a single
  `MANAGED` entry; no loop edits.
- **Data migration safety (Half B).** Migration from Strapi Cloud's Postgres to DO Managed
  Postgres uses `pg_dump` → `pg_restore` of the Postgres database ONLY. `strapi transfer`,
  `strapi import`, and the `transfer:*` / `deploy:cloud*` / `restore` package scripts are
  BANNED for this migration: a `strapi transfer` run with prod credentials on 2026-03-19
  destroyed 201 Cloudinary images because the transfer drove the upload provider. Cloudinary is
  never touched during migration — only the relational database moves.

---

## Cost (Half B)

| Item | Plan | Cost |
|---|---|---|
| DO App Platform (Strapi, basic instance) | Basic | ~$5/mo |
| DO Managed Postgres (smallest tier, daily backups + PITR bundled free) | 1 GB / 1 vCPU | ~$15/mo |
| **Total** | | **~$20/mo** |
| (Current Strapi Cloud) | | ~$18/mo |

Roughly flat (~$20 vs $18) and the migration buys IaC ownership, free point-in-time-recovery
backups, and a real staging environment — the multi-environment gap that motivated leaving
Strapi Cloud. Staging Postgres can be the same smallest tier or a dev-database tier; sized for
cost in the plan.

---

## Open Questions / Assumptions

- [ ] **GitHub PAT vs fine-grained token.** Assumed a classic PAT with `repo` scope works for
      `@pulumi/github` ActionsSecret/ActionsVariable. A fine-grained token needs
      `Secrets: read/write` + `Variables: read/write` + `Actions: read` on the repo. Confirm
      which the operator will mint.
- [ ] **`tsconfig.json` include scope.** Current `include` is `["index.ts"]` only. New files
      (`config.ts`, `github.ts`, `digitalocean.ts`) must be added to `include`, and the Vitest
      test file kept out of the Pulumi build. The plan handles this.
- [ ] **Existing GitHub secrets/variables already set by hand.** If `PULUMI_ACCESS_TOKEN` etc.
      already exist in the repo, `github.ActionsSecret` will overwrite (it manages the value),
      which is the desired outcome. No import needed — GitHub secrets are write-only and have no
      stable import identity for value, so Pulumi simply asserts the value.
- [ ] **Strapi app subdirectory (Half B).** Confirmed `api/` is the Strapi app (Strapi 5.31.1,
      `api/package.json` name `my-strapi-project`). DO App Platform `source_dir` = `api`.
- [ ] **Strapi Cloud Postgres access for `pg_dump` (Half B).** Assumes Strapi Cloud exposes a
      Postgres connection string / credentials for an external `pg_dump`. If it does not, the
      fallback is Strapi Cloud's own DB export, restored via `pg_restore` — still Postgres-only,
      still never `strapi transfer`.

---

## Future Work (Phase 2 — explicitly deferred)

- Repo settings as code (`github.RepositoryRuleset` / repo topics, merge settings).
- Branch protection as code for `main`.
- Both are out of scope for this initiative and listed here only so the boundary is explicit.
