# Feature: Pillar 4 — Intake & Content/Code Map

**Branch:** overnight/wma-pillars
**Created:** 2026-06-15
**Status:** Design approved — pending implementation
**Spec parent:** `reqts/website-management-agent.md`

## Problem

Two failure modes happen without a managed intake process:

1. **Requests get lost or duplicated.** Ardis sends a note, an email, or mentions something
   verbally. The agent or James picks it up once, forgets another occurrence, or double-works
   it. There is no single canonical list of what has been asked, triaged, and executed.

2. **Requests land in the wrong bucket.** Without the content-vs-code map applied *at intake*,
   the agent writes code to fix something that belongs in the Strapi admin, or tells Ardis
   to update the CMS for something that is actually hardcoded in JSX. The `docs/ardis-punchlist-triage.md`
   file (created during the overnight run) demonstrates this is a real problem — items #5
   and #9 are adjacent-looking changes that live in entirely different systems.

3. **The map goes stale.** As the frontend evolves, new hardcoded strings appear, CMS fields
   get added or renamed, and the content-vs-code map in `CLAUDE.md` drifts from reality. Nobody
   is responsible for keeping it current, so eventually the agent classifies requests based
   on outdated information.

## Goals

- [ ] Define a single canonical location for the intake list: its path, its format, and how
      new items are added.
- [ ] Define the triage procedure: how each item is classified into `CMS`/`CODE`/`TRAP`/`BLOCKED`
      and linked to an exact `file:line` anchor where applicable.
- [ ] Define how the content-vs-code map in `CLAUDE.md` stays current as code evolves: a
      scanner that flags new hardcoded user-facing strings not yet in the map.
- [ ] Wire triage output into Pillar 3's risk-tier decision so the execution path is
      determined at intake, not at execution time.

## Non-Goals

- Not building a ticketing system, database, or external tool. The intake list is a markdown
  file in the repo, co-located with the code it describes.
- Not replacing Ardis's informal communication style. She sends notes; the agent converts
  them into intake items. The process must be zero-friction for her.
- Not automating CMS changes (Ardis self-serves in Strapi; intake only identifies *what* to
  do and *where*, not executes CMS work).
- Not scanning for all possible types of drift (e.g. unused CMS fields, schema mismatches).
  Scope is limited to new hardcoded user-facing strings in JSX.

---

## Intake List

### Location and rationale

**Path:** `requests/intake.md`

Rationale: A dedicated `requests/` directory (a) separates incoming work from completed
specs (`reqts/`) and implementation plans (`docs/plans/`), (b) is a natural place to add
future request artifacts (images Ardis emails, reference screenshots), and (c) avoids
cluttering `docs/` or the root. Reusing `todos.md` was considered but rejected — `todos.md`
is unstructured and ephemeral; the intake list needs stable anchors for the triage columns.

### Format

The intake list is a markdown file with one table per source/date batch. Each row is one
request item. The table MUST have these columns:

| # | Item | Source | Date | Bucket | Where | Status |
|---|---|---|---|---|---|---|

**Column definitions:**

- `#` — sequential integer; never reused (so historical references stay valid).
- `Item` — verbatim or lightly paraphrased from the source. What was asked.
- `Source` — who asked and via which channel (e.g. "Ardis / email", "James / conversation").
- `Date` — ISO date received (YYYY-MM-DD).
- `Bucket` — one of: `CMS` · `CODE` · `TRAP` · `BLOCKED` · `PENDING` (not yet triaged).
- `Where` — exact action location. For `CMS`: Strapi admin path + field name. For `CODE`:
  `file:line` anchor. For `TRAP`: both (the label is code, the value is CMS). For `BLOCKED`:
  what is needed before unblocking.
- `Status` — one of: `PENDING` · `READY` (triaged, waiting for execution) · `IN PROGRESS` ·
  `DONE` · `BLOCKED` · `ARDIS` (handed to Ardis for CMS self-serve).

**Example rows** (from `docs/ardis-punchlist-triage.md`):

| # | Item | Source | Date | Bucket | Where | Status |
|---|---|---|---|---|---|---|
| 1 | Move "New England Home" cover story to top of press list | Ardis / notes | 2026-06-15 | CMS | Strapi admin → Press & Media → pressArticles relation → drag to top | ARDIS |
| 9 | Change "Location" → "Mailing Address" on Contact page | Ardis / notes | 2026-06-15 | TRAP | Label: `ConnectPage.tsx:220,239` (code) / Value: `connect.address` (CMS) | READY |

### Adding new items

1. Agent (or James) adds a row to `requests/intake.md` with `Bucket: PENDING`.
2. Triage procedure (below) fills in Bucket and Where.
3. Status moves to `READY` or `ARDIS` once triaged.

---

## Triage Procedure

Triage is the act of classifying an intake item into a bucket and finding the exact `file:line`
or Strapi admin path where the change lives. It uses the content-vs-code map in `CLAUDE.md`
as the primary reference.

### Step-by-step

1. **Read the item.** Is it asking for a value change (text, image, color, order) or a
   structural change (layout, label, new section, spacing)?

2. **Consult the map.** Open `CLAUDE.md §Content-vs-code map`. If the item type is listed,
   apply the bucket directly. If not listed, proceed to step 3.

3. **Check for hardcoded-traps.** Search the frontend source for the string or element the
   item mentions:
   ```bash
   grep -rn "<search term>" frontend/src/
   ```
   If the string is found in JSX/TSX, it is a `TRAP` or `CODE` item, NOT `CMS`, regardless
   of how it looks.

4. **Assign the bucket:**
   - `CMS` — value lives in a Strapi content field. Ardis can change it in the admin.
   - `CODE` — presentational change in React. Agent handles it. Apply Pillar 3 risk tier.
   - `TRAP` — looks like content (a label, heading, or text) but is hardcoded in JSX. Agent
     changes the code. Document both the code location AND the corresponding CMS field (if
     any) so neither is forgotten.
   - `BLOCKED` — cannot be executed until an external asset or decision arrives (e.g. Ardis
     emails a photo, picks a color). Record what is needed.

5. **Find the `file:line` anchor.** For `CODE` and `TRAP` items: use `grep -n` to locate the
   exact line and record it as `file:line` in the `Where` column. For `CMS` items: record the
   Strapi admin navigation path and the field name (e.g. `Approach → quoteBgColor`).

6. **Apply Pillar 3 risk tier.** For `CODE` items: run `classifyRisk([file])` from
   `scripts/classify-risk.mjs` (or check the rule table in `reqts/pillar3-iterative-workflow.md`).
   If `TIER_B`, add a note in the `Where` column: "(Tier B — PR required)". If `TIER_A`,
   the item can auto-merge after checks.

7. **Update `requests/intake.md`:** fill in the `Bucket`, `Where`, and change `Status` to
   `READY` (agent executes) or `ARDIS` (CMS self-serve — hand to Ardis).

---

## Keeping the Map Current

The content-vs-code map in `CLAUDE.md` documents which strings live in JSX and which live in
the CMS. It drifts when developers add new hardcoded strings to components without updating
the map.

### Scanner: detecting new hardcoded user-facing strings

A small scanner (`scripts/scan-hardcoded.mjs`) looks for JSX text content and `aria-label`/
`placeholder` attribute values in `frontend/src/pages/` and `frontend/src/components/` that:
- are non-empty strings (not variables, not template literals with interpolation),
- appear in rendered output (i.e. inside JSX elements, not in comments or imports), and
- are NOT already listed in the `CLAUDE.md §Hardcoded-traps` or `§React code` sections.

The scanner output is a list of candidate strings with `file:line` anchors. Each candidate
is a prompt for a human (or the agent) to decide: add it to the map (as a trap or as code),
or mark it as intentional (e.g. aria-labels that will never be content-managed).

The scanner is run:
- **At triage time**, when a `CMS` classification seems wrong and a grep didn't find it.
- **As a periodic check** (Pillar 5 proving-ground or nightly), to catch drift.

The scanner does NOT auto-update `CLAUDE.md` — it only surfaces candidates for human/agent
review. Updates to the map are committed as conventional commit `docs(claude-md): update
content-vs-code map — <reason>`.

---

## Integration with Pillar 3

Triage does not just classify — it feeds Pillar 3's execution path:

- `CMS` → hand to Ardis (no agent code change). Update intake status to `ARDIS`.
- `CODE / TIER_A` → agent executes: branch → `node scripts/verify.mjs` → auto-merge →
  ship-then-refine log entry. Update intake to `IN PROGRESS` then `DONE`.
- `CODE / TIER_B` → agent executes: branch → verify → open PR using structural template →
  wait for James → update intake to `DONE` after merge.
- `TRAP` → same as `CODE`, but also verify the CMS field is correct (value in Strapi) and
  note both in the intake `Where` column.
- `BLOCKED` → intake stays `BLOCKED` until the asset/decision arrives; agent pings Ardis.

---

## Open Questions

- [ ] **Ardis notification for `ARDIS` items.** When an item is triaged as `CMS`, how does
      Ardis learn she needs to do something in the admin? Until a channel exists, the agent
      writes a note in `docs/tmp/design-log.md` in the same format as ship-then-refine.
      (Resolves with the notification channel question from Pillar 3.)
- [ ] **Intake source for verbal/informal requests.** Ardis's current notes were captured as
      a text block. Future requests may come via email, phone, or in person. The process for
      converting those to intake rows needs a defined owner (likely James, who converts them
      before or during the next agent session).
- [ ] **Scanner false-positive rate.** The JSX string scanner will surface many strings that
      are intentional code (button labels, aria-labels, error messages). How many is
      acceptable before the scanner becomes noise? A `scan-hardcoded.ignore` list (or inline
      `// scan-ignore` comment) may be needed.
- [ ] **Existing `docs/ardis-punchlist-triage.md`.** This file was created during the
      overnight run before the formal intake process existed. It should be migrated into
      `requests/intake.md` as part of Pillar 4 Task 1 (do not maintain two lists).

## References

- Content-vs-code map (canonical): root `CLAUDE.md §Content-vs-code map`
- Hardcoded-traps with `file:line`: `CLAUDE.md §Hardcoded-traps`
- Existing triage doc to migrate: `docs/ardis-punchlist-triage.md`
- Pillar 3 risk-tier rules: `reqts/pillar3-iterative-workflow.md §Risk Tiers`
- Risk classifier: `scripts/classify-risk.mjs` (Pillar 3)
- Pillar 3 workflow integration: `reqts/pillar3-iterative-workflow.md §Behavior / Per-Change Flow`
