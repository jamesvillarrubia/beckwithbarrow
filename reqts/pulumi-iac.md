# Feature: Infrastructure as Code with Pulumi

**Branch:** main
**Created:** 2026-03-19
**Status:** Approved — ready for implementation

---

## Problem

Infrastructure config is scattered across 4+ dashboards (Vercel, Strapi Cloud, Cloudinary, Resend) with no single source of truth. Deployments are manual and inconsistent. Secrets live in uncommitted `.env` files that can be lost or diverge between machines.

---

## Goals

- [ ] All Vercel configuration (project settings, env vars, domains) managed as code via Pulumi
- [ ] Push to `main` auto-deploys the frontend via GitHub Actions + Pulumi
- [ ] All secrets encrypted in Pulumi state — no secrets in `.env` files checked-in or floating on local machines
- [ ] Strapi Cloud env vars documented in code as a checklist, even though set manually in dashboard
- [ ] New machine setup: `pulumi up` syncs everything, no dashboard spelunking

## Non-Goals

- Migrating off managed services (stay on Vercel, Strapi Cloud, Cloudinary, Resend)
- Managing DNS / domain registrar
- Local dev environment automation (`pnpm dev` continues to work as-is)
- Automating Strapi Cloud env var management (no public API exists)

---

## Architecture

### Repository Structure

```
beckwithbarrow/
├── infra/                        # New Pulumi project
│   ├── Pulumi.yaml               # Project metadata
│   ├── Pulumi.prod.yaml          # Encrypted secrets + plain config for prod stack
│   ├── index.ts                  # All Pulumi resource definitions
│   └── package.json              # @pulumi/pulumi, @pulumi/vercel
├── .github/
│   └── workflows/
│       └── deploy.yml            # New: triggers on push to main
├── api/                          # Unchanged
└── frontend/                     # Unchanged
```

### What Pulumi Manages

**Vercel (`@pulumi/vercel`):**
- Project definition (git repo connection, build config, root directory)
- Domain assignment (`beckwithbarrow.com`)
- All environment variables (secrets encrypted, plain values in stack config)

**GitHub Actions:**
- Workflow YAML lives in repo (`.github/workflows/deploy.yml`)
- 2 GitHub Secrets required (set once, never change): `PULUMI_ACCESS_TOKEN`, `VERCEL_API_TOKEN`

**Strapi Cloud (documented, not automated):**
- Env vars listed in `infra/index.ts` as a comment checklist
- Set manually in Strapi Cloud dashboard
- Values stored encrypted in Pulumi stack as reference

### What Is Explicitly Out of Scope for Pulumi

| Service | Reason |
|---|---|
| Strapi Cloud | No public API for project/env management |
| Cloudinary | No Pulumi provider; credentials passed to Strapi as env vars |
| Resend | No Pulumi provider; API key passed to Vercel as env var |
| DNS/registrar | Stays at external registrar |

---

## Pulumi Resource Design

### `infra/index.ts`

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as vercel from "@pulumi/vercel";

const config = new pulumi.Config();
const stack = pulumi.getStack(); // "prod"

// --- Vercel Project ---
const project = new vercel.Project("beckwithbarrow", {
  name: "beckwithbarrow",
  framework: "vite",
  rootDirectory: "frontend",
  buildCommand: "pnpm install && pnpm run build",
  outputDirectory: "dist",
  installCommand: "pnpm install --no-frozen-lockfile",
  gitRepository: {
    repo: "jamesvillarrubia/beckwithbarrow",
    type: "github",
    productionBranch: "main",
  },
});

// --- Domain ---
new vercel.ProjectDomain("domain", {
  projectId: project.id,
  domain: "beckwithbarrow.com",
});

// --- Environment Variables ---
// Secrets: encrypted in Pulumi.prod.yaml via `pulumi config set --secret`
// Plain values: stored in Pulumi.prod.yaml as plain config

const envVars: Array<{ key: string; value: pulumi.Input<string>; secret: boolean }> = [
  // Secrets
  { key: "RESEND_API_KEY",          value: config.requireSecret("resendApiKey"),       secret: true },
  { key: "RECAPTCHA_SECRET_KEY",    value: config.requireSecret("recaptchaSecretKey"), secret: true },
  // Plain
  { key: "CONTACT_EMAIL",           value: config.require("contactEmail"),             secret: false },
  { key: "VITE_PROD_API_URL",       value: config.require("viteProdApiUrl"),           secret: false },
  { key: "VITE_USE_PROD_API",       value: config.require("viteUseProdApi"),           secret: false },
  { key: "VITE_RECAPTCHA_SITE_KEY", value: config.require("viteRecaptchaSiteKey"),     secret: false },
];

envVars.forEach(({ key, value, secret }) => {
  new vercel.ProjectEnvironmentVariable(key.toLowerCase().replace(/_/g, "-"), {
    projectId: project.id,
    key,
    value,
    targets: ["production"],
    sensitive: secret,
  });
});

// --- Outputs ---
export const projectId = project.id;
export const projectUrl = pulumi.interpolate`https://beckwithbarrow.com`;

/*
 * STRAPI CLOUD ENV VARS — set manually in https://cloud.strapi.io
 * Values are stored encrypted in this stack for reference.
 * Run: pulumi config get strapiAppKeys etc. to retrieve.
 *
 * Required in Strapi Cloud dashboard:
 * ┌────────────────────────┬─────────────────────────────────────┐
 * │ APP_KEYS               │ config.requireSecret("strapiAppKeys")│
 * │ API_TOKEN_SALT         │ config.requireSecret("strapiApiTokenSalt") │
 * │ ADMIN_JWT_SECRET       │ config.requireSecret("strapiAdminJwtSecret") │
 * │ JWT_SECRET             │ config.requireSecret("strapiJwtSecret") │
 * │ ENCRYPTION_KEY         │ config.requireSecret("strapiEncryptionKey") │
 * │ CLOUDINARY_NAME        │ config.require("cloudinaryName")     │
 * │ CLOUDINARY_KEY         │ config.require("cloudinaryKey")      │
 * │ CLOUDINARY_SECRET      │ config.requireSecret("cloudinarySecret") │
 * └────────────────────────┴─────────────────────────────────────┘
 */
```

---

## GitHub Actions Workflow

### `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
    paths:
      - "frontend/**"
      - "infra/**"

jobs:
  deploy:
    name: Pulumi Up
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"
          cache-dependency-path: infra/pnpm-lock.yaml

      - name: Install frontend dependencies
        run: pnpm install
        working-directory: frontend

      - name: Build frontend (validates before deploy)
        run: pnpm build
        working-directory: frontend
        env:
          VITE_USE_PROD_API: "true"

      - name: Install infra dependencies
        run: pnpm install
        working-directory: infra

      - uses: pulumi/actions@v5
        with:
          command: up
          stack-name: prod
          work-dir: infra
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          VERCEL_API_TOKEN: ${{ secrets.VERCEL_API_TOKEN }}
```

**GitHub Secrets required (set once):**
| Secret | How to get |
|---|---|
| `PULUMI_ACCESS_TOKEN` | https://app.pulumi.com/account/tokens |
| `VERCEL_API_TOKEN` | Vercel dashboard → Settings → Tokens |

---

## Migration Plan (One-Time Setup)

### Step 1: Bootstrap Pulumi project
```bash
mkdir infra && cd infra
pulumi new typescript --name beckwithbarrow-infra
pnpm add @pulumi/vercel
pulumi stack init prod
```

### Step 2: Load all secrets into Pulumi state
```bash
# Secrets (encrypted)
pulumi config set --secret resendApiKey re_xxx
pulumi config set --secret recaptchaSecretKey 6LeG6u...
pulumi config set --secret cloudinarySecret 0ITZlU...
pulumi config set --secret strapiAppKeys "VWS6q/..."
pulumi config set --secret strapiAdminJwtSecret 57goHY...
pulumi config set --secret strapiJwtSecret 9HknlD...
pulumi config set --secret strapiApiTokenSalt KgMOlP...
pulumi config set --secret strapiEncryptionKey hPz1+C...

# Plain values
pulumi config set contactEmail hello@beckwithbarrow.com
pulumi config set viteProdApiUrl https://striking-ball-b079f8c4b0.strapiapp.com/api
pulumi config set viteUseProdApi true
pulumi config set viteRecaptchaSiteKey 6LeG6uAr...
pulumi config set cloudinaryName dqeqavdd8
pulumi config set cloudinaryKey 865956219142244
```

### Step 3: Import existing Vercel project
```bash
# Import so Pulumi takes ownership without recreating
pulumi import vercel:index/project:Project beckwithbarrow prj_AYMvwFdokakjzzydvZVuygBKVmEU
pulumi up
```

### Step 4: Clean up local .env files
- Remove secrets from `frontend/.env.local` (keep `VITE_USE_PROD_API=false` for local dev override)
- Remove secrets from `api/.env` (Strapi Cloud manages prod; local dev keeps local `.env`)
- Add `frontend/.env.local` to `.gitignore` if not already there

### Step 5: Add GitHub Secrets, push, verify workflow fires

---

## Options Evaluation

### Option A: Accept Strapi Cloud gap (Selected)
**Pulumi manages:** Vercel fully. **Strapi Cloud:** auto-deploys via git push, env vars set manually, values stored in Pulumi state as reference.

✅ Simple — no fragile workarounds
✅ Strapi Cloud already auto-deploys from main push
✅ Env vars rarely change; manual set is a one-time cost
⚠️ Strapi dashboard is still needed if env vars ever change

### Option B: Strapi Cloud CLI workaround
Use Pulumi `Command` provider to shell out to `strapi deploy` CLI for env var management.

❌ Strapi Cloud CLI has no `env:set` command
❌ Fragile — breaks on Strapi Cloud CLI updates
❌ Authentication complexity

### Option C: Migrate Strapi to Railway/Fly.io/Render
Move off Strapi Cloud to a platform Pulumi can fully manage.

✅ Full IaC control
✅ Pulumi providers exist for Railway, Fly, Render
❌ Loses Strapi Cloud managed DB, backups, one-click admin
❌ Significant migration effort (DB migration, DNS changes)
❌ More ops overhead ongoing

**Decision: Option A now. Option C is the right upgrade path if Strapi Cloud becomes a bottleneck.**

---

## Decisions

- **State backend:** Pulumi Cloud free tier (app.pulumi.com)
- **Build validation:** GitHub Actions runs `pnpm build` before `pulumi up` — deploy blocked if build fails
- **DNS:** `beckwithbarrow.com` already points to Vercel — no DNS changes needed
