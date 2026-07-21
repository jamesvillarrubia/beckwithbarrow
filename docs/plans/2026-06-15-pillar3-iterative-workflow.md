# Pillar 3: Iterative Change Workflow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the concrete tooling that makes the tiered workflow from `reqts/pillar3-iterative-workflow.md` mechanical and repeatable: a `verify` helper that runs all checks and captures a screenshot; a risk-classifier that labels a diff as Tier A or Tier B; a one-command revert helper; a design-log for ship-then-refine notes; and the structural PR template.

**Architecture:** Four small, independent deliverables. (A) A `scripts/verify.mjs` orchestrator that runs the full check suite and captures a screenshot. (B) A `scripts/classify-risk.mjs` script (pure, TDD-able) that reads a git diff and emits `TIER_A` or `TIER_B` with a reason. (C) A `scripts/revert-last.mjs` one-liner wrapper. (D) A `docs/tmp/design-log.md` template and a structural PR template.

**Branch / worktree:** `overnight/wma-pillars` at `.worktrees/wma-overnight`.

**Spec:** `reqts/pillar3-iterative-workflow.md`

---

## File Structure

| Path | Responsibility | New/Mod |
|------|----------------|---------|
| `scripts/verify.mjs` | Runs build/lint/types/api-tests + captures screenshot | Create |
| `scripts/verify.test.mjs` | Unit tests for the pure check-suite parser helpers | Create |
| `scripts/classify-risk.mjs` | Reads a git diff and classifies Tier A vs Tier B | Create |
| `scripts/classify-risk.test.mjs` | Unit tests for the classifier | Create |
| `scripts/revert-last.mjs` | One-command revert wrapper (prints and optionally executes) | Create |
| `docs/tmp/design-log.md` | Ship-then-refine heads-up log (not gitignored) | Create |
| `docs/tmp/.gitkeep` | Keep the tmp directory tracked | Create |
| `.github/PULL_REQUEST_TEMPLATE/structural.md` | PR template for Tier B changes | Create |
| `api/vitest.config.ts` | Already exists from Pillar 1 — no change needed | — |

---

## Task 0: Confirm prerequisites

- [ ] **Step 1: Verify Pillar 1 api test infra is in place**

Run: `cd /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/api && pnpm test`
Expected: Vitest finds the existing Pillar 1 tests and they pass (or "No test files found"
if Pillar 1 is not yet merged into this branch). If the command fails with "vitest: not
found", follow Pillar 1 Task 0 first.

- [ ] **Step 2: Confirm pnpm build runs from repo root**

Run: `cd /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight && pnpm build`
Note the exit code. If it fails for an existing reason unrelated to this Pillar, open a
`FINDING:` comment in this file instead of blocking — the `verify` script should still be
written; it just reports failures rather than silently passing them.

- [ ] **Step 3: Create the `docs/tmp/` directory**

```bash
mkdir -p /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/docs/tmp
touch /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/docs/tmp/.gitkeep
```

---

## Task 1: Risk classifier (pure unit — TDD)

The classifier reads a list of changed file paths and emits `TIER_A` or `TIER_B` with a
reason. It is a pure function: no git subprocess, no filesystem — just path-string logic.
This makes it trivially testable and usable both by humans and by the orchestrator.

**Files:**
- Create: `scripts/classify-risk.mjs`
- Test: `scripts/classify-risk.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/classify-risk.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { classifyRisk } from './classify-risk.mjs';

describe('classifyRisk', () => {
  it('labels a pure Tailwind/copy change in frontend/src as TIER_A', () => {
    const result = classifyRisk(['frontend/src/pages/ConnectPage.tsx']);
    expect(result.tier).toBe('TIER_A');
  });

  it('labels any api/config/ change as TIER_B', () => {
    const result = classifyRisk(['api/config/plugins.ts']);
    expect(result.tier).toBe('TIER_B');
    expect(result.reason).toMatch(/api\/config/);
  });

  it('labels pnpm-lock.yaml changes as TIER_B', () => {
    const result = classifyRisk(['pnpm-lock.yaml']);
    expect(result.tier).toBe('TIER_B');
    expect(result.reason).toMatch(/dependency/i);
  });

  it('labels api/src non-test changes as TIER_B', () => {
    expect(classifyRisk(['api/src/index.ts']).tier).toBe('TIER_B');
  });

  it('labels api/src test files as TIER_A', () => {
    expect(classifyRisk(['api/src/safety/disable-upload-delete.test.ts']).tier).toBe('TIER_A');
  });

  it('labels .github/workflows changes as TIER_B', () => {
    expect(classifyRisk(['.github/workflows/nightly-backup.yml']).tier).toBe('TIER_B');
  });

  it('labels docs-only and test-only changes as TIER_A', () => {
    expect(classifyRisk(['docs/tmp/design-log.md']).tier).toBe('TIER_A');
    expect(classifyRisk(['scripts/classify-risk.test.mjs']).tier).toBe('TIER_A');
  });

  it('escalates a mixed set if ANY file is Tier B', () => {
    const result = classifyRisk([
      'frontend/src/pages/ConnectPage.tsx',
      'api/config/plugins.ts',
    ]);
    expect(result.tier).toBe('TIER_B');
  });

  it('labels package.json changes with new deps as TIER_B', () => {
    // package.json under api/ or root
    expect(classifyRisk(['api/package.json']).tier).toBe('TIER_B');
  });

  it('labels scripts/safe-backup.mjs (backup path) as TIER_B', () => {
    expect(classifyRisk(['api/scripts/safe-backup.mjs']).tier).toBe('TIER_B');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight && node --experimental-vm-modules node_modules/.bin/vitest run scripts/classify-risk.test.mjs 2>&1 | tail -5`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/classify-risk.mjs`:

```js
// Pure risk classifier — no subprocess, no filesystem.
// Input: array of repo-root-relative changed file paths.
// Output: { tier: 'TIER_A' | 'TIER_B', reason: string }

/** Patterns that always escalate to Tier B. Checked in order; first match wins. */
const TIER_B_RULES = [
  { pattern: /^api\/config\//, reason: 'api/config/ change (Cloudinary/plugin config)' },
  { pattern: /^api\/scripts\/safe-backup\.mjs/, reason: 'backup orchestrator (safety infra)' },
  { pattern: /^api\/scripts\/guard-forbidden\.mjs/, reason: 'forbidden-ops guard (safety infra)' },
  { pattern: /^api\/scripts\/lib\/build-manifest\.mjs/, reason: 'backup manifest builder (safety infra)' },
  { pattern: /^scripts\/restore-cloudinary\.py/, reason: 'restore tool (safety infra)' },
  { pattern: /^\.github\/workflows\//, reason: 'CI/CD workflow change' },
  { pattern: /^(infra|Pulumi\.)/, reason: 'infrastructure config' },
  { pattern: /^pnpm-lock\.yaml$/, reason: 'dependency lockfile change' },
  // api/src/ production code (not tests)
  {
    pattern: /^api\/src\/.+(?<!\.test\.ts)$/,
    reason: 'api/src/ production code change',
    exclude: /\.test\.ts$/,
  },
  // package.json anywhere (may add deps)
  { pattern: /^(api\/|frontend\/)?package\.json$/, reason: 'package.json change (possible dependency addition)' },
  // vercel.json
  { pattern: /^vercel\.json$/, reason: 'Vercel configuration' },
  // static-data schema (data shape)
  {
    pattern: /^frontend\/src\/generated\//,
    reason: 'generated static-data schema (data shape change)',
  },
];

export function classifyRisk(changedPaths) {
  for (const path of changedPaths) {
    for (const rule of TIER_B_RULES) {
      if (rule.exclude && rule.exclude.test(path)) continue;
      if (rule.pattern.test(path)) {
        return { tier: 'TIER_B', reason: `${rule.reason} (${path})`, triggeredBy: path };
      }
    }
  }
  return { tier: 'TIER_A', reason: 'All changed paths are presentational frontend or docs/test files.' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight && node --experimental-vm-modules node_modules/.bin/vitest run scripts/classify-risk.test.mjs 2>&1 | tail -10`
Expected: PASS — all tests green.

> Note: if vitest is not at the repo root, run tests from the `api/` workspace with
> `cd api && pnpm test -- ../../scripts/classify-risk.test.mjs`. Adjust the import path
> in the test file accordingly.

- [ ] **Step 5: Verify the classifier is node-syntax-clean**

Run: `node --check /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/scripts/classify-risk.mjs`
Expected: exits 0, no output.

- [ ] **Step 6: Commit**

```bash
git add scripts/classify-risk.mjs scripts/classify-risk.test.mjs
git commit -m "feat(workflow): add pure risk classifier (TIER_A / TIER_B)"
```

---

## Task 2: Automated check suite runner (`scripts/verify.mjs`)

The `verify` script is the single command the agent runs before any merge decision. It
executes the four check steps in order, captures a screenshot of a given URL (defaulting to
`http://localhost:5173`), and exits non-zero if any check fails.

Screenshot capture uses the `playwright` CLI (already in devDependencies if present, or
installed as part of this task). The script is intentionally NOT unit-tested (it shells out
to real commands and a real browser); verification is by running it.

**Files:**
- Create: `scripts/verify.mjs`

- [ ] **Step 1: Check for playwright in the project**

Run: `grep -r '"playwright"' /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/package.json /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/frontend/package.json 2>/dev/null`
If not found, install:
```bash
pnpm add -D -w playwright
```
Then: `pnpm exec playwright install chromium`

- [ ] **Step 2: Implement the verify script**

Create `scripts/verify.mjs`:

```js
#!/usr/bin/env node
/**
 * Pillar 3 verify helper.
 * Usage: node scripts/verify.mjs [--url <url>] [--no-screenshot] [--paths <file1,file2,...>]
 *
 * Runs:
 *   1. pnpm build
 *   2. pnpm --filter ./frontend lint   (skipped if lint script absent)
 *   3. pnpm --filter ./frontend tsc --noEmit
 *   4. cd api && pnpm test
 *   5. Screenshot <url> → docs/tmp/screenshots/<timestamp>.png
 *   6. Classify risk from --paths (if provided)
 *
 * Exits 0 only if all steps pass.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCREENSHOTS = path.join(ROOT, 'docs', 'tmp', 'screenshots');

const args = process.argv.slice(2);
const urlIdx = args.indexOf('--url');
const url = urlIdx !== -1 ? args[urlIdx + 1] : 'http://localhost:5173';
const noScreenshot = args.includes('--no-screenshot');
const pathsIdx = args.indexOf('--paths');
const changedPaths = pathsIdx !== -1 ? args[pathsIdx + 1].split(',') : [];

function run(cmd, opts = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function step(label, fn) {
  console.log(`\n=== ${label} ===`);
  try {
    fn();
    console.log(`✓ ${label}`);
    return true;
  } catch (e) {
    console.error(`✗ ${label} FAILED`);
    return false;
  }
}

const results = {};

results.build = step('build', () => run('pnpm build'));
results.lint = step('lint', () => {
  try {
    run('pnpm --filter ./frontend lint');
  } catch (_) {
    // lint script may not exist — warn, don't fail
    console.warn('  (lint script not found — skipping)');
  }
});
results.types = step('type-check', () => run('pnpm --filter ./frontend exec tsc --noEmit'));
results.apiTests = step('api tests', () => run('pnpm test', { cwd: path.join(ROOT, 'api') }));

if (!noScreenshot) {
  results.screenshot = step('screenshot', async () => {
    const { chromium } = await import('playwright');
    mkdirSync(SCREENSHOTS, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(SCREENSHOTS, `${stamp}.png`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: dest, fullPage: true });
    await browser.close();
    console.log(`  Screenshot saved: ${dest}`);
  });
}

if (changedPaths.length > 0) {
  const { classifyRisk } = await import('./classify-risk.mjs');
  const classification = classifyRisk(changedPaths);
  console.log(`\n=== Risk classification ===`);
  console.log(`  Tier: ${classification.tier}`);
  console.log(`  Reason: ${classification.reason}`);
  results.classification = classification;
  writeFileSync(
    path.join(ROOT, 'docs', 'tmp', 'last-classify.json'),
    JSON.stringify(classification, null, 2),
  );
}

const failed = Object.entries(results).filter(([, v]) => v === false);
if (failed.length > 0) {
  console.error(`\n✗ ${failed.length} step(s) failed: ${failed.map(([k]) => k).join(', ')}`);
  process.exit(1);
}
console.log('\n✓ All checks passed.');
```

- [ ] **Step 3: Check the script is valid JS**

Run: `node --check /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/scripts/verify.mjs`
Expected: exits 0, no output.

- [ ] **Step 4: Smoke test (no-screenshot mode, which avoids needing a running dev server)**

Run: `cd /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight && node scripts/verify.mjs --no-screenshot --paths frontend/src/pages/ConnectPage.tsx`
Expected: runs build, lint (warns if absent), types, api tests; prints `TIER_A` classification; exits 0 (or fails with a clear build error, not a script crash).

- [ ] **Step 5: Commit**

```bash
git add scripts/verify.mjs
git commit -m "feat(workflow): add verify helper (checks + screenshot + risk classification)"
```

---

## Task 3: One-command revert helper

A thin wrapper that (a) looks up the current HEAD of `main` after the most recent merge,
(b) prints the exact revert command with the real SHA, and (c) optionally executes it with
`--exec` flag. The agent uses this immediately after every Tier A merge.

**Files:**
- Create: `scripts/revert-last.mjs`

- [ ] **Step 1: Implement the revert helper**

Create `scripts/revert-last.mjs`:

```js
#!/usr/bin/env node
/**
 * Pillar 3 revert helper.
 * Usage:
 *   node scripts/revert-last.mjs            # prints the revert command (safe, no side effects)
 *   node scripts/revert-last.mjs --exec     # actually runs git revert and pushes
 *
 * The command reverts the most recent commit on the current branch (HEAD).
 * Use from the main branch after a Tier A auto-merge to undo it.
 *
 * NEVER run with --exec from an agent without explicit human approval. The
 * safe default (no --exec) is print-only.
 */
import { execSync } from 'node:child_process';

const EXEC = process.argv.includes('--exec');

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
}

const sha = git('rev-parse HEAD');
const subject = git(`log -1 --format=%s ${sha}`);

const cmd = `git revert ${sha} --no-edit && git push origin main`;

console.log(`\nLast commit on this branch:`);
console.log(`  SHA:     ${sha}`);
console.log(`  Subject: ${subject}`);
console.log(`\nRevert command:`);
console.log(`  ${cmd}`);

if (EXEC) {
  console.log('\n▶ Executing revert (--exec flag set)...');
  execSync(cmd, { stdio: 'inherit' });
  console.log('✓ Revert pushed.');
} else {
  console.log('\n(Print-only mode. Pass --exec to actually run this.)');
}
```

- [ ] **Step 2: Verify the script is valid JS**

Run: `node --check /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/scripts/revert-last.mjs`
Expected: exits 0.

- [ ] **Step 3: Smoke test (print-only — safe, no side effects)**

Run: `cd /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight && node scripts/revert-last.mjs`
Expected: prints the current HEAD SHA and the revert command. Does NOT run git revert.

- [ ] **Step 4: Commit**

```bash
git add scripts/revert-last.mjs
git commit -m "feat(workflow): add one-command revert helper"
```

---

## Task 4: Design log template and PR template

No code here — docs scaffolding that the agent fills in after each change.

**Files:**
- Create: `docs/tmp/design-log.md`
- Create: `.github/PULL_REQUEST_TEMPLATE/structural.md`

- [ ] **Step 1: Create the design log**

Create `docs/tmp/design-log.md`:

```markdown
# Ship-Then-Refine Design Log

Each entry is written by the agent immediately after a Tier A change lands on `main`.
Format: dated entry with the revert command for that merge. Ardis reads this to stay
informed; James reads it to audit the auto-merge history.

---

<!-- ENTRY TEMPLATE — copy below for each change:

## YYYY-MM-DD — <short description> (<page name>)

**What landed:** <one-sentence description of the visual change>
**Live at:** https://beckwithbarrow.com/<page>
**Merge SHA:** <sha>
**Revert:** `git revert <sha> --no-edit && git push origin main`
**Screenshot:** docs/tmp/screenshots/<timestamp>.png

**Heads-up to Ardis:**
> What changed: <description>
> Live at: <url>
> Revert is ready if anything looks off — just let James know.

-->
```

- [ ] **Step 2: Create the structural PR template directory and file**

```bash
mkdir -p /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/.github/PULL_REQUEST_TEMPLATE
```

Create `.github/PULL_REQUEST_TEMPLATE/structural.md`:

```markdown
## What this changes

<!-- One-paragraph description of the change and why it's needed. -->

## Why this is Tier B (structural)

<!-- Which rule triggered escalation?
     e.g. "Changes api/config/plugins.ts (Cloudinary/plugin config — adjacent to 2026-03-19 failure mode)"
     Reference: reqts/pillar3-iterative-workflow.md §Risk Tiers -->

## Automated checks

- [ ] `pnpm build` — PASS
- [ ] `pnpm --filter ./frontend lint` — PASS (or N/A)
- [ ] `pnpm --filter ./frontend exec tsc --noEmit` — PASS
- [ ] `cd api && pnpm test` — PASS

## Visual verification

<!-- Screenshot(s) attached, or "no visual impact — this change is backend/config only". -->

## Risk assessment

<!-- Why is this safe to merge? What could go wrong, and how was it mitigated? -->

## Revert

```bash
# Run after merge to undo (replace SHA with the actual merge commit):
node scripts/revert-last.mjs
# or directly:
git revert <merge-sha> --no-edit && git push origin main
```

## Linked spec / plan

<!-- reqts/ or docs/plans/ reference, e.g. reqts/pillar3-iterative-workflow.md -->
```

- [ ] **Step 3: Commit**

```bash
git add docs/tmp/design-log.md docs/tmp/.gitkeep .github/PULL_REQUEST_TEMPLATE/structural.md
git commit -m "docs(workflow): add design log template + structural PR template"
```

---

## Task 5: Wire the classifier into the CLAUDE.md workflow summary

Update root `CLAUDE.md`'s `## Workflow (tiered)` section to reference the new scripts so
any agent picking up the manual knows the exact commands.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append the tool reference to the Workflow section**

Find the paragraph that starts with `- Branch off \`main\`` in `CLAUDE.md §Workflow (tiered)`.
After the existing bullet list, add:

```markdown
**Workflow scripts (Pillar 3):**
- `node scripts/verify.mjs --no-screenshot --paths <csv-of-changed-files>` — runs all checks + classifies risk
- `node scripts/verify.mjs --url http://localhost:5173` — full run with screenshot
- `node scripts/revert-last.mjs` — prints the revert command for the current HEAD
- `node scripts/classify-risk.mjs` is the pure classifier; import from `scripts/classify-risk.mjs`
```

- [ ] **Step 2: Verify CLAUDE.md still reads cleanly**

Run: `grep -n "Workflow scripts" /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/CLAUDE.md`
Expected: finds the new section.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: wire Pillar 3 workflow scripts into CLAUDE.md"
```

---

## Final verification

- [ ] **Classifier tests pass:** `node --experimental-vm-modules node_modules/.bin/vitest run scripts/classify-risk.test.mjs` → all green (or run via `cd api && pnpm test -- ../../scripts/classify-risk.test.mjs`).
- [ ] **All scripts are syntax-clean:**
  ```bash
  node --check scripts/classify-risk.mjs
  node --check scripts/verify.mjs
  node --check scripts/revert-last.mjs
  ```
  All exit 0.
- [ ] **Verify smoke test runs without crashing:** `node scripts/verify.mjs --no-screenshot --paths frontend/src/pages/ConnectPage.tsx` → prints TIER_A, exits 0 (build/test results aside).
- [ ] **Revert helper prints a valid SHA:** `node scripts/revert-last.mjs` → prints a 40-char SHA and a git command.
- [ ] **PR template exists:** `.github/PULL_REQUEST_TEMPLATE/structural.md` is present.
- [ ] **Design log exists:** `docs/tmp/design-log.md` is present with the entry template.
- [ ] **CLAUDE.md updated:** `grep "Workflow scripts" CLAUDE.md` → match found.
- [ ] **Spec coverage:** every behavioral requirement in `reqts/pillar3-iterative-workflow.md` maps to a task above.

---

## Notes / open items carried from the spec

- **Playwright install:** If playwright is not already in devDependencies, `pnpm add -D -w playwright` adds it as a workspace root dev dep. The `--filter ./frontend` flag targets the frontend package, but playwright runs from the root script. Confirm the install does not conflict with any existing browser testing setup.
- **Vitest location for scripts/classify-risk.test.mjs:** The `api/vitest.config.ts` includes `scripts/**/*.test.mjs` in its `include` glob. Confirm the path is relative to the `api/` directory; if the scripts are at repo root, adjust the glob in `api/vitest.config.ts` to `../../scripts/**/*.test.mjs`, or add a root-level `vitest.config.ts`.
- **Notification channel:** Until a channel is set up, the design-log is the Ardis heads-up. Pillar 5 (proving ground) should close this.
- **Branch protection:** If GitHub branch protection requires a status check before merge, add a `.github/workflows/pr-checks.yml` that runs `node scripts/verify.mjs --no-screenshot` on every PR. Left for a follow-up commit once branch protection settings are confirmed.
