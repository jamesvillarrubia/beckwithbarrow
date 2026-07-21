# Feature: Pillar 3 — Iterative Change Workflow

**Branch:** overnight/wma-pillars
**Created:** 2026-06-15
**Status:** Design approved — pending implementation
**Spec parent:** `reqts/website-management-agent.md`

## Problem

Pillar 1 secured the site against destructive operations. Pillar 2 captured the operating
manual in `CLAUDE.md`. Pillar 3 defines the mechanics of actually *making* a change: how
the agent branches, verifies, decides autonomously vs. escalates, deploys, and keeps Ardis
informed. Without this, every change is an improvised judgment call — some low-stakes edits
wait unnecessarily for human review, some structural changes might slip through without it.

Key tensions to resolve:

- **Velocity vs. safety.** Ardis wants her punch-list items actioned fast. James should not
  be a bottleneck for trivially safe changes (copy tweak, spacing nudge). But structural
  changes must wait for his review.
- **Design authority.** Ardis is the design authority. She should learn about visual changes
  shortly after they land, not days later. The agent must not go dark after shipping.
- **Revertibility.** Every deployed change must be undoable by the agent with one command so
  the situation is never "I shipped and now I'm stuck."

## Goals

- [ ] Define precisely which changes are *low technical risk* (eligible for auto-merge) vs.
      *structural/risky* (must be PR-reviewed by James).
- [ ] Specify the per-change flow from branch creation through deployment.
- [ ] Specify the automated check suite (build, lint, types, api tests) that gates every path.
- [ ] Specify visual verification — what a passing screenshot looks like and how it's captured.
- [ ] Specify ship-then-refine: what the agent posts to Ardis and how the one-command revert works.
- [ ] Document the PR template for the structural path.

## Non-Goals

- Not building a CI/CD platform or replacing Vercel / GitHub Actions.
- Not adding a human-facing chat interface or notification channel now (out of scope for
  this pillar; a future pillar may wire Slack/email).
- Not automating anything that requires CMS interaction (Ardis's Strapi self-serve tasks).
- Not handling the backup pre-flight logic (that is Pillar 1's concern, already built; this
  pillar *calls* it).

---

## Risk Tiers

The tier is determined by the *type of change*, not by how it looks to the developer. The
content-vs-code map in root `CLAUDE.md` is the canonical classifier. The summary below is the
decision rule the agent (and the risk-classifier) must apply.

### Tier A — Low Technical Risk (auto-merge eligible)

These changes are safe to ship without James's review. They must still pass automated checks
and visual verification.

| Category | Examples | Map anchor |
|---|---|---|
| Hardcoded UI copy | "Location" → "Mailing Address" (`ConnectPage.tsx:220,239`); section headings | `CLAUDE.md §Hardcoded-traps` |
| Tailwind layout/spacing | Breathing room (`ApproachPage.tsx:317`), top-paragraph spacing (`AboutPage.tsx:319`) | `CLAUDE.md §React code` |
| Tailwind color class (not CMS-backed) | Gray panel on Approach page (`ApproachPage.tsx:239`), any `bg-*` / `text-*` class change | `CLAUDE.md §React code` |
| Pure component styling | Font size, line-height, padding, margin, `gap-*`, `py-*` adjustments | `CLAUDE.md §React code` |
| Static asset additions | New decorative SVG, adding an existing component (`ArchBackground`) to a page | `CLAUDE.md §React code` |
| Test-only changes | Adding or fixing vitest tests with no production code changes | N/A |
| Docs-only changes | Runbook, plan, triage doc updates | N/A |

**Decision rule:** If every file changed is in `frontend/src/` (not `api/config/`, not
`api/src/`, not `scripts/`, not `.github/`, not `pnpm-lock.yaml` / `package.json` for new
deps) AND the change is purely presentational (copy, class names, static JSX structure, no
new data fetching, no new environment variables), it is Tier A.

### Tier B — Structural / Risky (PR for James)

These changes require James to review before merge, no matter how small they appear.

| Category | Examples | Why risky |
|---|---|---|
| Strapi schema changes | New field on `connect`, new content type | Changes API shape; can break frontend and backup scripts |
| `api/config/` changes | Cloudinary provider settings, plugin config | Directly adjacent to the 2026-03-19 failure mode |
| Backup/restore path changes | `safe-backup.mjs`, `restore-cloudinary.py`, `build-manifest.mjs`, `guard-forbidden.mjs` | Safety infrastructure |
| Dependency additions or upgrades | Any `pnpm add` that changes `pnpm-lock.yaml` and `package.json` | Supply chain risk; build surface change |
| Data shape changes | Changes to `static-data.json` schema, new React Query keys | Can break the seeded cache and the build-time pipeline |
| Environment variable additions | New `VITE_*` or API env var | Requires coordination with Vercel project settings |
| Vercel / infra config | `vercel.json`, `Pulumi.*`, `.github/workflows/` | Prod infra |
| `api/src/` non-test code | Any production Strapi code other than the safety wrapper | Server-side logic |
| Anything touching the asset link | Any change that could sever DB→Cloudinary references | Core safety invariant |

**Decision rule:** If in doubt, escalate to Tier B. The cost of an unnecessary PR review is
an email to James; the cost of missing a structural risk can be data loss.

---

## Behavior / Per-Change Flow

### Every change (both tiers)

```
1. Branch off `main`
   Name: <type>/<short-slug>  (e.g. fix/location-label, feat/approach-breathing-room)
   Convention: Conventional Commits branch names.

2. Implement the change (code edit, copy change, etc.)

3. Run automated checks:
   a. pnpm build (from repo root, exercises both frontend and api)
   b. pnpm lint (if configured; currently frontend ESLint)
   c. Type check: pnpm --filter ./frontend tsc --noEmit
   d. Api tests: cd api && pnpm test
   All four must pass; on any failure, STOP — fix before proceeding.

4. Visual verification (frontend changes only):
   - Start the dev server (pnpm dev:frontend) if not already running.
   - Capture a screenshot of the affected page(s).
   - Confirm: the intended change is visible; no obvious regressions on other visible elements.
   - If the screenshot shows a regression or the change is not visible: STOP — investigate.

5. Classify risk tier (A or B) using the decision rule above.
```

### Tier A path (auto-merge)

```
6A. Merge to main:
    git merge --no-ff <branch> into main (or push branch + auto-merge via GitHub if
    branch protection allows). Do NOT push directly to main — use a branch even for
    auto-merge so the diff is reviewable.

7A. Vercel deploys automatically (webhook trigger). Wait for deployment confirmation.

8A. Ship-then-refine post:
    - Capture a post-deploy screenshot (or use the Vercel preview URL if available).
    - Post heads-up to Ardis: what changed, link to the live page, the screenshot.
      (Until a notification channel exists, record the heads-up in docs/tmp/design-log.md.)
    - Prepare one-command revert (see "Revert Mechanism" below).
```

### Tier B path (PR for James)

```
6B. Push branch → open a PR using the structural PR template (see below).
    PR body must include:
    - Why this is Tier B (which rule triggered it).
    - The automated check results (all green).
    - A screenshot if the change has visual impact.
    - The one-command revert.

7B. James reviews. Agent does not merge. Agent may address review comments and push.

8B. James merges. Vercel deploys. Agent posts the same ship-then-refine note after deploy.
```

### Revert Mechanism

Before any Tier A merge (and recorded in every Tier B PR body), the agent prepares:

```bash
git revert <merge-commit-sha> --no-edit && git push origin main
```

This one command undoes the change without disturbing other work. The agent must record the
exact command (with the real SHA) in `docs/tmp/design-log.md` immediately after every merge.

---

## Ship-Then-Refine Details

**Who:** Ardis Barrow is the design authority. She is NOT a code reviewer; she is a visual
approver. The "heads-up" is not asking for permission — the change is live. It is giving her
the chance to say "actually, make it a bit more X" and triggering a follow-up Tier A change.

**Content of heads-up:**

```
Subject: [Ship-then-refine] <what changed> — <page name>

What landed: <one-sentence description>
Live at: https://beckwithbarrow.com/<page>
Screenshot: <attached>
Revert available: one command (James can trigger if needed)
```

Until a delivery channel is set up, this is written to `docs/tmp/design-log.md` as a
dated entry. The log is NOT gitignored — it stays in the branch and is included in the PR.

---

## Automated Check Command Reference

Run these from the repo root (or as noted) in this order:

```bash
# 1. Build (catches import errors, missing types, bad JSX)
pnpm build

# 2. Lint (frontend)
pnpm --filter ./frontend lint

# 3. Type check (frontend)
pnpm --filter ./frontend tsc --noEmit

# 4. Api tests (vitest)
cd api && pnpm test
```

All four must exit 0 before a change proceeds to visual verification.

---

## PR Template (Structural / Tier B Changes)

File: `.github/PULL_REQUEST_TEMPLATE/structural.md`

```markdown
## What this changes

<!-- One-paragraph description of the change and why it's needed. -->

## Why this is Tier B (structural)

<!-- Which rule triggered escalation? e.g. "Changes api/config/plugins.ts (Cloudinary provider)" -->

## Automated checks

- [ ] `pnpm build` — PASS
- [ ] `pnpm --filter ./frontend lint` — PASS
- [ ] `pnpm --filter ./frontend tsc --noEmit` — PASS
- [ ] `cd api && pnpm test` — PASS

## Visual verification

<!-- Screenshot(s) attached, or "no visual impact". -->

## Revert

```bash
git revert <sha> --no-edit && git push origin main
```

## Linked spec / plan

<!-- reqts/ or docs/plans/ reference -->
```

---

## Open Questions

- [ ] **Notification channel for Ardis.** Until a channel (email, Slack, SMS) is wired, the
      heads-up lives in `docs/tmp/design-log.md`. What channel does Ardis prefer? (Resolve
      in Pillar 5 or separately.)
- [ ] **Branch protection on `main`.** If auto-merge requires a status check, we need a
      GitHub Actions workflow that runs the check suite on every PR. Pillar 3's plan should
      include this as an optional step. (Confirm with James whether branch protection is
      already configured.)
- [ ] **Vercel preview URLs.** Are they available on every PR branch push? Confirm in the
      Vercel project settings — if yes, the visual verification step can use the preview URL
      instead of running a local dev server.
- [ ] **Pre-flight backup timing.** `CLAUDE.md` says to run `cd api && pnpm backup:safe`
      before content-mutating actions. Pillar 3 calls that as a step before code changes that
      touch the asset path (Tier B). The exact trigger condition should be tightened in the
      implementation plan.

## References

- Content-vs-code map: root `CLAUDE.md §Content-vs-code map`
- Risk tiers (first mention): `reqts/website-management-agent.md §Pillar 3`
- Pillar 1 safety infra: `docs/plans/2026-06-15-pillar1-safety-and-backups.md`
- Hardcoded-trap file:line refs: `docs/ardis-punchlist-triage.md`
- Backup command: `cd api && pnpm backup:safe`
