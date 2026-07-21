# IaC Full Ownership — Implementation Plan

**Branch:** implementation branch off `main` (e.g. `feature/iac-full-ownership`)
**Created:** 2026-06-19
**Spec:** `file:///Users/james/Sites/beckwithbarrow/reqts/iac-full-ownership.md`
**Status:** Ready for implementation

---

## Goal

Make GitHub Actions secrets/variables, Vercel env vars, and (Half B) the entire Strapi backend
IaC-owned. A single `MANAGED` fan-out table in `infra/config.ts` is the one source of truth that
projects each canonical Pulumi config value out to its GitHub and Vercel consumers. Half B moves
Strapi from Strapi Cloud to DigitalOcean App Platform + Managed Postgres (prod + staging),
defined entirely in Pulumi, migrating data via `pg_dump`/`pg_restore` only.

## Architecture

- **Tier 0 (bootstrap roots):** `PULUMI_ACCESS_TOKEN`, `GITHUB_TOKEN`, `VERCEL_API_TOKEN`,
  `DIGITALOCEAN_TOKEN` — validated from env via `requireBootstrapEnv()`, never managed.
- **Tier 1 (managed values):** canonical value in Pulumi config → projected via `MANAGED[]` to
  `github.ActionsSecret` / `github.ActionsVariable` / `vercel.ProjectEnvironmentVariable`.
- **Honest exception:** `PULUMI_ACCESS_TOKEN` is dual-homed (env for the engine + config for the
  GitHub-secret projection). Documented, not hidden.
- **Half B:** `@pulumi/digitalocean` defines DO Managed Postgres + App Platform apps; Strapi env
  vars wired from Pulumi config + the Postgres cluster output; Cloudinary untouched.

## Tech Stack

- Pulumi (TypeScript, CommonJS), Pulumi Cloud backend, stack `prod`.
- Providers: `@pulumiverse/vercel` (existing), `@pulumi/github` (new), `@pulumi/digitalocean` (new).
- Vitest for unit tests on the pure helpers (guard + table splitter). **pnpm only.**

## Conventions / Hard Gates (read before starting)

- **No commits, push, or irreversible actions by an implementing subagent** — the human/main
  agent commits.
- **Do NOT run `pulumi up` / `pulumi preview`** as part of executing code steps. `pulumi preview`
  is the human's manual gate (see Task A12).
- **Data migration uses `pg_dump`/`pg_restore` ONLY.** `strapi transfer`, `strapi import`,
  `pnpm restore`, and any `transfer:*` / `deploy:cloud*` script are BANNED (2026-03-19 incident:
  a `strapi transfer` destroyed 201 Cloudinary images). Cloudinary is never touched.
- **TDD:** every step that adds TypeScript logic writes a failing Vitest test first, then the
  implementation. Commit the failing test, then commit the passing implementation.
- **pnpm only** — never npm/yarn.
- Resource names kebab-case, matching `index.ts` (`key.toLowerCase().replace(/_/g, "-")`).

---

# Half A — GitHub/Vercel IaC ownership (Phase 1)

## Task A1 — Add the `@pulumi/github` dependency

- [ ] Run inside `infra/`:

```bash
cd /Users/james/Sites/beckwithbarrow/infra
pnpm add @pulumi/github
```

Expected: `package.json` gains `"@pulumi/github": "^6"` under `dependencies`; `pnpm-lock.yaml`
updates. Verify:

```bash
cat package.json | grep '@pulumi/github'
```

Expected output (version may differ): `    "@pulumi/github": "^6",`

- [ ] **Commit:** `build(infra): add @pulumi/github provider dependency`

## Task A2 — Add Vitest + build/test scripts to `infra/package.json`

- [ ] Run inside `infra/`:

```bash
cd /Users/james/Sites/beckwithbarrow/infra
pnpm add -D vitest
```

- [ ] Edit `infra/package.json` so the `scripts` block is exactly:

```json
  "scripts": {
    "build": "tsc --noEmit",
    "test": "vitest run"
  },
```

(The package currently has no `scripts` key — add it after `"main"`.)

- [ ] Create `infra/vitest.config.ts` with exactly:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] Verify scripts resolve:

```bash
pnpm run build
```

Expected: completes with no type errors (current `index.ts`/`webhooks.ts` already compile).
`vitest` is installed but no test files exist yet — that is fine.

- [ ] **Commit:** `build(infra): add vitest + build/test scripts`

## Task A3 — Widen `tsconfig.json` to include new source files (exclude tests from Pulumi build)

The current `include` is `["index.ts"]` only; new modules must be compiled, and the Vitest test
file must NOT be part of the Pulumi program build.

- [ ] Replace `infra/tsconfig.json` entirely with:

```json
{
  "compilerOptions": {
    "strict": true,
    "outDir": "bin",
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "sourceMap": true,
    "experimentalDecorators": true,
    "pretty": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["index.ts", "webhooks.ts", "config.ts", "github.ts", "digitalocean.ts"],
  "exclude": ["node_modules", "bin", "**/*.test.ts"]
}
```

- [ ] Verify (no new files yet, so this just confirms the config parses and existing files still build):

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm run build
```

Expected: no errors. (`config.ts` / `github.ts` / `digitalocean.ts` are listed but missing —
TypeScript ignores missing files in `include` globs only if they are glob patterns; since these
are explicit names, create them before the next build. They are created in A4/A7/B2, so do not
rebuild until A5.) If `pnpm run build` errors on the missing explicit filenames, that is
expected and resolved once A4 lands — proceed.

- [ ] **Commit:** `build(infra): widen tsconfig include for new modules, exclude tests`

## Task A4 — TDD: failing test for `requireBootstrapEnv()`

Write the test FIRST.

- [ ] Create `infra/config.test.ts` with exactly:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { requireBootstrapEnv } from "./config";

const HELP = "Some help text explaining the credential.";

describe("requireBootstrapEnv", () => {
  afterEach(() => {
    delete process.env.TEST_BOOTSTRAP_VAR;
  });

  it("returns the value when the env var is set", () => {
    process.env.TEST_BOOTSTRAP_VAR = "abc123";
    expect(requireBootstrapEnv("TEST_BOOTSTRAP_VAR", HELP)).toBe("abc123");
  });

  it("throws when the env var is unset", () => {
    delete process.env.TEST_BOOTSTRAP_VAR;
    expect(() => requireBootstrapEnv("TEST_BOOTSTRAP_VAR", HELP)).toThrow();
  });

  it("throws an instructional, multi-line message naming the var and the fix", () => {
    delete process.env.TEST_BOOTSTRAP_VAR;
    try {
      requireBootstrapEnv("TEST_BOOTSTRAP_VAR", HELP);
      throw new Error("expected requireBootstrapEnv to throw");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("✗ TEST_BOOTSTRAP_VAR not set.");
      expect(msg).toContain(HELP);
      expect(msg).toContain("Fix once:");
      expect(msg).toContain("export TEST_BOOTSTRAP_VAR=");
      expect(msg).toContain("pulumi up");
      expect(msg.split("\n").length).toBeGreaterThan(2);
    }
  });

  it("treats an empty-string env var as unset", () => {
    process.env.TEST_BOOTSTRAP_VAR = "";
    expect(() => requireBootstrapEnv("TEST_BOOTSTRAP_VAR", HELP)).toThrow();
  });
});
```

- [ ] Run the test — it MUST fail (module `./config` does not exist yet):

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm test
```

Expected: failure resolving `./config` / `requireBootstrapEnv is not a function`.

- [ ] **Commit:** `test(infra): failing test for requireBootstrapEnv bootstrap guard`

## Task A5 — Implement `requireBootstrapEnv()` + `ManagedValue` in `infra/config.ts`

- [ ] Create `infra/config.ts` with exactly (the `MANAGED` table and `splitManaged` are added in
      A6/A8 — start with the interface and the guard):

```ts
/**
 * config.ts
 *
 * Single source of truth for the IaC fan-out (Tier 1 "managed values") and the
 * Tier 0 bootstrap-credential guard.
 *
 * Two-tier secret model:
 *   - Tier 0 (bootstrap roots): credentials Pulumi needs to authenticate BEFORE the
 *     program runs. Validated from env via requireBootstrapEnv(); NEVER managed by Pulumi
 *     (you cannot manage the token that authenticates you).
 *   - Tier 1 (managed values): canonical value lives in Pulumi config and is projected
 *     out to its consumers (GitHub secret/variable, Vercel env var) via the MANAGED table.
 */

/**
 * Validate a Tier-0 bootstrap credential read from the environment.
 * Returns the value when set; throws a clear, instructional, multi-line error when unset.
 */
export function requireBootstrapEnv(name: string, helpText: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      [
        `✗ ${name} not set.`,
        ...helpText.split("\n").map((line) => `  ${line}`),
        `  Fix once:  export ${name}=<value>   then re-run \`pulumi up\`.`,
      ].join("\n"),
    );
  }
  return value;
}

/** One projected, canonical configuration value. */
export interface ManagedValue {
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

- [ ] Run the test — the two existing "set value" / "throws when unset" cases plus the
      instructional-message case must now pass:

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm test
```

Expected: all `requireBootstrapEnv` tests green.

> Note on message format: the spec shows the `GITHUB_TOKEN` call site rendering
> `Fix once:  export GITHUB_TOKEN=ghp_xxx`. The generic helper renders
> `export GITHUB_TOKEN=<value>`; the `ghp_xxx` hint, if desired, belongs in the per-call
> `helpText`. The test asserts the `export <NAME>=` prefix, which both forms satisfy.

- [ ] **Commit:** `feat(infra): add requireBootstrapEnv guard + ManagedValue interface`

## Task A6 — TDD: failing test for `splitManaged()`

- [ ] Append to `infra/config.test.ts` (add the import at top and the new describe block):

Update the import line at the top of the file to:

```ts
import { requireBootstrapEnv, splitManaged, ManagedValue } from "./config";
```

Then append this describe block to the end of the file:

```ts
describe("splitManaged", () => {
  const sample: ManagedValue[] = [
    { config: "pulumiAccessToken", secret: true, github: { name: "PULUMI_ACCESS_TOKEN", kind: "secret" } },
    { config: "viteProdApiUrl", secret: false, github: { name: "VITE_PROD_API_URL", kind: "variable" }, vercel: { key: "VITE_PROD_API_URL" } },
    { config: "resendApiKey", secret: true, vercel: { key: "RESEND_API_KEY" } },
    { config: "contactEmail", secret: false, vercel: { key: "CONTACT_EMAIL" } },
  ];

  it("routes github secrets, github variables, and vercel vars into the right buckets", () => {
    const { githubSecrets, githubVariables, vercelVars } = splitManaged(sample);
    expect(githubSecrets.map((m) => m.config)).toEqual(["pulumiAccessToken"]);
    expect(githubVariables.map((m) => m.config)).toEqual(["viteProdApiUrl"]);
    expect(vercelVars.map((m) => m.config)).toEqual(["viteProdApiUrl", "resendApiKey", "contactEmail"]);
  });

  it("includes a row in multiple buckets when it has multiple projections", () => {
    const { githubVariables, vercelVars } = splitManaged(sample);
    expect(githubVariables.some((m) => m.config === "viteProdApiUrl")).toBe(true);
    expect(vercelVars.some((m) => m.config === "viteProdApiUrl")).toBe(true);
  });

  it("omits rows with no projection of a given kind", () => {
    const { githubSecrets, githubVariables } = splitManaged(sample);
    expect(githubSecrets.some((m) => m.config === "contactEmail")).toBe(false);
    expect(githubVariables.some((m) => m.config === "resendApiKey")).toBe(false);
  });
});
```

- [ ] Run the test — `splitManaged` cases MUST fail (not exported yet):

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm test
```

Expected: failure on `splitManaged is not a function`; `requireBootstrapEnv` tests still green.

- [ ] **Commit:** `test(infra): failing test for splitManaged table splitter`

## Task A7 — Implement `splitManaged()` in `infra/config.ts`

- [ ] Append to `infra/config.ts` (after the `ManagedValue` interface):

```ts
/** Split MANAGED into its three consumer buckets. Pure helper; unit-tested. */
export function splitManaged(managed: ManagedValue[]): {
  githubSecrets: ManagedValue[];
  githubVariables: ManagedValue[];
  vercelVars: ManagedValue[];
} {
  return {
    githubSecrets: managed.filter((m) => m.github?.kind === "secret"),
    githubVariables: managed.filter((m) => m.github?.kind === "variable"),
    vercelVars: managed.filter((m) => m.vercel !== undefined),
  };
}
```

- [ ] Run the test — all `splitManaged` + `requireBootstrapEnv` tests green:

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm test
```

Expected: all tests pass.

- [ ] **Commit:** `feat(infra): add splitManaged table splitter`

## Task A8 — Add the `MANAGED` table to `infra/config.ts`

Encodes every consumer derived from `deploy.yml` + `index.ts`.

- [ ] Append to `infra/config.ts` (at the end of the file):

```ts
/**
 * The one source of truth for every projected configuration value.
 *
 * Each canonical Pulumi config key fans out to zero-or-more consumers:
 *   - github: a GitHub Actions secret or variable consumed by .github/workflows/deploy.yml
 *   - vercel: a Vercel production env var consumed by the frontend build / runtime
 *
 * Adding a new managed value = adding one row here. No loop edits required.
 *
 * HONEST EXCEPTION — pulumiAccessToken is dual-homed:
 *   It must ALSO be exported as the PULUMI_ACCESS_TOKEN env var, because the Pulumi engine
 *   needs it BEFORE this program runs to unlock the Pulumi Cloud backend. It additionally
 *   lives in Pulumi config (this row) so the program can project it to the
 *   PULUMI_ACCESS_TOKEN GitHub secret that deploy.yml consumes. This is the one irreducible
 *   non-single-source value; documented here rather than hidden.
 */
export const MANAGED: ManagedValue[] = [
  // --- GitHub Actions secrets (consumed by the pulumi/actions step in deploy.yml) ---
  {
    config: "pulumiAccessToken",
    secret: true,
    github: { name: "PULUMI_ACCESS_TOKEN", kind: "secret" },
  },
  {
    config: "vercelApiToken",
    secret: true,
    github: { name: "VERCEL_API_TOKEN", kind: "secret" },
  },

  // --- Fan-out to BOTH a GitHub variable AND a Vercel env var (the whole point) ---
  {
    config: "viteProdApiUrl",
    secret: false,
    github: { name: "VITE_PROD_API_URL", kind: "variable" },
    vercel: { key: "VITE_PROD_API_URL" },
  },
  {
    config: "viteRecaptchaSiteKey",
    secret: false,
    github: { name: "VITE_RECAPTCHA_SITE_KEY", kind: "variable" },
    vercel: { key: "VITE_RECAPTCHA_SITE_KEY" },
  },

  // --- Vercel-only env vars (from the current index.ts envVars list) ---
  {
    config: "resendApiKey",
    secret: true,
    vercel: { key: "RESEND_API_KEY" },
  },
  {
    config: "recaptchaSecretKey",
    secret: true,
    vercel: { key: "RECAPTCHA_SECRET_KEY" },
  },
  {
    config: "contactEmail",
    secret: false,
    vercel: { key: "CONTACT_EMAIL" },
  },
  {
    config: "viteUseProdApi",
    secret: false,
    vercel: { key: "VITE_USE_PROD_API" },
  },
];
```

- [ ] Type-check (the test file is excluded from the Pulumi build; this compiles `config.ts`):

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm run build
```

Expected: no type errors. (`github.ts` not yet created — if `tsconfig` include lists it as an
explicit missing file and errors, proceed to A9 which creates it, then rebuild at A11.)

- [ ] **Commit:** `feat(infra): add MANAGED fan-out table (single source of truth)`

## Task A9 — Create `infra/github.ts`: provider + ActionsSecret/ActionsVariable loop

- [ ] Create `infra/github.ts` with exactly:

```ts
/**
 * github.ts
 *
 * Projects the GitHub portion of the MANAGED table into GitHub Actions secrets and
 * variables on jamesvillarrubia/beckwithbarrow, consumed by .github/workflows/deploy.yml.
 *
 * Provider auth is a Tier-0 bootstrap credential: GITHUB_TOKEN (a PAT, scope `repo`).
 * It is validated via requireBootstrapEnv() and is NEVER managed by Pulumi.
 */

import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import { MANAGED, splitManaged, requireBootstrapEnv } from "./config";

const config = new pulumi.Config();

const githubToken = requireBootstrapEnv(
  "GITHUB_TOKEN",
  [
    "The @pulumi/github provider needs a GitHub PAT (scope: repo) to manage",
    "repo secrets and variables. This is a BOOTSTRAP credential — Pulumi cannot",
    "manage the token it authenticates with.",
  ].join("\n"),
);

const provider = new github.Provider("github", {
  owner: "jamesvillarrubia",
  token: githubToken,
});

const REPOSITORY = "beckwithbarrow";

const { githubSecrets, githubVariables } = splitManaged(MANAGED);

// GitHub Actions secrets (encrypted; write-only on GitHub's side).
for (const m of githubSecrets) {
  const value = m.secret ? config.requireSecret(m.config) : config.require(m.config);
  const resourceName = m.github!.name.toLowerCase().replace(/_/g, "-") + "-gh-secret";
  new github.ActionsSecret(
    resourceName,
    {
      repository: REPOSITORY,
      secretName: m.github!.name,
      plaintextValue: value,
    },
    { provider },
  );
}

// GitHub Actions variables (plain text).
for (const m of githubVariables) {
  const value = m.secret ? config.requireSecret(m.config) : config.require(m.config);
  const resourceName = m.github!.name.toLowerCase().replace(/_/g, "-") + "-gh-variable";
  new github.ActionsVariable(
    resourceName,
    {
      repository: REPOSITORY,
      variableName: m.github!.name,
      value: value as pulumi.Input<string>,
    },
    { provider },
  );
}
```

- [ ] **Commit:** `feat(infra): project GitHub secrets/variables from MANAGED table`

## Task A10 — Refactor `infra/index.ts` to drive Vercel off `MANAGED` + import GitHub projections

- [ ] Replace the env-vars section of `infra/index.ts`. Specifically:
  - Add imports at the top (after the existing imports):

```ts
import { MANAGED, splitManaged } from "./config";
import "./github";
```

  - Delete the `interface EnvVarDef { ... }` block and the entire `const envVars: EnvVarDef[] = [ ... ];`
    array and its `envVars.forEach(...)` loop (current lines ~50–100).
  - Replace them with exactly:

```ts
// ---------------------------------------------------------------------------
// Environment Variables — Vercel (production), driven off the MANAGED table
// ---------------------------------------------------------------------------
// Canonical values live in Pulumi config. The MANAGED table (infra/config.ts) is the
// single source of truth; each row's `vercel` projection becomes a ProjectEnvironmentVariable.
// The same table also projects GitHub secrets/variables (see ./github import above).
const { vercelVars } = splitManaged(MANAGED);

vercelVars.forEach((m) => {
  const value = m.secret ? config.requireSecret(m.config) : config.require(m.config);
  const resourceName = m.vercel!.key.toLowerCase().replace(/_/g, "-");
  new vercel.ProjectEnvironmentVariable(resourceName, {
    projectId: project.id,
    key: m.vercel!.key,
    value,
    targets: ["production"],
    sensitive: m.secret,
  });
});
```

- [ ] Update the `vercelApiToken` read for the deploy hook to come from the bootstrap guard for
      consistency (it is a Tier-0 credential the dynamic resource needs). Replace:

```ts
const vercelApiToken = process.env.VERCEL_API_TOKEN ?? "";
```

  with:

```ts
import { requireBootstrapEnv } from "./config";
// ... (add this import alongside the other config import at the top)

const vercelApiToken = requireBootstrapEnv(
  "VERCEL_API_TOKEN",
  [
    "The @pulumiverse/vercel provider and the deploy-hook dynamic resource need a",
    "Vercel API token. This is a BOOTSTRAP credential — Pulumi cannot manage the",
    "token it authenticates with.",
  ].join("\n"),
);
```

  (Consolidate so there is a single `import { MANAGED, splitManaged, requireBootstrapEnv } from "./config";`
  line rather than two separate imports.)

- [ ] Keep the long "STRAPI CLOUD — Manual configuration required" comment block at the bottom of
      `index.ts` for now; Half B (Task B*) supersedes it. Leave a one-line pointer:

```ts
// NOTE: Strapi Cloud config below is superseded by the DigitalOcean migration —
// see infra/digitalocean.ts and docs/plans/2026-06-19-iac-full-ownership.md (Half B).
```

- [ ] **Commit:** `refactor(infra): drive Vercel env vars off MANAGED table; wire GitHub projections`

## Task A11 — Type-check the full program

- [ ] Run:

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm run build
```

Expected: clean compile of `index.ts`, `webhooks.ts`, `config.ts`, `github.ts` (and
`digitalocean.ts` once Half B lands). No errors. If `digitalocean.ts` is in the `include` list
but not yet created and TypeScript errors, temporarily remove `"digitalocean.ts"` from the
`include` array until Task B2, then restore it.

- [ ] **Commit (only if tsconfig was touched):** `build(infra): keep tsconfig include in sync with present modules`

## Task A12 — Document config-set + bootstrap exports (DO NOT run pulumi)

This task only writes documentation; it executes nothing against Pulumi.

- [ ] Append a "Bootstrap & config" section to `infra/README.md` (create the file if absent) with
      exactly:

```markdown
# infra — bootstrap & config

## Tier 0 — bootstrap credentials (export before `pulumi up`; never managed)

```bash
export PULUMI_ACCESS_TOKEN=pul-xxx     # Pulumi engine needs this to unlock the Cloud backend
export GITHUB_TOKEN=ghp_xxx            # GitHub PAT, scope: repo
export VERCEL_API_TOKEN=xxx            # Vercel API token
export DIGITALOCEAN_TOKEN=dop_v1_xxx   # DigitalOcean PAT (Half B)
```

If any is missing, `pulumi up` aborts with an instructional error naming the variable.

## Tier 1 — canonical config (set once; fans out via the MANAGED table)

```bash
cd infra
# Secrets (encrypted in Pulumi.prod.yaml)
pulumi config set --secret pulumiAccessToken    pul-xxx   # dual-homed: also the env var above
pulumi config set --secret vercelApiToken       xxx
pulumi config set --secret resendApiKey         re_xxx
pulumi config set --secret recaptchaSecretKey   6LeG6u...

# Plain values
pulumi config set viteProdApiUrl        https://striking-ball-b079f8c4b0.strapiapp.com/api
pulumi config set viteRecaptchaSiteKey  6LeG6uAr...
pulumi config set contactEmail          hello@beckwithbarrow.com
pulumi config set viteUseProdApi        true
```

After editing any canonical value, run `pulumi up` to fan it out to every consumer.
```

- [ ] **Commit:** `docs(infra): document Tier-0 bootstrap exports + Tier-1 config-set commands`

## Task A13 — Verification gate (agent runs build + tests; human runs pulumi preview)

- [ ] Run:

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm run build && pnpm test
```

Expected: build clean; all Vitest tests green.

- [ ] **Human manual gate (NOT run by the agent):** with Tier-0 vars exported,
      `cd infra && pulumi preview` should show new `github:ActionsSecret`/`github:ActionsVariable`
      resources and unchanged Vercel resources (now sourced from the table). The agent must NOT
      run `pulumi preview` or `pulumi up`.

---

# Half B — DigitalOcean Strapi migration

> This half is a migration runbook with bite-sized IaC steps. Cloudinary is the external asset
> provider and is NEVER touched. Data moves via `pg_dump`/`pg_restore` ONLY — `strapi transfer`,
> `strapi import`, `pnpm restore`, and `deploy:cloud*`/`transfer:*` scripts are BANNED.

## Task B1 — Add the `@pulumi/digitalocean` dependency

- [ ] Run inside `infra/`:

```bash
cd /Users/james/Sites/beckwithbarrow/infra
pnpm add @pulumi/digitalocean
```

Expected: `package.json` gains `"@pulumi/digitalocean": "^4"`. Verify:

```bash
cat package.json | grep '@pulumi/digitalocean'
```

- [ ] **Commit:** `build(infra): add @pulumi/digitalocean provider dependency`

## Task B2 — Define DO Managed Postgres (prod + staging) in `infra/digitalocean.ts`

- [ ] Add the DigitalOcean bootstrap exports to the MANAGED config keys used below: `cloudinaryName`,
      `cloudinaryKey`, `cloudinarySecret`, `strapiAppKeys`, `strapiApiTokenSalt`,
      `strapiAdminJwtSecret`, `strapiJwtSecret`, `strapiEncryptionKey` are read from Pulumi config
      (already documented as existing secrets in the prior IaC spec). They are NOT added to the
      `MANAGED` fan-out table because they project to DO App Platform only (handled directly in
      `digitalocean.ts`), not to GitHub/Vercel.

- [ ] Create `infra/digitalocean.ts` with exactly the Postgres section first:

```ts
/**
 * digitalocean.ts
 *
 * DigitalOcean infrastructure for the Strapi backend:
 *   - Managed Postgres cluster (prod + staging databases) — daily backups + PITR bundled free
 *   - App Platform apps for Strapi (prod + staging), deployed from jamesvillarrubia/beckwithbarrow:api
 *
 * Provider auth is a Tier-0 bootstrap credential: DIGITALOCEAN_TOKEN. Validated via
 * requireBootstrapEnv(), never managed.
 *
 * Cloudinary remains the external asset provider — assets are NOT stored here and are never
 * touched by this program or by the data migration.
 */

import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import { requireBootstrapEnv } from "./config";

const config = new pulumi.Config();

const doToken = requireBootstrapEnv(
  "DIGITALOCEAN_TOKEN",
  [
    "The @pulumi/digitalocean provider needs a DigitalOcean PAT to manage the",
    "Managed Postgres cluster and App Platform apps. This is a BOOTSTRAP credential —",
    "Pulumi cannot manage the token it authenticates with.",
  ].join("\n"),
);

const provider = new digitalocean.Provider("digitalocean", { token: doToken });

const REGION = "nyc1";

// ---------------------------------------------------------------------------
// Managed Postgres cluster (smallest tier; daily backups + PITR bundled free)
// ---------------------------------------------------------------------------
const pgCluster = new digitalocean.DatabaseCluster(
  "strapi-postgres",
  {
    engine: "pg",
    version: "16",
    size: "db-s-1vcpu-1gb", // ~$15/mo smallest tier
    region: REGION,
    nodeCount: 1,
  },
  { provider },
);

// Separate logical databases for prod and staging on the one cluster (cost-efficient).
const prodDb = new digitalocean.DatabaseDb(
  "strapi-db-prod",
  { clusterId: pgCluster.id, name: "strapi_prod" },
  { provider },
);

const stagingDb = new digitalocean.DatabaseDb(
  "strapi-db-staging",
  { clusterId: pgCluster.id, name: "strapi_staging" },
  { provider },
);

// Connection strings (secret outputs) for each database, built from cluster attributes.
function connectionString(dbName: pulumi.Input<string>): pulumi.Output<string> {
  return pulumi
    .all([pgCluster.user, pgCluster.password, pgCluster.host, pgCluster.port, dbName])
    .apply(
      ([user, password, host, port, name]) =>
        `postgresql://${user}:${password}@${host}:${port}/${name}?sslmode=require`,
    );
}

const prodDbUrl = connectionString(prodDb.name);
const stagingDbUrl = connectionString(stagingDb.name);

export const postgresHost = pgCluster.host;
export const postgresProdDbUrl = pulumi.secret(prodDbUrl);
export const postgresStagingDbUrl = pulumi.secret(stagingDbUrl);
```

- [ ] Add `"digitalocean.ts"` to `tsconfig.json` `include` if it was removed in A11. Type-check:

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm run build
```

Expected: clean compile.

- [ ] **Commit:** `feat(infra): define DO Managed Postgres (prod + staging databases)`

## Task B3 — Define the prod Strapi App Platform app

- [ ] Append to `infra/digitalocean.ts` a reusable spec builder plus the prod app:

```ts
// ---------------------------------------------------------------------------
// App Platform — Strapi (deploys from jamesvillarrubia/beckwithbarrow, source dir `api`)
// ---------------------------------------------------------------------------
// Strapi env vars are wired from Pulumi config (secrets stay encrypted) and the Managed
// Postgres connection string. Cloudinary credentials are passed through as env vars only —
// assets live in Cloudinary and are never migrated.

interface StrapiAppArgs {
  /** Pulumi resource name. */
  resourceName: string;
  /** DO App Platform app name. */
  appName: string;
  /** Git branch this environment deploys from. */
  branch: string;
  /** Whether pushes to `branch` auto-deploy. */
  deployOnPush: boolean;
  /** DATABASE_URL for this environment. */
  databaseUrl: pulumi.Output<string>;
}

function strapiApp(args: StrapiAppArgs): digitalocean.App {
  return new digitalocean.App(
    args.resourceName,
    {
      spec: {
        name: args.appName,
        region: REGION,
        services: [
          {
            name: "strapi",
            instanceSizeSlug: "basic-xxs", // ~$5/mo
            instanceCount: 1,
            httpPort: 1337,
            github: {
              repo: "jamesvillarrubia/beckwithbarrow",
              branch: args.branch,
              deployOnPush: args.deployOnPush,
            },
            sourceDir: "api",
            buildCommand: "pnpm install --no-frozen-lockfile && pnpm run build",
            runCommand: "pnpm run start",
            envs: [
              { key: "NODE_ENV", value: "production", scope: "RUN_AND_BUILD_TIME" },
              { key: "DATABASE_CLIENT", value: "postgres", scope: "RUN_AND_BUILD_TIME" },
              {
                key: "DATABASE_URL",
                value: args.databaseUrl,
                type: "SECRET",
                scope: "RUN_AND_BUILD_TIME",
              },
              { key: "DATABASE_SSL", value: "true", scope: "RUN_AND_BUILD_TIME" },
              {
                key: "DATABASE_SSL_REJECT_UNAUTHORIZED",
                value: "false",
                scope: "RUN_AND_BUILD_TIME",
              },
              {
                key: "APP_KEYS",
                value: config.requireSecret("strapiAppKeys"),
                type: "SECRET",
                scope: "RUN_AND_BUILD_TIME",
              },
              {
                key: "API_TOKEN_SALT",
                value: config.requireSecret("strapiApiTokenSalt"),
                type: "SECRET",
                scope: "RUN_AND_BUILD_TIME",
              },
              {
                key: "ADMIN_JWT_SECRET",
                value: config.requireSecret("strapiAdminJwtSecret"),
                type: "SECRET",
                scope: "RUN_AND_BUILD_TIME",
              },
              {
                key: "JWT_SECRET",
                value: config.requireSecret("strapiJwtSecret"),
                type: "SECRET",
                scope: "RUN_AND_BUILD_TIME",
              },
              {
                key: "ENCRYPTION_KEY",
                value: config.requireSecret("strapiEncryptionKey"),
                type: "SECRET",
                scope: "RUN_AND_BUILD_TIME",
              },
              {
                key: "CLOUDINARY_NAME",
                value: config.require("cloudinaryName"),
                scope: "RUN_AND_BUILD_TIME",
              },
              {
                key: "CLOUDINARY_KEY",
                value: config.require("cloudinaryKey"),
                scope: "RUN_AND_BUILD_TIME",
              },
              {
                key: "CLOUDINARY_SECRET",
                value: config.requireSecret("cloudinarySecret"),
                type: "SECRET",
                scope: "RUN_AND_BUILD_TIME",
              },
            ],
          },
        ],
      },
    },
    { provider },
  );
}

const prodApp = strapiApp({
  resourceName: "strapi-app-prod",
  appName: "beckwithbarrow-strapi-prod",
  branch: "main",
  deployOnPush: true,
  databaseUrl: prodDbUrl,
});

export const strapiProdUrl = prodApp.liveUrl;
```

- [ ] Type-check:

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm run build
```

Expected: clean compile.

- [ ] **Commit:** `feat(infra): define prod Strapi App Platform app on DigitalOcean`

## Task B4 — Define the staging Strapi environment

- [ ] Append to `infra/digitalocean.ts`:

```ts
// ---------------------------------------------------------------------------
// Staging environment — the multi-environment capability that motivated leaving Strapi Cloud.
// Same image, the staging logical database, deploys from `develop`, no auto-deploy on push
// (manual promote to avoid surprise staging rebuilds).
// ---------------------------------------------------------------------------
const stagingApp = strapiApp({
  resourceName: "strapi-app-staging",
  appName: "beckwithbarrow-strapi-staging",
  branch: "develop",
  deployOnPush: false,
  databaseUrl: stagingDbUrl,
});

export const strapiStagingUrl = stagingApp.liveUrl;
```

- [ ] Type-check:

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm run build
```

Expected: clean compile.

- [ ] Import the DO module into the program so its resources register. Add to `infra/index.ts`
      (after the `import "./github";` line):

```ts
import "./digitalocean";
```

- [ ] Type-check the full program again:

```bash
cd /Users/james/Sites/beckwithbarrow/infra && pnpm run build
```

Expected: clean compile.

- [ ] **Commit:** `feat(infra): define staging Strapi environment on DigitalOcean`

## Task B5 — Data migration runbook (pg_dump → pg_restore ONLY)

> ⚠️ SAFETY (2026-03-19 incident): a `strapi transfer` run with prod credentials destroyed 201
> Cloudinary images because the transfer drove the upload provider. For this migration we move
> the Postgres database ONLY. `strapi transfer`, `strapi import`, `pnpm restore`, and any
> `transfer:*` / `deploy:cloud*` package script are BANNED. Cloudinary is never touched — the
> image rows in Postgres still point at the same Cloudinary URLs after restore.

This section is a documented runbook to be executed by the human operator (the planning/impl
subagent does NOT run these). It is reproduced here as the authoritative procedure.

- [ ] **1. Provision the DO cluster first** (human runs `pulumi up` after Half A + B IaC merges).
      Capture the prod DB connection string:

```bash
cd infra
pulumi stack output postgresProdDbUrl --show-secrets
```

- [ ] **2. Dump the Strapi Cloud Postgres database** (schema + data, no owners/privileges):

```bash
pg_dump \
  --no-owner --no-privileges \
  --format=custom \
  --dbname="$STRAPI_CLOUD_DATABASE_URL" \
  --file=strapi-cloud.dump
```

(`$STRAPI_CLOUD_DATABASE_URL` is the Strapi Cloud Postgres connection string. If Strapi Cloud
does not expose an external Postgres URL, use Strapi Cloud's database export to obtain a Postgres
dump — still Postgres-only, still never `strapi transfer`.)

- [ ] **3. Restore into the DO prod database:**

```bash
pg_restore \
  --no-owner --no-privileges \
  --clean --if-exists \
  --dbname="<postgresProdDbUrl from step 1>" \
  strapi-cloud.dump
```

- [ ] **4. Sanity-check row counts** match between source and target for key tables
      (`files`, `files_related_morphs`, `up_users`, and the project/press content tables):

```bash
psql "<postgresProdDbUrl>" -c "SELECT count(*) FROM files;"
```

Cloudinary URLs in `files` are unchanged — assets resolve immediately, nothing re-uploaded.

- [ ] **5. (Optional) Seed staging** by restoring the same dump into `postgresStagingDbUrl`.

- [ ] **Commit (docs only — this task adds no code):** the runbook lives in this plan; no repo
      change unless you also copy it into `docs/deploy-runbook.md`, in which case:
      `docs: add DO Postgres migration runbook (pg_dump/pg_restore only)`

## Task B6 — Cutover: point the site at DO Strapi via the MANAGED table

- [ ] **Register the Strapi webhook → Vercel deploy hook** on the NEW DO Strapi instance. The
      Vercel deploy hook already exists as an IaC resource (`VercelDeployHook`, output
      `deployHookUrl`). In the DO Strapi admin (`https://<strapiProdUrl>/admin` → Settings →
      Webhooks → Add webhook):
  - Name: `vercel-rebuild`
  - URL: value of `pulumi stack output deployHookUrl`
  - Events: Entry (publish, unpublish), Media (create, delete)

  (This mirrors the existing manual webhook step documented in `infra/index.ts`/`webhooks.ts`.)

- [ ] **Repoint the canonical API URL — ONE change, fans out everywhere:**

```bash
cd infra
pulumi config set viteProdApiUrl https://<strapiProdUrl>/api
```

  Then the human runs `pulumi up`. Because `viteProdApiUrl` is a single `MANAGED` row projecting
  to BOTH the `VITE_PROD_API_URL` GitHub variable AND the Vercel env var, this one edit updates
  the CI build input and the Vercel runtime env together. No second edit.

- [ ] **Verify** the live site loads content from the DO Strapi URL (DevTools network tab shows
      requests to `https://<strapiProdUrl>/api`, 200s, images still served from Cloudinary).

- [ ] **Decommission Strapi Cloud** only after verification: remove the old Strapi Cloud webhook,
      then cancel the Strapi Cloud subscription. Keep `strapi-cloud.dump` archived until you are
      confident.

- [ ] **Commit (config change is in Pulumi.prod.yaml, committed by the human):**
      `chore(infra): repoint viteProdApiUrl to DigitalOcean Strapi`

## Task B7 — Cost note (reference)

- [ ] Confirm the running cost after cutover:

| Item | Plan | Cost |
|---|---|---|
| DO App Platform (Strapi prod, `basic-xxs`) | Basic | ~$5/mo |
| DO Managed Postgres (`db-s-1vcpu-1gb`, daily backups + PITR free) | Smallest | ~$15/mo |
| DO App Platform (Strapi staging) | Basic | ~$5/mo (optional; stop when unused) |
| **Total (prod only)** | | **~$20/mo** |
| (Replaced: Strapi Cloud) | | ~$18/mo |

Roughly flat (~$20 vs $18) and gains full IaC ownership, free PITR backups, and a staging
environment. Staging is optional and can be torn down when idle to stay at ~$20/mo.

---

## Done criteria

- [ ] `cd infra && pnpm run build` clean; `pnpm test` green (guard + splitManaged tests).
- [ ] `MANAGED` table is the only place GitHub/Vercel projections are declared.
- [ ] Missing any Tier-0 env var produces the instructional error and aborts.
- [ ] (Half B) DO Postgres + App Platform prod & staging defined in `infra/digitalocean.ts`;
      data migrated via `pg_dump`/`pg_restore`; Cloudinary untouched; site repointed via one
      `viteProdApiUrl` change; Strapi Cloud decommissioned.
- [ ] No agent ever ran `pulumi up`/`pulumi preview`, `strapi transfer`, `strapi import`, or
      `pnpm restore`. `pulumi preview` and `pulumi up` are the human's manual gates.

## References

- Spec: `file:///Users/james/Sites/beckwithbarrow/reqts/iac-full-ownership.md`
- Prior IaC spec: `file:///Users/james/Sites/beckwithbarrow/reqts/pulumi-iac.md`
- `file:///Users/james/Sites/beckwithbarrow/infra/index.ts`
- `file:///Users/james/Sites/beckwithbarrow/infra/webhooks.ts`
- `file:///Users/james/Sites/beckwithbarrow/.github/workflows/deploy.yml`
- `file:///Users/james/Sites/beckwithbarrow/api/config/database.ts`
