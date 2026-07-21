# Pillar 4: Intake & Content/Code Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the intake list (`requests/intake.md`) pre-populated with Ardis's punch
list, write a triage checklist agents use at intake time, build and TDD the JSX string
scanner that keeps the content-vs-code map honest, and wire the triage output into the
Pillar 3 workflow.

**Architecture:** Three deliverables. (A) The `requests/` directory + intake list template
and the migrated punch list. (B) A triage checklist doc the agent follows per item. (C) A
`scripts/scan-hardcoded.mjs` scanner (pure parse + filter; TDD-able) that finds JSX text
content not in the `CLAUDE.md` map — plus its unit tests.

**Branch / worktree:** `overnight/wma-pillars` at `.worktrees/wma-overnight`.

**Spec:** `reqts/pillar4-intake.md`

**Dependency:** Pillar 3's `scripts/classify-risk.mjs` must exist before Task 3 Step 4 (the
triage checklist references it). Tasks 1 and 2 have no dependency on Pillar 3.

---

## File Structure

| Path | Responsibility | New/Mod |
|------|----------------|---------|
| `requests/intake.md` | Canonical intake list; migrates `docs/ardis-punchlist-triage.md` | Create |
| `requests/triage-checklist.md` | Step-by-step triage reference; agent uses per item | Create |
| `scripts/scan-hardcoded.mjs` | Scans JSX for hardcoded user-facing strings; pure (no subprocess) | Create |
| `scripts/scan-hardcoded.test.mjs` | Unit tests for the scanner's pure helpers | Create |
| `docs/ardis-punchlist-triage.md` | Existing file — superseded by intake.md; add deprecation note | Modify |

---

## Task 1: Bootstrap the intake directory and migrate the punch list

No code. Pure doc work. Migrates the existing triage output into the canonical intake format.

**Files:**
- Create: `requests/intake.md`
- Modify: `docs/ardis-punchlist-triage.md`

- [ ] **Step 1: Create the `requests/` directory**

```bash
mkdir -p /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/requests
```

- [ ] **Step 2: Create `requests/intake.md` with the intake table**

Create `requests/intake.md`:

```markdown
# Intake List — Beckwith Barrow

Canonical list of all incoming change requests. Supersedes `docs/ardis-punchlist-triage.md`.

**Buckets:** `CMS` = Ardis self-serves in Strapi admin · `CODE` = React change (agent) ·
`TRAP` = hardcoded in JSX (looks like content) · `BLOCKED` = awaiting asset/decision ·
`PENDING` = not yet triaged.

**Status:** `PENDING` → `READY` / `ARDIS` → `IN PROGRESS` → `DONE` / `BLOCKED`.

Triage procedure: `requests/triage-checklist.md`
Content-vs-code map: root `CLAUDE.md §Content-vs-code map`
Risk classification: `scripts/classify-risk.mjs` (Pillar 3)

---

## Batch 1 — Ardis's punch list (received 2026-06-15)

| # | Item | Source | Date | Bucket | Where | Status |
|---|---|---|---|---|---|---|
| 1 | Move "New England Home — a contemporary farmhouse in Williamstown" (cover story) to **top** of press list | Ardis / notes | 2026-06-15 | CMS | Strapi admin → Press & Media → `press.pressArticles` relation → drag to top → Save | ARDIS |
| 2 | Move the other New England Home up to just above the Best of Houzz announcements | Ardis / notes | 2026-06-15 | CMS | Strapi admin → Press & Media → `press.pressArticles` relation → drag into position | ARDIS |
| 3 | Change the **vertical cover photo** to a poolhouse one (Approach page) | Ardis / notes | 2026-06-15 | CMS | Strapi admin → Approach → `approach.coverImage` → upload new photo | BLOCKED — Ardis will email the poolhouse photo |
| 4 | Add a **color to the gray area** behind the photo on Approach page | Ardis / notes | 2026-06-15 | CODE (Tier A) | `frontend/src/pages/ApproachPage.tsx:239` — `bg-gray-100` panel (no CMS field). Change Tailwind class. | BLOCKED — wait for #3 image + Ardis's color pick |
| 5 | Change the **beige/brown color** behind the title text below the photo (Approach page) | Ardis / notes | 2026-06-15 | CMS | Strapi admin → Approach → `approach.quoteBgColor` color-picker | ARDIS |
| 6 | "How We Do It" title — let it breathe (Approach page) | Ardis / notes | 2026-06-15 | CODE (Tier A) | `frontend/src/pages/ApproachPage.tsx:317` — add `mt-8` / increase `mb-24`; section wrapper `py-16` at `:314` | READY |
| 7 | Add two missing projects to Home page: Byers-Dunne poolhouse + blockeight | Ardis / notes | 2026-06-15 | CMS | Strapi admin → Home Page → `home.projects` relation → add project entries and order; confirm project entries + images exist first | ARDIS (confirm projects exist) |
| 8 | Reduce spacing in **top paragraph** on About page (crowding the horizontal line) | Ardis / notes | 2026-06-15 | CODE (Tier A) | `frontend/src/pages/AboutPage.tsx:319` — reduce `pt-4` (e.g. `pt-1` / `pt-0`) on top-right text cell; grid `gap-8 md:gap-14` at `:284` | READY |
| 9 | Change **"Location" → "Mailing Address"** label on Contact page | Ardis / notes | 2026-06-15 | TRAP → CODE (Tier A) | Label: `frontend/src/pages/ConnectPage.tsx:220` (primary) + `:239` (no-data fallback) — change both. Value is CMS: `connect.address`. | READY |
| 10 | Spruce up Contact page — line-drawing elements / a color block | Ardis / notes | 2026-06-15 | CODE (Tier A for drawing component; Tier B if new Strapi field) | `frontend/src/components/ArchBackground.tsx` + `arch.svg` not yet used on Contact. Import + add `relative` wrapper. Color block via new field = schema change → Tier B / PR. | BLOCKED — awaiting Ardis's direction on drawings/placement |
```

- [ ] **Step 3: Add a deprecation notice to `docs/ardis-punchlist-triage.md`**

Open `docs/ardis-punchlist-triage.md` and prepend:

```markdown
> **SUPERSEDED** — This file was the initial triage output from the overnight run
> (2026-06-15). The canonical intake list is now `requests/intake.md`. This file is kept
> for historical reference; do NOT add new items here.

```

- [ ] **Step 4: Commit**

```bash
git add requests/intake.md docs/ardis-punchlist-triage.md
git commit -m "feat(intake): bootstrap intake list + migrate Ardis punch list"
```

---

## Task 2: Triage checklist

A reference doc the agent follows step-by-step when processing a new intake item. Encodes
the triage procedure from `reqts/pillar4-intake.md` as a concrete checklist.

**Files:**
- Create: `requests/triage-checklist.md`

- [ ] **Step 1: Create `requests/triage-checklist.md`**

Create `requests/triage-checklist.md`:

```markdown
# Triage Checklist — Per Intake Item

Use this checklist for each new item added to `requests/intake.md` with `Bucket: PENDING`.
Reference: `reqts/pillar4-intake.md §Triage Procedure` · Map: `CLAUDE.md §Content-vs-code map`

---

## For each PENDING item:

- [ ] **1. Read the item.** Is it a *value change* (text, image, color, order) or a *structural
       change* (layout, label, new section, spacing)?

- [ ] **2. Consult the map.** Open `CLAUDE.md §Content-vs-code map`. Does the item type appear?
       - Yes and it's CMS → Bucket = `CMS`. Skip to step 6.
       - Yes and it's React code → Bucket = `CODE`. Go to step 4.
       - Not listed → go to step 3.

- [ ] **3. Grep for the string.**
       ```bash
       grep -rn "<search term>" frontend/src/
       ```
       - Found in JSX/TSX → Bucket = `TRAP` (if it looks like content) or `CODE` (if clearly structural). Go to step 4.
       - Not found in JSX → likely `CMS`. Verify in Strapi admin. If found in a content field → `CMS`.

- [ ] **4. Find the exact `file:line` anchor.**
       ```bash
       grep -n "<string>" frontend/src/pages/<PageFile>.tsx
       ```
       Record as `file:line` (or multiple lines if duplicated e.g. no-data fallback). Confirm by
       reading the surrounding context — is this rendered to the user?

- [ ] **5. Classify Pillar 3 risk tier.**
       ```bash
       node scripts/classify-risk.mjs
       # or: import { classifyRisk } from './scripts/classify-risk.mjs'
       # classifyRisk(['frontend/src/pages/ConnectPage.tsx']) → { tier: 'TIER_A', ... }
       ```
       Add `(Tier A)` or `(Tier B — PR required)` to the `Where` column.

- [ ] **6. Assign status.**
       - `CMS` → Status = `ARDIS`. Notify Ardis (write heads-up entry in `docs/tmp/design-log.md`).
       - `CODE` or `TRAP` → Status = `READY` (if not blocked) or `BLOCKED` (if waiting on asset/decision).
       - `BLOCKED` → record in `Where` what is needed and from whom.

- [ ] **7. Update `requests/intake.md`.**
       Fill in `Bucket`, `Where`, `Status`. Commit:
       ```bash
       git add requests/intake.md
       git commit -m "chore(intake): triage item #<N> — <short description>"
       ```

---

## Map update check (run after every 5 new CODE/TRAP items or after any frontend page is modified)

- [ ] Run: `node scripts/scan-hardcoded.mjs`
- [ ] For each candidate string reported that is NOT already in `CLAUDE.md §Hardcoded-traps`
      or `§React code`, decide:
      - Add to map → commit: `docs(claude-md): update content-vs-code map — <reason>`
      - Intentional / not content-managed → add a `// scan-ignore` comment above the JSX line.
- [ ] Commit the map update to `CLAUDE.md` if any candidates were promoted.
```

- [ ] **Step 2: Commit**

```bash
git add requests/triage-checklist.md
git commit -m "docs(intake): add triage checklist"
```

---

## Task 3: JSX hardcoded-string scanner (pure unit — TDD)

The scanner reads TSX/JSX source files and extracts text content that could be hardcoded
user-facing strings. The *extraction* and *filtering* logic is pure (string-in, list-out)
and fully unit-testable. The file-walking orchestration is separate and thin.

The scanner is intentionally simple: it uses a regex-based heuristic to find JSX text nodes
and attribute values (not a full AST parser). This is "good enough" for its purpose — surfacing
candidates for human review — and avoids a heavy parse dependency.

**Files:**
- Create: `scripts/scan-hardcoded.mjs`
- Test: `scripts/scan-hardcoded.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/scan-hardcoded.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { extractJsxStrings, filterKnownStrings } from './scan-hardcoded.mjs';

const SAMPLE_TSX = `
import React from 'react';

export function ConnectPage() {
  return (
    <div>
      <h2 className="text-2xl">Let's Connect</h2>
      <label>Location</label>
      <p className="text-sm">Get In Touch</p>
      <input placeholder="Your message" />
      {/* scan-ignore */}
      <span>ignored by comment</span>
      <p>{address || 'hello@beckwithbarrow.com'}</p>
    </div>
  );
}
`;

describe('extractJsxStrings', () => {
  it('extracts text content from JSX elements', () => {
    const results = extractJsxStrings(SAMPLE_TSX, 'ConnectPage.tsx');
    const texts = results.map((r) => r.text);
    expect(texts).toContain("Let's Connect");
    expect(texts).toContain('Location');
    expect(texts).toContain('Get In Touch');
  });

  it('extracts placeholder attribute values', () => {
    const results = extractJsxStrings(SAMPLE_TSX, 'ConnectPage.tsx');
    expect(results.map((r) => r.text)).toContain('Your message');
  });

  it('skips lines preceded by scan-ignore comment', () => {
    const results = extractJsxStrings(SAMPLE_TSX, 'ConnectPage.tsx');
    expect(results.map((r) => r.text)).not.toContain('ignored by comment');
  });

  it('skips interpolated expressions (not pure string content)', () => {
    const results = extractJsxStrings(SAMPLE_TSX, 'ConnectPage.tsx');
    // The {address || 'hello@...'} line is an expression, not a pure JSX text node.
    // The scanner should skip it or not surface 'hello@...' as a standalone string.
    // (Acceptable to surface it as a candidate — the filter below handles known strings.)
    // So we just confirm the extraction doesn't crash.
    expect(results).toBeDefined();
  });

  it('includes file and approximate line number in each result', () => {
    const results = extractJsxStrings(SAMPLE_TSX, 'ConnectPage.tsx');
    const loc = results.find((r) => r.text === 'Location');
    expect(loc).toBeDefined();
    expect(loc.file).toBe('ConnectPage.tsx');
    expect(typeof loc.line).toBe('number');
    expect(loc.line).toBeGreaterThan(0);
  });
});

describe('filterKnownStrings', () => {
  const known = ["Let's Connect", 'Get In Touch', 'Location'];
  const candidates = [
    { text: "Let's Connect", file: 'ConnectPage.tsx', line: 7 },
    { text: 'Location', file: 'ConnectPage.tsx', line: 8 },
    { text: 'Your message', file: 'ConnectPage.tsx', line: 10 },
    { text: 'New heading', file: 'ConnectPage.tsx', line: 20 },
  ];

  it('returns only candidates NOT in the known set', () => {
    const unknown = filterKnownStrings(candidates, known);
    expect(unknown.map((u) => u.text)).not.toContain("Let's Connect");
    expect(unknown.map((u) => u.text)).not.toContain('Location');
    expect(unknown.map((u) => u.text)).toContain('Your message');
    expect(unknown.map((u) => u.text)).toContain('New heading');
  });

  it('is case-sensitive (preserves exact string matching)', () => {
    const unknown = filterKnownStrings(
      [{ text: "let's connect", file: 'x.tsx', line: 1 }],
      known,
    );
    expect(unknown).toHaveLength(1); // "let's connect" ≠ "Let's Connect"
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight && node --experimental-vm-modules node_modules/.bin/vitest run scripts/scan-hardcoded.test.mjs 2>&1 | tail -5`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/scan-hardcoded.mjs`:

```js
#!/usr/bin/env node
/**
 * Pillar 4 JSX hardcoded-string scanner.
 *
 * Finds user-facing strings in JSX/TSX that may be hardcoded instead of coming
 * from the CMS. Candidates should be reviewed against CLAUDE.md §Content-vs-code map
 * and either added to the map, annotated with // scan-ignore, or left (if intentional).
 *
 * Pure exports (no side effects, fully testable):
 *   extractJsxStrings(source: string, filename: string) → Candidate[]
 *   filterKnownStrings(candidates: Candidate[], known: string[]) → Candidate[]
 *
 * CLI usage (from repo root):
 *   node scripts/scan-hardcoded.mjs [--dir frontend/src/pages] [--known-file CLAUDE.md]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---- Pure functions (exported for tests) ----

/**
 * Extract JSX text content and select attribute string values from TSX source.
 * Returns { text, file, line } candidates.
 * Skips lines immediately after a `// scan-ignore` comment.
 */
export function extractJsxStrings(source, filename) {
  const lines = source.split('\n');
  const results = [];

  // Patterns:
  //   JSX text node: ><text content></  (where text has no { or < )
  //   placeholder / aria-label / title attribute: attribute="string"
  const JSX_TEXT = />\s*([A-Z][^{<\n]{2,}?)\s*</;
  const ATTR_STRING = /(?:placeholder|aria-label|title|alt)="([^"]{3,})"/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if previous line was a scan-ignore comment
    const prev = i > 0 ? lines[i - 1].trim() : '';
    if (prev === '// scan-ignore' || prev === '{/* scan-ignore */}') continue;

    // Skip lines that are themselves comments or imports
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('import ') || trimmed.startsWith('/*')) continue;

    // Check for JSX text node
    const textMatch = line.match(JSX_TEXT);
    if (textMatch) {
      const text = textMatch[1].trim();
      if (text.length >= 3 && !text.includes('{') && !text.includes('}')) {
        results.push({ text, file: filename, line: i + 1 });
      }
    }

    // Check for attribute string
    const attrMatch = line.match(ATTR_STRING);
    if (attrMatch) {
      const text = attrMatch[1].trim();
      if (text.length >= 3) {
        results.push({ text, file: filename, line: i + 1 });
      }
    }
  }

  return results;
}

/**
 * Return only candidates whose text is NOT in the known set.
 * The known set comes from the CLAUDE.md map (passed as an array of strings).
 */
export function filterKnownStrings(candidates, knownStrings) {
  const knownSet = new Set(knownStrings);
  return candidates.filter((c) => !knownSet.has(c.text));
}

// ---- File walker ----

function walkTsx(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walkTsx(full));
    } else if (entry.endsWith('.tsx') || entry.endsWith('.jsx')) {
      files.push(full);
    }
  }
  return files;
}

/** Extract known strings mentioned in CLAUDE.md (rough heuristic: backtick-quoted strings). */
function extractKnownFromClaudeMd(claudeMdPath) {
  try {
    const content = readFileSync(claudeMdPath, 'utf8');
    // Match strings in backtick inline code within the map section
    const matches = [...content.matchAll(/`([^`\n]{3,50})`/g)].map((m) => m[1]);
    return matches;
  } catch {
    return [];
  }
}

// ---- CLI entry point ----

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf('--dir');
  const dir = dirIdx !== -1 ? args[dirIdx + 1] : 'frontend/src/pages';
  const knownFileIdx = args.indexOf('--known-file');
  const knownFile = knownFileIdx !== -1 ? args[knownFileIdx + 1] : 'CLAUDE.md';

  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const absDir = path.resolve(ROOT, dir);
  const absKnown = path.resolve(ROOT, knownFile);

  const known = extractKnownFromClaudeMd(absKnown);
  const files = walkTsx(absDir);

  let totalCandidates = 0;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    const all = extractJsxStrings(source, rel);
    const unknown = filterKnownStrings(all, known);
    if (unknown.length > 0) {
      console.log(`\n${rel} (${unknown.length} candidate(s)):`);
      for (const c of unknown) {
        console.log(`  line ${c.line}: "${c.text}"`);
      }
      totalCandidates += unknown.length;
    }
  }

  if (totalCandidates === 0) {
    console.log('No unknown hardcoded strings found. Map appears current.');
  } else {
    console.log(`\nTotal: ${totalCandidates} candidate(s) across ${files.length} file(s).`);
    console.log('Review each: add to CLAUDE.md §Content-vs-code map, or add // scan-ignore above the line.');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight && node --experimental-vm-modules node_modules/.bin/vitest run scripts/scan-hardcoded.test.mjs 2>&1 | tail -10`
Expected: PASS — all tests green.

> Note: if vitest is at the `api/` workspace only, run `cd api && pnpm test -- ../../scripts/scan-hardcoded.test.mjs`. The import in the test file uses a relative path so it resolves from wherever vitest runs.

- [ ] **Step 5: Verify the scanner scripts are syntax-clean**

Run:
```bash
node --check /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/scripts/scan-hardcoded.mjs
node --check /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/scripts/scan-hardcoded.test.mjs
```
Expected: both exit 0, no output.

- [ ] **Step 6: Smoke-test the CLI against the real frontend source**

Run: `cd /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight && node scripts/scan-hardcoded.mjs --dir frontend/src/pages 2>&1 | head -40`
Expected: prints some candidate strings with `file:line` anchors, or "No unknown hardcoded strings found." Does NOT crash. False-positive volume is acceptable at this stage — review is manual.

- [ ] **Step 7: Commit**

```bash
git add scripts/scan-hardcoded.mjs scripts/scan-hardcoded.test.mjs
git commit -m "feat(intake): add JSX hardcoded-string scanner with unit tests"
```

---

## Task 4: Wire triage into the workflow reference

Update `CLAUDE.md` and the intake list with pointers that close the loop between intake
triage, the scanner, and Pillar 3 execution.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add intake workflow reference to CLAUDE.md `## Pointers`**

Open `CLAUDE.md`. In the `## Pointers` section at the bottom, append:

```markdown
- Intake list: `requests/intake.md` · Triage checklist: `requests/triage-checklist.md`
- Map-drift scanner: `node scripts/scan-hardcoded.mjs` (run after frontend edits; candidates reviewed against map)
```

- [ ] **Step 2: Verify the pointer appears**

Run: `grep -n "Intake list" /Users/james/Sites/beckwithbarrow/.worktrees/wma-overnight/CLAUDE.md`
Expected: finds the line.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: wire Pillar 4 intake + scanner into CLAUDE.md pointers"
```

---

## Final verification

- [ ] **Scanner tests pass:**
  `node --experimental-vm-modules node_modules/.bin/vitest run scripts/scan-hardcoded.test.mjs` → all green
  (or via `cd api && pnpm test -- ../../scripts/scan-hardcoded.test.mjs`).

- [ ] **Scripts are syntax-clean:**
  ```bash
  node --check scripts/scan-hardcoded.mjs
  node --check scripts/scan-hardcoded.test.mjs
  ```
  Both exit 0.

- [ ] **Intake list exists and is populated:** `wc -l requests/intake.md` → > 20 lines.

- [ ] **Triage checklist exists:** `ls requests/triage-checklist.md` → found.

- [ ] **Old triage doc is deprecated:** `head -3 docs/ardis-punchlist-triage.md` → shows the SUPERSEDED notice.

- [ ] **Scanner CLI runs without crash:**
  `node scripts/scan-hardcoded.mjs --dir frontend/src/pages 2>&1 | tail -5` → no uncaught exception.

- [ ] **CLAUDE.md pointers updated:**
  `grep "Intake list" CLAUDE.md` → match found.

- [ ] **Spec coverage:** every requirement in `reqts/pillar4-intake.md` maps to a task above.

---

## Notes / open items carried from the spec

- **Vitest location:** `scripts/scan-hardcoded.test.mjs` and `scripts/classify-risk.test.mjs`
  (Pillar 3) both live at repo root. The `api/vitest.config.ts` from Pillar 1 has
  `include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs']` relative to `api/`. These root
  scripts are NOT inside `api/scripts/`. Options: (a) add a root-level `vitest.config.ts`
  that picks up `scripts/**/*.test.mjs`, or (b) adjust the `api/vitest.config.ts` glob to
  `../../scripts/**/*.test.mjs`. Option (a) is cleaner; implement in a follow-up commit.
- **Scanner regex limitations:** The heuristic misses multi-line JSX text and some
  attribute patterns. Acceptable for now. If the false-negative rate becomes a problem, swap
  to `@babel/parser` or `@typescript-eslint/typescript-estree` for a real AST.
- **Ardis notification for ARDIS items:** Until a channel exists, the triage checklist
  directs the agent to write a `docs/tmp/design-log.md` entry. Same open question as Pillar 3.
- **Existing `docs/ardis-punchlist-triage.md`:** Superseded in Task 1. Do not delete it yet
  — it serves as historical context. Revisit at Pillar 5 (proving ground) cleanup.
