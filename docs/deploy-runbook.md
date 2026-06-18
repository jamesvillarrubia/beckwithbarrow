# Deployment Runbook — beckwithbarrow.com

**Branch:** feature/static-data-cdn-cache (merge to main to activate webhook pipeline)
**Last updated:** 2026-06-18
**Status:** Partially operational. See § Current State below.

---

## Architecture

Three services deploy independently; Pulumi wires them together.

```
main branch push
  │
  ├── Strapi Cloud ──────────────────────── auto-deploys api on push to main
  │                                         (no trigger needed from us)
  │
  ├── Vercel ────────────────────────────── auto-deploys frontend on push to main
  │                                         (git integration already configured)
  │
  └── deploy.yml ──── pulumi up ─────────── syncs Vercel config; wires webhook pipeline
                      (runs when frontend/** or infra/** changes land on main)


Content publish flow (once webhook pipeline is live):
  Ardis publishes in Strapi admin
    → Strapi fires webhook to Vercel deploy hook URL
    → Vercel triggers a fresh rebuild
    → Build script fetches current data from Strapi
    → Updated static build deployed to CDN in ~60s
```

### Service responsibilities

| Service | Manages | Trigger |
|---------|---------|---------|
| Strapi Cloud | api process, DB, migrations | push to main (git integration) |
| Vercel | frontend build + CDN | push to main (git integration) |
| `deploy.yml` + Pulumi | Vercel config, webhook pipeline | push to main touching `frontend/**` or `infra/**` |

### What Pulumi manages (via `infra/index.ts` + `infra/webhooks.ts`)

- Vercel project settings (framework: vite, root: `frontend/`, build command, output dir)
- Vercel domain binding → beckwithbarrow.com
- 6 Vercel production env vars: `RESEND_API_KEY`, `RECAPTCHA_SECRET_KEY`, `CONTACT_EMAIL`, `VITE_PROD_API_URL`, `VITE_USE_PROD_API`, `VITE_RECAPTCHA_SITE_KEY`
- Vercel deploy hook (the URL Strapi calls to trigger a rebuild)
- Strapi webhook registration (registers that deploy hook URL in the Strapi admin)

### What Pulumi does NOT manage

- Strapi Cloud deployment — auto from git, no API available
- Strapi Cloud env vars — no public API; set manually in Strapi Cloud dashboard
- DNS — already configured at registrar pointing to Vercel
- Vercel/Strapi git integrations — already configured in their respective dashboards

---

## Current State

### Working ✅
- Strapi Cloud auto-deploys on main push (has been working since project start)
- Vercel auto-deploys on main push (has been working since project start)
- `infra/Pulumi.prod.yaml` — all encrypted config values set locally (committed on this branch)
- `infra/webhooks.ts` + updated `infra/index.ts` with webhook pipeline — committed on `feature/static-data-cdn-cache`, not yet on main

### Broken / Not yet activated ❌
- `deploy.yml` CI workflow — last run: 2026-03-30, all 3 runs failed (missing secrets)
- GitHub secrets not set: `PULUMI_ACCESS_TOKEN`, `VERCEL_API_TOKEN`
- Strapi admin creds not set in Pulumi config: `strapiAdminEmail`, `strapiAdminPassword`
- `feature/static-data-cdn-cache` not merged to main — webhook pipeline dormant until then

---

## Steps to Make `deploy.yml` Green

Work through these in order. Steps marked **[YOU]** require your tokens/credentials.
Steps marked **[AGENT]** can be done by the AI agent.

### Step 1 — Commit Pulumi config [AGENT] ✅ done on this branch

`infra/Pulumi.prod.yaml` contains Pulumi-encrypted secrets (the `secure:` values are
safe to commit — they are KMS-encrypted by Pulumi, not plaintext). It is committed
on `feature/static-data-cdn-cache`. It will land on main when that branch merges.

### Step 2 — Set GitHub secrets [YOU]

These tokens are not in any env file; you need to retrieve them from the relevant dashboards.

```bash
# Pulumi access token — from https://app.pulumi.com/account/tokens
gh secret set PULUMI_ACCESS_TOKEN

# Vercel API token — from https://vercel.com/account/tokens
gh secret set VERCEL_API_TOKEN
```

Both are org-level tokens with no expiry — set once, lasts for the life of the project.

> **Why the workflow needs them:** `pulumi up` authenticates to Pulumi Cloud with
> `PULUMI_ACCESS_TOKEN` to read/write stack state. The `@pulumiverse/vercel` provider
> uses `VERCEL_API_TOKEN` to manage Vercel resources via API.

### Step 3 — Set Strapi admin creds in Pulumi config [YOU]

The webhook pipeline (`infra/webhooks.ts`) calls the Strapi admin API to register a
webhook. It needs admin credentials. Run these once from the `infra/` directory:

```bash
cd infra
pulumi config set --secret strapiAdminEmail    <your-strapi-admin-email>
pulumi config set --secret strapiAdminPassword <your-strapi-admin-password>
```

These get written to `infra/Pulumi.prod.yaml` as encrypted values and should be committed.

The email + password are the credentials you use to log into
https://striking-ball-b079f8c4b0.strapiapp.com/admin

### Step 4 — Verify Pulumi stack exists [YOU or AGENT]

The stack `prod` was initialized in March 2026. If Pulumi Cloud still has state for it,
`pulumi up` will just refresh + apply. To verify:

```bash
cd infra
PULUMI_ACCESS_TOKEN=<token> pulumi stack ls
# Should show: prod   ...   ...
```

If the stack is missing (e.g. it was deleted): `PULUMI_ACCESS_TOKEN=<token> pulumi stack init prod`

### Step 5 — Local preview before first CI run [YOU or AGENT]

A safe, read-only preview before CI touches anything:

```bash
cd infra
PULUMI_ACCESS_TOKEN=<token> VERCEL_API_TOKEN=<token> pulumi preview --stack prod
```

Expected output: diff showing Vercel project/domain/env vars to create or update,
plus the deploy hook + Strapi webhook to create. No deletions should appear.

If you see unexpected deletes (e.g. the Vercel project being replaced), investigate
before running `pulumi up` — it likely means the existing Vercel project isn't
imported into Pulumi state yet.

**To import the existing Vercel project (if needed):**
```bash
# Project ID from Vercel dashboard → project settings
pulumi import pulumiverse:index/project:Project beckwithbarrow prj_AYMvwFdokakjzzydvZVuygBKVmEU
```

### Step 6 — Merge `feature/static-data-cdn-cache` → main [YOU approves PR]

This branch contains:
- `infra/webhooks.ts` — the dynamic Pulumi resources for deploy hook + Strapi webhook
- Updated `infra/index.ts` — webhook pipeline wired up
- `infra/Pulumi.prod.yaml` — stack config committed
- Frontend: build-time static data seeding (React Query cache pre-populated at build time)

Once merged, `deploy.yml` will fire because `infra/**` changed.
With secrets set (Steps 2–3), the workflow will run `pulumi up --stack prod`, which:
1. Creates (or updates) the Vercel project config
2. Creates the Vercel deploy hook
3. Creates the Strapi webhook pointing to that deploy hook URL

After that, every Strapi publish triggers an automatic frontend rebuild.

---

## Deploy Confirmation Layer (Proposed)

The current `deploy.yml` ends after `pulumi up` succeeds — it knows Pulumi applied
but not whether Vercel actually finished building and serving the new version.

**Proposed addition to `deploy.yml`** — a confirmation step after `pulumi up`:

```yaml
- name: Wait for Vercel deployment
  run: |
    echo "Waiting for Vercel deployment on main branch..."
    DEADLINE=$(($(date +%s) + 300))  # 5-minute timeout
    while [ $(date +%s) -lt $DEADLINE ]; do
      STATUS=$(curl -s \
        -H "Authorization: Bearer $VERCEL_API_TOKEN" \
        "https://api.vercel.com/v6/deployments?projectId=prj_AYMvwFdokakjzzydvZVuygBKVmEU&target=production&limit=1" \
        | jq -r '.deployments[0].state')
      echo "  Deployment state: $STATUS"
      if [ "$STATUS" = "READY" ]; then
        echo "✅ Vercel deployment is live"
        break
      elif [ "$STATUS" = "ERROR" ] || [ "$STATUS" = "CANCELED" ]; then
        echo "❌ Vercel deployment failed: $STATUS"
        exit 1
      fi
      sleep 15
    done
    if [ "$STATUS" != "READY" ]; then
      echo "❌ Timed out waiting for Vercel deployment"
      exit 1
    fi
  env:
    VERCEL_API_TOKEN: ${{ secrets.VERCEL_API_TOKEN }}

- name: Smoke test production
  run: |
    echo "Smoke-testing beckwithbarrow.com..."
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://beckwithbarrow.com)
    if [ "$HTTP" != "200" ]; then
      echo "❌ https://beckwithbarrow.com returned HTTP $HTTP"
      exit 1
    fi
    echo "✅ Site is responding (HTTP $HTTP)"

    echo "Smoke-testing Strapi API..."
    API=$(curl -s -o /dev/null -w "%{http_code}" \
      https://striking-ball-b079f8c4b0.strapiapp.com/api/home-page)
    if [ "$API" != "200" ]; then
      echo "❌ Strapi API returned HTTP $API"
      exit 1
    fi
    echo "✅ Strapi API is responding (HTTP $API)"
```

This gives the workflow a genuine green/red signal — green means both Vercel and Strapi
are up and serving, not just that Pulumi ran without error.

**To add this:** The confirmation step should be implemented as a separate PR once
`deploy.yml` is running cleanly (it's easier to debug a broken workflow when the scope
is small).

---

## Operational Playbook

### After content is published in Strapi

Once the webhook pipeline is live (Step 6 merged + pulumi up ran):
- Ardis publishes an entry in Strapi admin
- Vercel triggers a rebuild automatically (no action needed)
- Build completes in ~2–3 minutes; new content is live

To verify a rebuild triggered:
```bash
# Check recent Vercel deployments
curl -s -H "Authorization: Bearer $VERCEL_API_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=prj_AYMvwFdokakjzzydvZVuygBKVmEU&limit=3" \
  | jq '.deployments[] | {state, url, createdAt}'
```

### If the deploy hook stops working

The deploy hook URL is stored as a Pulumi output. To retrieve it:
```bash
cd infra
pulumi stack output deployHookUrl --stack prod
```

To manually trigger a rebuild:
```bash
HOOK_URL=$(cd infra && pulumi stack output deployHookUrl --stack prod)
curl -X POST "$HOOK_URL"
```

### If you need to update a Vercel env var

All 6 Vercel env vars are managed by Pulumi. Update the Pulumi config and re-run:
```bash
cd infra
pulumi config set contactEmail new@example.com  # or --secret for sensitive values
pulumi up --stack prod
```

Do NOT update env vars directly in the Vercel dashboard — Pulumi will overwrite them
on the next `pulumi up`.

### Strapi Cloud env vars (manual — no API)

These must be updated manually in https://cloud.strapi.io → project settings → Variables.
The canonical values are stored encrypted in Pulumi state for disaster recovery reference:
```bash
cd infra
pulumi config get strapiAppKeys --stack prod    # shows plaintext after decrypt
pulumi config get cloudinarySecret --stack prod
# etc.
```

### Emergency: disable the Strapi→Vercel webhook

If the publish webhook is causing problems (e.g. triggering excessive rebuilds):
```bash
# Disable in Strapi admin:
# Settings → Webhooks → vercel-rebuild → toggle Enabled off
#
# Or remove via Pulumi (removes it from Strapi entirely):
cd infra
pulumi destroy --target 'urn:pulumi:prod::beckwithbarrow-infra::pulumi-nodejs:dynamic:Resource::vercel-rebuild-webhook' --stack prod
```

---

## Reference

| Item | Value |
|------|-------|
| Vercel project ID | `prj_AYMvwFdokakjzzydvZVuygBKVmEU` |
| Strapi Cloud URL | `https://striking-ball-b079f8c4b0.strapiapp.com` |
| Strapi API base | `https://striking-ball-b079f8c4b0.strapiapp.com/api` |
| Pulumi stack | `prod` (in `beckwithbarrow-infra` project) |
| Pulumi backend | Pulumi Cloud (app.pulumi.com) |
| GitHub repo | `jamesvillarrubia/beckwithbarrow` |
| Production URL | `https://beckwithbarrow.com` |
| Deploy workflow | `.github/workflows/deploy.yml` |
| Pulumi program | `infra/` |
| Pulumi config | `infra/Pulumi.prod.yaml` |
