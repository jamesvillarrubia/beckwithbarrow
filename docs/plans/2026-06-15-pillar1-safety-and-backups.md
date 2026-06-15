# Pillar 1: Safety & Backups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make it impossible to accidentally or autonomously destroy the DB→Cloudinary image links again, and establish reliable, restorable, in-repo backups of content + asset mapping + original binaries.

**Architecture:** Three independent safety mechanisms plus a backup system. (A) A startup override neutralizes Cloudinary auto-delete so removing a Strapi record orphans the image instead of destroying it. (B) The destructive `package.json` entries and the misleading `AI-INSTRUCTIONS.md` are quarantined/rewritten so the loaded guns can't be casually fired. (C) A read-only (GET-only) backup script dumps Strapi content + a Cloudinary asset manifest + original binaries (git-lfs), in a format the existing `restore-cloudinary.py` recovery tool consumes. (D) The backup runs pre-flight and nightly.

**Tech Stack:** Strapi v5, `@strapi/provider-upload-cloudinary`, Node 22 + Vitest (added to `api/`), Cloudinary Admin API, git-lfs, GitHub Actions.

**Branch / worktree:** `feature/website-management-agent` at `.worktrees/website-management-agent`.

**Spec:** `reqts/website-management-agent.md`

---

## File Structure

| Path | Responsibility | New/Mod |
|------|----------------|---------|
| `api/vitest.config.ts` | Vitest config for api unit tests | Create |
| `api/src/index.ts` | Strapi `register`/`bootstrap`; add Cloudinary delete no-op | Modify |
| `api/src/safety/disable-upload-delete.ts` | Pure helper: wraps a provider so `delete` is a logged no-op | Create |
| `api/src/safety/disable-upload-delete.test.ts` | Unit tests for the wrapper | Create |
| `api/package.json` | Remove dangerous script entries; add `test`, `backup:safe` | Modify |
| `api/scripts/guard-forbidden.mjs` | Fails loudly if a forbidden command is invoked | Create |
| `api/scripts/lib/build-manifest.mjs` | Pure: content + cloudinary resources → manifest + upload-plan | Create |
| `api/scripts/lib/build-manifest.test.mjs` | Unit tests for the builder | Create |
| `api/scripts/safe-backup.mjs` | Orchestrator: GET content + cloudinary, download binaries, write files | Create |
| `scripts/restore-cloudinary.py` | Recovery tool (currently untracked) — formalize & commit | Modify (track) |
| `api/AI-INSTRUCTIONS.md` | Rewrite to warn against destructive ops instead of recommending | Modify |
| `api/.gitattributes` | git-lfs tracking for backup binaries | Create |
| `.github/workflows/nightly-backup.yml` | Scheduled nightly backup | Create |
| `docs/RESTORE-RUNBOOK.md` | Step-by-step disaster recovery runbook | Create |

---

## Task 0: Test infrastructure for `api/`

**Files:**
- Create: `api/vitest.config.ts`
- Modify: `api/package.json`

- [ ] **Step 1: Add Vitest to the api workspace**

Run: `pnpm --filter api add -D vitest`
Expected: vitest appears in `api/package.json` devDependencies.

- [ ] **Step 2: Create the Vitest config**

Create `api/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    globals: false,
  },
});
```

- [ ] **Step 3: Add a `test` script to `api/package.json`**

In `api/package.json` `scripts`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify the runner works (no tests yet = success)**

Run: `pnpm --filter api test`
Expected: Vitest runs, reports "No test files found" or 0 tests, exit 0.

- [ ] **Step 5: Commit**

```bash
git add api/vitest.config.ts api/package.json api/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "build(api): add vitest test runner"
```

---

## Task 1: Cloudinary delete no-op wrapper (pure unit)

The Cloudinary provider returns an object `{ uploadStream, upload, delete }` from `init()`. We wrap that object so `delete` becomes a logged no-op. This task builds and tests the pure wrapper in isolation (no Strapi runtime needed).

**Files:**
- Create: `api/src/safety/disable-upload-delete.ts`
- Test: `api/src/safety/disable-upload-delete.test.ts`

- [ ] **Step 1: Write the failing test**

Create `api/src/safety/disable-upload-delete.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { wrapProviderNoDelete } from './disable-upload-delete';

describe('wrapProviderNoDelete', () => {
  it('replaces delete with a no-op that never calls the original', async () => {
    const originalDelete = vi.fn().mockResolvedValue('deleted');
    const logger = { warn: vi.fn() };
    const provider = { upload: vi.fn(), uploadStream: vi.fn(), delete: originalDelete };

    const wrapped = wrapProviderNoDelete(provider, logger);
    const result = await wrapped.delete({ url: 'x', provider_metadata: { public_id: 'abc' } });

    expect(originalDelete).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('preserves upload and uploadStream untouched', () => {
    const provider = { upload: vi.fn(), uploadStream: vi.fn(), delete: vi.fn() };
    const wrapped = wrapProviderNoDelete(provider, { warn: vi.fn() });
    expect(wrapped.upload).toBe(provider.upload);
    expect(wrapped.uploadStream).toBe(provider.uploadStream);
  });

  it('is idempotent — wrapping twice still no-ops', async () => {
    const originalDelete = vi.fn();
    const wrapped = wrapProviderNoDelete(
      wrapProviderNoDelete({ delete: originalDelete }, { warn: vi.fn() }),
      { warn: vi.fn() },
    );
    await wrapped.delete({ url: 'y' });
    expect(originalDelete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- disable-upload-delete`
Expected: FAIL — `wrapProviderNoDelete` is not defined / module not found.

- [ ] **Step 3: Write minimal implementation**

Create `api/src/safety/disable-upload-delete.ts`:

```ts
type Logger = { warn: (msg: string) => void };
type UploadProvider = {
  upload?: unknown;
  uploadStream?: unknown;
  delete?: (...args: unknown[]) => unknown;
  [key: string]: unknown;
};

/**
 * Returns a copy of the upload provider whose `delete` is a logged no-op.
 * Deleting a Strapi file record then ORPHANS the Cloudinary asset instead of
 * destroying it. Orphans are cheap and cleanable; destroyed originals are gone.
 * This directly neutralizes the 2026-03-19 mass-deletion failure mode.
 */
export function wrapProviderNoDelete(
  provider: UploadProvider,
  logger: Logger,
): UploadProvider {
  return {
    ...provider,
    async delete(...args: unknown[]): Promise<void> {
      const file = args[0] as { url?: string; provider_metadata?: { public_id?: string } } | undefined;
      const id = file?.provider_metadata?.public_id ?? file?.url ?? 'unknown';
      logger.warn(`[safety] Cloudinary delete suppressed (orphaned, not destroyed): ${id}`);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- disable-upload-delete`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add api/src/safety/disable-upload-delete.ts api/src/safety/disable-upload-delete.test.ts
git commit -m "feat(api): add no-op wrapper to suppress Cloudinary auto-delete"
```

---

## Task 2: Wire the no-op into Strapi startup

Install the wrapper against the live upload provider during `bootstrap`. The provider handle location in Strapi v5 must be confirmed at runtime — this task includes that verification rather than guessing.

**Files:**
- Modify: `api/src/index.ts`

- [ ] **Step 1: Read the current startup file**

Run: `cat api/src/index.ts`
Note the existing `register` / `bootstrap` exports (there is already join-table repair logic in `bootstrap`). You will ADD to `bootstrap`, not replace it.

- [ ] **Step 2: Add the provider override to `bootstrap`**

Inside the existing `bootstrap({ strapi })` body (after current logic), add:

```ts
import { wrapProviderNoDelete } from './safety/disable-upload-delete';

// ... inside bootstrap({ strapi }):
try {
  // Strapi v5 exposes the initialized upload provider here:
  const uploadPlugin = strapi.plugin('upload') as unknown as { provider?: { delete?: unknown } } | undefined;
  const provider = uploadPlugin?.provider;
  if (provider && typeof provider.delete === 'function') {
    const wrapped = wrapProviderNoDelete(provider, strapi.log);
    provider.delete = wrapped.delete; // mutate in place so the upload service sees it
    strapi.log.info('[safety] Cloudinary auto-delete disabled (records orphan, not destroy)');
  } else {
    strapi.log.error('[safety] Could not locate upload provider.delete — auto-delete NOT disabled. Investigate before any media deletion.');
  }
} catch (err) {
  strapi.log.error(`[safety] Failed to disable Cloudinary auto-delete: ${String(err)}`);
}
```

- [ ] **Step 3: Verify the handle location at runtime**

Run: `pnpm --filter api dev` (or `pnpm dev:api`)
Expected log line: `[safety] Cloudinary auto-delete disabled (records orphan, not destroy)`
If instead you see the `Could not locate` error: the provider lives elsewhere in this Strapi version. Try `strapi.plugins?.upload?.provider` as the handle, re-run, and confirm the success log. Do not proceed until the success log appears.

- [ ] **Step 4: Manual safety verification (local only, never against cloud)**

With local Strapi running and using the LOCAL sqlite DB + a throwaway local image:
1. Upload a test image via the Strapi admin (`http://localhost:1337/admin`).
2. Note its Cloudinary `public_id`.
3. Delete the file record in the admin.
4. Expected log: `[safety] Cloudinary delete suppressed ...`.
5. Confirm in Cloudinary console the asset still exists (orphaned).

Document the result inline in the commit message.

- [ ] **Step 5: Commit**

```bash
git add api/src/index.ts
git commit -m "feat(api): disable Cloudinary auto-delete on startup (verified: orphan retained)"
```

---

## Task 3: Quarantine destructive package.json entries + add a guard

The `.sh` scripts and `delete-cloud-media.js` referenced in `api/package.json` no longer exist, so those commands already error — but the entries invite recreation. Remove them and replace `restore` (live `strapi import`) and any remaining destructive entries with a guard that refuses to run without a deliberate human override.

**Files:**
- Modify: `api/package.json`
- Create: `api/scripts/guard-forbidden.mjs`
- Test: `api/scripts/guard-forbidden.test.mjs`

- [ ] **Step 1: Write the failing test for package.json hygiene**

Create `api/scripts/guard-forbidden.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import pkg from '../package.json' assert { type: 'json' };

const FORBIDDEN_SCRIPT_NAMES = [
  'transfer:to-cloud', 'transfer:to-cloud:full', 'transfer:to-cloud:content',
  'transfer:to-cloud:files', 'transfer:to-cloud:force',
  'transfer:from-cloud', 'transfer:from-cloud:full', 'transfer:from-cloud:content',
  'transfer:from-cloud:files', 'transfer:from-cloud:force',
  'deploy:cloud', 'deploy:cloud:full',
  'delete:cloud-media', 'delete:cloud-media:dry-run', 'delete:cloud-media:force', 'delete:cloud-media:help',
];

describe('package.json safety', () => {
  it('exposes no direct destructive transfer/deploy/delete scripts', () => {
    const present = FORBIDDEN_SCRIPT_NAMES.filter((n) => n in (pkg.scripts ?? {}));
    expect(present).toEqual([]);
  });

  it('routes restore through the guard, not a bare strapi import', () => {
    expect(pkg.scripts.restore ?? '').toContain('guard-forbidden.mjs');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- guard-forbidden`
Expected: FAIL — forbidden script names are still present; `restore` is a bare `strapi import`.

- [ ] **Step 3: Edit `api/package.json` to remove/redirect**

Delete these keys entirely from `scripts`: every `transfer:to-cloud*`, every `transfer:from-cloud*`, `transfer:dry-run`, `transfer:help`, `deploy:cloud*`, `delete:cloud-media*`, and the dead `backup*`/`backup:cloud*`/`backup:cleanup*` entries that point to missing `.sh` files.

Replace the `restore` key with:

```json
"restore": "node ./scripts/guard-forbidden.mjs restore"
```

- [ ] **Step 4: Implement the guard**

Create `api/scripts/guard-forbidden.mjs`:

```js
#!/usr/bin/env node
// Refuses to run destructive Strapi operations unless a human sets an explicit,
// one-time override. These operations can sever or destroy DB->Cloudinary links.
const op = process.argv[2] ?? 'unknown';
const OVERRIDE = 'I_UNDERSTAND_THIS_CAN_DESTROY_PRODUCTION_DATA';

const messages = {
  restore: 'strapi import OVERWRITES the target database and can delete media.',
  'transfer': 'strapi transfer WIPES the destination (deleting Cloudinary assets).',
};

console.error(`\n  ⛔ BLOCKED: "${op}" is a destructive operation.`);
console.error(`     ${messages[op] ?? 'This command can cause irreversible data loss.'}`);
console.error(`     It must NEVER be run by an AI agent or autonomously.`);
console.error(`     See docs/RESTORE-RUNBOOK.md for the supervised manual procedure.\n`);

if (process.env.STRAPI_DESTRUCTIVE_OVERRIDE !== OVERRIDE) {
  console.error(`     To proceed (humans only), re-run with:`);
  console.error(`       STRAPI_DESTRUCTIVE_OVERRIDE='${OVERRIDE}' <command>\n`);
  process.exit(1);
}
console.error(`     Override present. A human has accepted the risk. Proceeding is still manual.\n`);
process.exit(2); // never auto-chains into the destructive command
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter api test -- guard-forbidden`
Expected: PASS — both tests green.

- [ ] **Step 6: Verify the guard blocks by default**

Run: `node api/scripts/guard-forbidden.mjs restore; echo "exit=$?"`
Expected: prints the BLOCKED message, `exit=1`.

- [ ] **Step 7: Commit**

```bash
git add api/package.json api/scripts/guard-forbidden.mjs api/scripts/guard-forbidden.test.mjs
git commit -m "feat(api): quarantine destructive scripts behind human-only guard"
```

---

## Task 4: Rewrite AI-INSTRUCTIONS.md to warn, not recommend

**Files:**
- Modify: `api/AI-INSTRUCTIONS.md`
- Test: `api/scripts/ai-instructions.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `api/scripts/ai-instructions.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const doc = readFileSync(fileURLToPath(new URL('../AI-INSTRUCTIONS.md', import.meta.url)), 'utf8');

describe('AI-INSTRUCTIONS.md', () => {
  it('contains a NEVER-RUN forbidden-operations section', () => {
    expect(doc).toMatch(/NEVER RUN/i);
  });
  it('warns about strapi transfer destroying Cloudinary assets', () => {
    expect(doc).toMatch(/transfer/i);
    expect(doc).toMatch(/Cloudinary/i);
    expect(doc).toMatch(/2026-03-19|201 (Cloudinary )?images/);
  });
  it('does not instruct the reader to run transfer:to-cloud as a suggestion', () => {
    // The phrase "Point to `pnpm transfer" recommended destructive ops; it must be gone.
    expect(doc).not.toMatch(/Point to .{0,10}pnpm transfer/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- ai-instructions`
Expected: FAIL — no NEVER-RUN section; still recommends transfer.

- [ ] **Step 3: Rewrite the document**

Replace the body of `api/AI-INSTRUCTIONS.md` with a warning-first structure. Lead with:

```markdown
# AI Instructions — Beckwith Barrow

## ⛔ NEVER RUN THESE (irreversible data loss)

The following destroy or sever the database→Cloudinary image links. On 2026-03-19 a
`strapi transfer` with production credentials destroyed **201 Cloudinary images**.
An AI agent must NEVER run, suggest running, or auto-chain into any of these:

- `strapi transfer` (any direction) — wipes the destination, deleting Cloudinary assets
- `strapi import` / `pnpm restore` — overwrites the database
- `strapi deploy` / any `deploy:cloud*` — production push
- any `delete:cloud-media*` — deletes Cloudinary binaries directly

These are gated behind `api/scripts/guard-forbidden.mjs` and are humans-only,
supervised, per `docs/RESTORE-RUNBOOK.md`.

## ✅ Safe operations

- `pnpm --filter api backup:safe` — read-only (GET) backup of content + assets
- Content edits via the Strapi admin UI
- Code/design changes via the normal branch → verify → tiered-merge workflow
```

Keep any still-accurate inventory below this, but remove every instruction that tells the
reader to *run* a transfer/deploy/delete command.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- ai-instructions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/AI-INSTRUCTIONS.md api/scripts/ai-instructions.test.mjs
git commit -m "docs(api): rewrite AI-INSTRUCTIONS to forbid destructive ops"
```

---

## Task 5: Backup manifest + upload-plan builder (pure unit)

The heart of restorability: given the Strapi content dump and the Cloudinary resources list, produce (a) a `cloudinary-manifest.json` and (b) a `cloudinary-upload-plan.json` matching the shape `restore-cloudinary.py` already consumes (`{matched:[{public_id, local_path, project}], unmatched:[...]}`).

**Files:**
- Create: `api/scripts/lib/build-manifest.mjs`
- Test: `api/scripts/lib/build-manifest.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `api/scripts/lib/build-manifest.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { buildManifest, buildUploadPlan } from './build-manifest.mjs';

const cloudinaryResources = [
  { public_id: 'projects/hillside_a', secure_url: 'https://res.cloudinary.com/x/hillside_a.jpg', bytes: 1000, format: 'jpg', width: 800, height: 600 },
  { public_id: 'orphan_xyz', secure_url: 'https://res.cloudinary.com/x/orphan_xyz.jpg', bytes: 50, format: 'jpg', width: 10, height: 10 },
];
const strapiFiles = [
  { provider_metadata: { public_id: 'projects/hillside_a' }, url: 'https://res.cloudinary.com/x/hillside_a.jpg', name: 'hillside_a.jpg', relatedProject: 'Hillside Farmhouse' },
];

describe('buildManifest', () => {
  it('maps each cloudinary asset and flags whether a Strapi record references it', () => {
    const m = buildManifest(cloudinaryResources, strapiFiles);
    const referenced = m.find((a) => a.public_id === 'projects/hillside_a');
    const orphan = m.find((a) => a.public_id === 'orphan_xyz');
    expect(referenced.referenced).toBe(true);
    expect(referenced.bytes).toBe(1000);
    expect(orphan.referenced).toBe(false);
  });
});

describe('buildUploadPlan', () => {
  it('matched contains referenced assets with local_path + project; unmatched holds the rest', () => {
    const plan = buildUploadPlan(cloudinaryResources, strapiFiles, 'api/backups/assets');
    expect(plan.matched).toHaveLength(1);
    expect(plan.matched[0]).toMatchObject({
      public_id: 'projects/hillside_a',
      project: 'Hillside Farmhouse',
      local_path: 'api/backups/assets/projects/hillside_a.jpg',
    });
    expect(plan.unmatched.map((u) => u.public_id)).toContain('orphan_xyz');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- build-manifest`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `api/scripts/lib/build-manifest.mjs`:

```js
// Pure transforms — no network, no fs. Easy to unit test.

/** Index Strapi file records by Cloudinary public_id. */
function indexByPublicId(strapiFiles) {
  const map = new Map();
  for (const f of strapiFiles) {
    const id = f?.provider_metadata?.public_id;
    if (id) map.set(id, f);
  }
  return map;
}

/** One manifest row per Cloudinary asset, flagged as referenced or orphan. */
export function buildManifest(cloudinaryResources, strapiFiles) {
  const refs = indexByPublicId(strapiFiles);
  return cloudinaryResources.map((r) => ({
    public_id: r.public_id,
    url: r.secure_url,
    bytes: r.bytes,
    format: r.format,
    width: r.width,
    height: r.height,
    referenced: refs.has(r.public_id),
    related_record: refs.get(r.public_id)?.relatedProject ?? null,
  }));
}

/** Build the restore-cloudinary.py compatible upload plan. */
export function buildUploadPlan(cloudinaryResources, strapiFiles, assetsDir) {
  const refs = indexByPublicId(strapiFiles);
  const matched = [];
  const unmatched = [];
  for (const r of cloudinaryResources) {
    const ext = r.format ? `.${r.format}` : '';
    const local_path = `${assetsDir}/${r.public_id}${ext}`;
    const f = refs.get(r.public_id);
    if (f) {
      matched.push({ public_id: r.public_id, local_path, project: f.relatedProject ?? null });
    } else {
      unmatched.push({ public_id: r.public_id, local_path });
    }
  }
  return { matched, unmatched };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- build-manifest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/lib/build-manifest.mjs api/scripts/lib/build-manifest.test.mjs
git commit -m "feat(api): add pure backup manifest + upload-plan builder"
```

---

## Task 6: Read-only backup orchestrator

Wire the pure builder to live GET-only data sources and write the backup tree. NO write/delete calls to Strapi or Cloudinary anywhere in this script.

**Files:**
- Create: `api/scripts/safe-backup.mjs`
- Modify: `api/package.json` (add `backup:safe`)

- [ ] **Step 1: Add the script entry**

In `api/package.json` `scripts`, add:

```json
"backup:safe": "node ./scripts/safe-backup.mjs",
"backup:safe:dry-run": "node ./scripts/safe-backup.mjs --dry-run"
```

- [ ] **Step 2: Implement the orchestrator**

Create `api/scripts/safe-backup.mjs`:

```js
#!/usr/bin/env node
import { writeFile, mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { buildManifest, buildUploadPlan } from './lib/build-manifest.mjs';

const DRY = process.argv.includes('--dry-run');
const STAMP = process.env.BACKUP_STAMP || new Date().toISOString().replace(/[:.]/g, '-');
const ROOT = path.resolve('backups');                 // api/backups
const OUT = path.join(ROOT, STAMP);
const ASSETS = path.join(ROOT, 'assets');             // shared, content-addressed by public_id

// --- Read-only config (tokens from env; NEVER written to disk) ---
const STRAPI_URL = process.env.STRAPI_CLOUD_BASE_URL;
const STRAPI_TOKEN = process.env.STRAPI_CLOUD_API_TOKEN;
const CLOUD = {
  name: process.env.CLOUDINARY_NAME,
  key: process.env.CLOUDINARY_KEY,
  secret: process.env.CLOUDINARY_SECRET,
};

function requireEnv() {
  const missing = [
    ['STRAPI_CLOUD_BASE_URL', STRAPI_URL], ['STRAPI_CLOUD_API_TOKEN', STRAPI_TOKEN],
    ['CLOUDINARY_NAME', CLOUD.name], ['CLOUDINARY_KEY', CLOUD.key], ['CLOUDINARY_SECRET', CLOUD.secret],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { console.error(`Missing env: ${missing.join(', ')}`); process.exit(1); }
}

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

// 1. Strapi content (GET only). upload/files lists every media record with provider_metadata.
async function fetchStrapiFiles() {
  const all = [];
  let page = 1;
  for (;;) {
    const data = await getJson(
      `${STRAPI_URL}/api/upload/files?pagination[page]=${page}&pagination[pageSize]=100`,
      { Authorization: `Bearer ${STRAPI_TOKEN}` },
    );
    const items = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
    all.push(...items);
    if (items.length < 100) break;
    page += 1;
  }
  return all;
}

// 2. Cloudinary resources (GET only, basic auth).
async function fetchCloudinaryResources() {
  const auth = Buffer.from(`${CLOUD.key}:${CLOUD.secret}`).toString('base64');
  const out = [];
  let next;
  do {
    const u = new URL(`https://api.cloudinary.com/v1_1/${CLOUD.name}/resources/image`);
    u.searchParams.set('max_results', '500');
    if (next) u.searchParams.set('next_cursor', next);
    const data = await getJson(u.toString(), { Authorization: `Basic ${auth}` });
    out.push(...(data.resources ?? []));
    next = data.next_cursor;
  } while (next);
  return out;
}

async function downloadBinary(resource) {
  const ext = resource.format ? `.${resource.format}` : '';
  const dest = path.join(ASSETS, `${resource.public_id}${ext}`);
  await mkdir(path.dirname(dest), { recursive: true });
  const res = await fetch(resource.secure_url);
  if (!res.ok) throw new Error(`download ${resource.public_id} -> ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
  return dest;
}

async function main() {
  requireEnv();
  console.log(`Backup ${STAMP}${DRY ? ' (dry-run)' : ''}`);

  const [files, resources] = await Promise.all([fetchStrapiFiles(), fetchCloudinaryResources()]);
  console.log(`Strapi files: ${files.length}, Cloudinary assets: ${resources.length}`);

  const manifest = buildManifest(resources, files);
  // local_path must be repo-root-relative so restore-cloudinary.py (run from repo root) finds binaries.
  const plan = buildUploadPlan(resources, files, 'api/backups/assets');
  const orphans = manifest.filter((m) => !m.referenced).length;
  console.log(`Referenced: ${manifest.length - orphans}, Orphans: ${orphans}, Unmatched in plan: ${plan.unmatched.length}`);

  if (DRY) { console.log('Dry run — no files written, no binaries downloaded.'); return; }

  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'strapi-files.json'), JSON.stringify(files, null, 2));
  await writeFile(path.join(OUT, 'cloudinary-manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(ROOT, 'cloudinary-upload-plan.json'), JSON.stringify(plan, null, 2));

  let ok = 0;
  for (const r of resources) {
    try { await downloadBinary(r); ok += 1; }
    catch (e) { console.error(`  download failed ${r.public_id}: ${e.message}`); }
  }
  console.log(`Binaries downloaded: ${ok}/${resources.length} -> ${ASSETS}`);
  console.log(`Done. Review 'git status' then commit the backup.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Dry-run against cloud (read-only, safe)**

Ensure read-only creds are exported (from `api/strapi-cloud.env` for the Strapi token/URL and `api/cloudinary.env` for Cloudinary). Then from `api/`:

Run: `pnpm --filter api backup:safe:dry-run`
Expected: prints Strapi file count, Cloudinary asset count, referenced/orphan counts. No files written. If counts look wrong (e.g. 0 assets), STOP and resolve credentials/endpoints before a real run.

- [ ] **Step 4: Resolve open question — confirm the Strapi files endpoint**

If `GET /api/upload/files` returns 403/404 with the API token, the token lacks `upload` read scope or the route differs. Confirm in the Strapi admin (Settings → API Tokens) that a **read-only** token with `Upload: find` is used. Record the working endpoint in a comment at the top of `safe-backup.mjs`.

- [ ] **Step 5: Commit (script only; backups committed in Task 7)**

```bash
git add api/scripts/safe-backup.mjs api/package.json
git commit -m "feat(api): add read-only backup orchestrator (content + cloudinary + binaries)"
```

---

## Task 7: git-lfs for binaries + first real backup committed

**Files:**
- Create: `api/.gitattributes`
- Create (data): `api/backups/**`

- [ ] **Step 1: Confirm git-lfs is installed**

Run: `git lfs version`
Expected: prints a version. If "command not found", install: `brew install git-lfs` then `git lfs install`.

- [ ] **Step 2: Track backup binaries with git-lfs**

Create `api/.gitattributes`:

```gitattributes
backups/assets/** filter=lfs diff=lfs merge=lfs -text
```

Run: `git lfs install --local` (from repo root, inside the worktree)

- [ ] **Step 3: Run a real backup**

From `api/`, with read-only creds exported:
Run: `pnpm --filter api backup:safe`
Expected: writes `api/backups/<stamp>/strapi-files.json`, `cloudinary-manifest.json`, `api/backups/cloudinary-upload-plan.json`, and downloads binaries to `api/backups/assets/`.

- [ ] **Step 4: Verify no secrets are present in the backup**

Run: `grep -rIl -E "SECRET|TOKEN|PASSWORD|api_secret|Bearer " api/backups/ || echo "clean"`
Expected: `clean`. If anything matches, fix `safe-backup.mjs` to exclude that field and re-run before committing.

- [ ] **Step 5: Verify LFS pointers (not raw binaries) are staged**

Run: `git add api/.gitattributes api/backups && git lfs ls-files | head`
Expected: lists asset files as LFS-tracked.

- [ ] **Step 6: Commit the first backup**

```bash
git commit -m "chore(backups): first read-only safety backup (content + manifest + lfs binaries)"
```

---

## Task 8: Formalize the restore path + runbook

`scripts/restore-cloudinary.py` is currently untracked. Commit it and document the supervised recovery procedure end-to-end so a human can restore under pressure.

**Files:**
- Modify (track): `scripts/restore-cloudinary.py`
- Create: `docs/RESTORE-RUNBOOK.md`

- [ ] **Step 1: Confirm the restore tool reads the plan this backup produces**

Run: `python3 scripts/restore-cloudinary.py --dry-run`
Expected: reads `api/backups/cloudinary-upload-plan.json`, lists matched images and whether each `local_path` exists. (It looks under `api/backups/cloudinary-upload-plan.json` — confirm the path matches Task 6's output; adjust `PLAN_FILE` in the script if needed.)

- [ ] **Step 2: Write the runbook**

Create `docs/RESTORE-RUNBOOK.md`:

```markdown
# Disaster Recovery Runbook — Cloudinary / Strapi

## When to use
Images are missing on the live site, or DB→image links are broken.

## Preconditions
- A backup exists under `api/backups/<stamp>/` and `api/backups/assets/` (git-lfs).
- `api/backups/cloudinary-upload-plan.json` is present.

## Procedure (humans only — supervised)
1. Pull the latest backup commit; run `git lfs pull` to materialize binaries.
2. Verify files locally: `python3 scripts/restore-cloudinary.py --dry-run`.
3. Check which assets are actually missing on Cloudinary:
   `CLOUDINARY_SECRET=... python3 scripts/restore-cloudinary.py --verify-only`.
4. Restore (re-uploads with EXACT public_id, so DB references keep working):
   `CLOUDINARY_SECRET=... python3 scripts/restore-cloudinary.py`  (type RESTORE to confirm).
5. Verify the live site and the Strapi media library.

## What NOT to do
- Never run `strapi transfer` / `strapi import` / `deploy:cloud` to "fix" this.
- Restoration uploads binaries; it never touches the database.
```

- [ ] **Step 3: Commit**

```bash
git add scripts/restore-cloudinary.py docs/RESTORE-RUNBOOK.md
git commit -m "docs: formalize Cloudinary restore tool + recovery runbook"
```

---

## Task 9: Nightly + pre-flight backup automation

**Files:**
- Create: `.github/workflows/nightly-backup.yml`

- [ ] **Step 1: Confirm prerequisites (open question resolution)**

Confirm with the repo owner: GitHub Actions enabled, git-lfs storage acceptable, and these repo secrets exist (read-only): `STRAPI_CLOUD_BASE_URL`, `STRAPI_CLOUD_API_TOKEN`, `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET`. Do not hardcode any of these.

- [ ] **Step 2: Add the workflow**

Create `.github/workflows/nightly-backup.yml`:

```yaml
name: Nightly Safety Backup
on:
  schedule:
    - cron: '17 7 * * *'   # 07:17 UTC nightly (off the :00 stampede)
  workflow_dispatch: {}
permissions:
  contents: write
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { lfs: true }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - name: Run read-only backup
        working-directory: api
        env:
          STRAPI_CLOUD_BASE_URL: ${{ secrets.STRAPI_CLOUD_BASE_URL }}
          STRAPI_CLOUD_API_TOKEN: ${{ secrets.STRAPI_CLOUD_API_TOKEN }}
          CLOUDINARY_NAME: ${{ secrets.CLOUDINARY_NAME }}
          CLOUDINARY_KEY: ${{ secrets.CLOUDINARY_KEY }}
          CLOUDINARY_SECRET: ${{ secrets.CLOUDINARY_SECRET }}
        run: pnpm --filter api backup:safe
      - name: Secret-leak guard
        run: |
          if grep -rIl -E "SECRET|TOKEN|PASSWORD|api_secret" api/backups/; then
            echo "Secrets found in backup output"; exit 1; fi
      - name: Commit backup
        run: |
          git config user.name "backup-bot"
          git config user.email "backup-bot@users.noreply.github.com"
          git add api/backups api/.gitattributes
          git diff --cached --quiet || git commit -m "chore(backups): nightly $(date -u +%FT%TZ)"
          git push
```

- [ ] **Step 3: Trigger once manually to verify**

After merging, run the workflow via `workflow_dispatch` in the GitHub Actions UI.
Expected: green run; a new `chore(backups): nightly ...` commit appears; the secret-leak guard passes.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/nightly-backup.yml
git commit -m "ci: nightly read-only safety backup workflow"
```

- [ ] **Step 5 (pre-flight hook — documented, wired in Pillar 3):**

Pre-flight-before-mutation is enforced by the agent workflow (Pillar 3), which runs
`pnpm --filter api backup:safe` before any content-mutating action. Note this dependency
in the Pillar 3 plan; no code here.

---

## Final verification

- [ ] **All api tests pass:** `pnpm --filter api test` → all green.
- [ ] **Guard blocks by default:** `node api/scripts/guard-forbidden.mjs restore; echo $?` → message + `1`.
- [ ] **Startup log confirms safety:** `pnpm dev:api` shows `[safety] Cloudinary auto-delete disabled`.
- [ ] **Backup round-trips:** `backup:safe` writes a tree; `restore-cloudinary.py --dry-run` reads it and finds the binaries.
- [ ] **No secrets in backups:** `grep -rIE "SECRET|TOKEN|PASSWORD" api/backups/` → nothing.
- [ ] **Spec coverage:** every Pillar 1 bullet in `reqts/website-management-agent.md` maps to a task above.

---

## Notes / open items carried from the spec

- **Direct Postgres access:** Not required by this plan — backups are API-based (GET only). If Strapi Cloud later exposes a connection string, a `pg_dump` step can be added as a belt-and-suspenders extra.
- **git-lfs storage budget:** monitor repo LFS usage; if it grows large, revisit retention (e.g. prune `backups/<stamp>/` content JSON older than N while keeping `assets/` content-addressed).
- **Pillars 2–5** get their own plans after Pillar 1 lands and is verified.
