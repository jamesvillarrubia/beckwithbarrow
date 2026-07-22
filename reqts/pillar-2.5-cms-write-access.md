# Feature: Safe Agent CMS Write Access (Pillar 2.5)

> **STATUS: APPROVED 2026-07-22** by James, with the decisions below. Supersedes the prior
> DRAFT header. Implementation may proceed, subject to the **hard precondition** in §0.

## 0. Decisions (2026-07-22) — these override anything below that conflicts

1. **HARD PRECONDITION — backups first.** No write capability ships, and no live write is
   ever attempted, until **both** backup paths are working *and confirmed*: content/DB
   backup and image backup. Confirmation means a verified restore-readiness check, not just
   "the workflow ran". This gates everything.

   > ✅ **MET 2026-07-22.** Content backup built (PR #42) and image backup re-confirmed in
   > run 29947784136: content 10/10 endpoints, images 203/203 restorable with 0 downloaded
   > (incremental fix held). One asset restored end-to-end and byte-verified against its
   > LFS pointer hash. Evidence and stated limits:
   > `docs/analysis/2026-07-22-backup-confirmation.md`. Write-path implementation may begin;
   > a **live** write still requires the token in §5 below.
2. **ONE WRITE AT A TIME — no batch writes, ever.** Each invocation performs exactly one
   mutation against one document (or one field of one single type). No loops over records,
   no bulk create, no multi-record transactions. If a task needs N changes, that is N
   separate, individually-snapshotted, individually-audited invocations.
   *Interpretation:* an ordered-relation reorder is ONE write — a single `set` on a single
   field of a single document — even though it moves several positions. James confirmed this
   by choosing the press reorder as live test #2.
3. **Write gate: none.** No per-write confirmation prompt. Backups + dry-run + audit +
   one-command revert are the safety net. (Re-affirmed 2026-07-22, post-Cloudinary-incident.)
4. **Language + location: strict TypeScript, in its own workspace packages — NOT in `api/`.**
   ```
   packages/cms-client/   # layer A — strict TS, own tsconfig, Zod + z.infer
   packages/cms-mcp/      # layer B — imports A, holds no token
   ```
   Rationale: the client is a pure HTTP client against the Content REST API and imports
   nothing from the Strapi app, so it does not belong inside it. Decisive constraint:
   `api/tsconfig.json` is Strapi's stock config — it sweeps `./**/*.ts` from the project root
   with `module: CommonJS` and **`strict: false`**, so a `.ts` file under `api/scripts/` would
   be pulled into the Strapi server build non-strict. (Verified empirically 2026-07-22.)
   The existing `api/scripts/*.mjs` files stay as they are — that pattern was never a
   deliberate choice, just an unexamined default from the Pillar 1 overnight run, but there is
   no reason to churn them. `api/backups/` remains the snapshot destination (a configured path).
5. **Live validation order:** (a) a deliberate **no-op write** — write an identical value to a
   low-stakes field, proving snapshot→write→verify→audit end-to-end with zero visible change;
   then (b) the **press reorder** (#1/#2).
6. **NEVER ASSUME AN OBJECT'S SHAPE — always read it first.** Every mutation begins by
   fetching the live document and working from what actually came back. Concretely:
   - No hardcoded field maps, no assumed `documentId`, no assumed relation ordering, no
     assumed presence of a field. Resolve everything from the fetched object.
   - Zod's role here is **validating the observed response**, not asserting a shape we
     believe the server has. A schema mismatch is a *stop*, not something to coerce past.
   - Build every write payload from the fetched document, so a field we did not read is a
     field we cannot accidentally overwrite.
   - Treat `api/src/api/*/content-types/*/schema.json` as a hint only. The live API response
     is the source of truth; the local schema files describe what this checkout believes,
     which can drift from what prod actually serves.
   - This makes the read in step 3 of the mutation flow non-optional, and it means the
     snapshot (step 2) and the shape-discovery read are the *same* fetch — one read, reused.

These resolve open questions 2, 3 and 5 below. Question 1 (publish mechanism) will be answered
empirically against local Strapi rather than by decision.

**Question 4 (backup size) — measured 2026-07-22.** A full content snapshot is **~980 KB**
across 10 endpoints (largest: `home` 410 KB, `projects` 390 KB), after stripping regenerable
Cloudinary `formats`.

Two earlier figures in this section were wrong and are corrected here. First, stripping yields
41% not the ~85% initially projected — per media object `formats` is 1324 of 1982 bytes, but
media *references* dominate the payload rather than their derivatives. Second, an intermediate
measurement of 304 KB was taken before deep populate worked; the real snapshot is larger
precisely because it now captures nested relation data a shallow fetch was missing.

Size is nonetheless the wrong thing to worry about. The real property is **byte-stability**:
`stableStringify` sorts keys so unchanged content serialises to identical bytes, and git stores
content-addressed blobs. Verified 2026-07-22 — two consecutive backups are byte-identical
(`diff -r` clean, excluding `manifest.json`, which carries a timestamp by design for provenance
and is a few KB). So a snapshot of unchanged content adds **no new git objects** for the content
itself. Growth tracks actual content churn, not backup frequency — exactly the opposite of the
Pillar 1 image-backup failure mode, where every nightly run re-downloaded identical binaries.
No retention policy is needed at this size.

**Branch:** feat/pillar-2.5-cms-write-access · **Created:** 2026-06-17
**Part of:** the website-management-agent initiative (`reqts/website-management-agent.md`; Pillar 1
shipped as PR #17). Research backing: `docs/notes/strapi-v5-write-api.md`.

## Problem
Today the agent can change code but not content — CMS items (reorder press articles #1/#2, create
the two Home projects #7, edit text/colors) require a human in the Strapi admin. James wants the
agent to perform content operations directly, **including publish**, with the safety net being
**heavy, frequent backups** so any change is revertible. `strapi transfer` is forbidden and there's
no staging, so writes target **production directly via the Content REST API**.

## Goals
- [ ] Agent can create/update content and **publish** it to prod Strapi via a scoped token.
- [ ] **Deletion is not a capability** the agent has (token scope + Pillar 1 Cloudinary no-op).
- [ ] Every mutation is wrapped: pre-write snapshot → write → verify → audit, all committed.
- [ ] Full content backups run nightly + before every write; a **one-command revert** restores any
      snapshot/backup; revert is tested.
- [ ] A typed safe-write client (layer A) is the only thing holding the token; an MCP server
      (layer B) wraps it so other tools can use it, inheriting all guardrails.

## Non-Goals
- No delete of records or media (not exposed at all).
- No schema/content-type changes, users, roles, permissions, or API-token management.
- No transfer/import/deploy (Pillar 1 quarantine stands).
- Not relying on draft-gating as the safety model — backups are the gate (James chose write+publish).
- Not building the MCP server before the client works (A first, then B).

## Architecture (two layers)
```
  MCP server (B)            safe-write client (A)              Strapi Cloud
  thin stdio tools   ──>    ALL guardrails live here    ──>    Content REST API
  (no Strapi access)        snapshot·write·verify·audit·revert  (custom token, no delete)
```
- **A — `api/scripts/cms/` (.mjs + Zod):** typed functions — `reorderRelation`, `createRecord`,
  `updateRecord`, `updateSingleType`, `publish`, `uploadMedia`, `revert`. A core `mutate()` wrapper
  applies the safety flow to every write. Direct imports, no DI (per CLAUDE.md). *(Flag: CLAUDE.md
  prefers TS; James may prefer TS+tsx over .mjs+Zod.)*
- **B — `api/scripts/cms-mcp/`:** a stdio MCP server (`@modelcontextprotocol/sdk`) importing A's
  functions and exposing them as tools. No token of its own; cannot bypass A's guardrails.

## Scope — capability surface

**Allowed (additive/reversible only):**
- Read any content (already public, no token needed).
- Reorder ordered relations (`press.pressArticles`, `home.projects`) via `set` with an ordered
  `documentId` array.
- Create / update collection records (`project`, `press-article`).
- Update single types (`connect`, `about`, `approach`, `press`, `home`, `global`, `menu`).
- Publish / unpublish where draft&publish is on.
- Upload media (additive, `POST /api/upload`). **Never** delete media.

**Forbidden — not a granted capability:**
- Delete records (token `delete` action OFF per type).
- Delete/destroy Cloudinary media (token + Pillar 1 no-op).
- Schema/content-type changes, users, roles, permissions, API tokens.
- transfer / import / deploy.

## Behavior — the mutation flow (every write is sandwiched)
1. **Pre-flight backup check** — ensure a full content backup from today exists; else run one.
2. **Snapshot-before** — capture the exact current state of the docs/types about to change →
   `api/backups/content-snapshots/<stamp>-<op>.json` (committed). The revert point.
3. **Apply** — create/update/publish/reorder via the scoped token (`documentId` is the write key;
   resolve title/slug → documentId via a read first).
4. **Verify** — read back; assert the change landed and nothing else changed (diff touched docs vs
   snapshot + expected delta).
5. **Audit** — append to `api/backups/cms-audit.log`: what/when, snapshot path, before→after summary.

`--dry-run` on every op shows the diff and writes nothing. On any failure: abort; the snapshot is
the restore point. The agent always reports what it changed, with the snapshot reference.

## Backups + revert (the "backed up a lot" core)
- **Extend the Pillar 1 backup** (`api/scripts/safe-backup.mjs`) to also dump **all content** (every
  single-type + collection, as diffable JSON) → `api/backups/content/<stamp>/`. Reads are public
  (token-free). Runs **nightly** (with the Cloudinary image backup) and **before every write**.
- Content backups are small JSON → committed to git (full diffable history of every content state).
- **Revert** — `pnpm cms:revert <snapshot|backup>`: re-applies prior values via the client (a safe
  over-write, since the agent can't delete). Tested on local Strapi.
- Net: four layers of undo — pre-write snapshot, nightly backup, git history, one-command revert.

## Token setup (James's one manual step)
In the Strapi admin → Settings → API Tokens → **Create**: type **Custom**, enable **create + update
+ publish** on the allowed content types, leave **delete unchecked** (and find off — reads are
public). Copy the token into a gitignored env var `STRAPI_CMS_WRITE_TOKEN` (e.g. in
`api/strapi-cloud.env`). The token stays re-viewable in the admin because `ENCRYPTION_KEY` is set.

## Testing
- **Unit (vitest):** pure logic — snapshot diff, revert-payload builder, relation `set`-order
  builder, the verify-delta check.
- **Integration:** spin up **local Strapi (sqlite)**; exercise create/update/reorder/publish, then
  revert, asserting state. **Never touch prod in tests.**
- Dry-run paths covered. The publish mechanism is verified here first (see open question).

## Proposed build sequence (detailed plan after approval)
1. Content backup extension + content-snapshot util (read-only; testable immediately).
2. `mutate()` safety wrapper + revert (unit-tested with a fake transport).
3. The A client ops (reorder/create/update/publish/upload) against local Strapi (integration).
4. `pnpm cms:*` scripts + audit log.
5. Token creation (James) + a guarded first real op (e.g. Press reorder #1/#2) with dry-run then live.
6. Layer B: the MCP server wrapping A.

## Open Questions (need James / verification)
- [ ] **Publish-via-REST mechanism** — confirm against local Strapi: `?status=published` on write,
      vs. a publish call, vs. a thin custom controller. Client abstracts it behind `publish()`.
- [ ] **Client language** — `.mjs + Zod` (matches existing tooling) vs TS+tsx (CLAUDE.md default)?
- [ ] **Per-write confirmation** — James chose write+publish with no mandatory gate; confirm dry-run
      + audit + revert is sufficient, or do you want a confirm prompt on first-of-session writes?
- [ ] **Content backup size/retention** in git over time (same concern as Pillar 1 image LFS).
- [ ] **First live operation** to validate end-to-end (suggest Press reorder #1/#2 — small, reversible).
