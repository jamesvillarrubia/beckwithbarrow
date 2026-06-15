# Feature: Safe, Iterative AI Agent for Website Management

**Branch:** feature/website-management-agent (proposed)
**Created:** 2026-06-15
**Status:** Design approved — pending spec review
**Authors:** James Villarrubia + Claude (brainstorming session)

## Problem

Ardis Barrow (design authority) and James (developer) want ongoing, collaborative
management of beckwithbarrow.com with an AI agent doing the hands-on work. Today that
is unsafe and undefined:

- **No site-specific operating manual.** There is no `CLAUDE.md` at the repo root or in
  `frontend/` / `api/`. Any agent runs on generic instincts plus global rules, with no
  site wiring, no guardrails, no "never do X."
- **Loaded guns are one command away.** `pnpm transfer:to-cloud`, `transfer:from-cloud`,
  `deploy:cloud`, `delete:cloud-media`, and `restore` can each sever or destroy the
  database→image-asset links. `api/AI-INSTRUCTIONS.md` actively *recommends* these to an AI.
- **Proven catastrophic failure.** On 2026-03-19 a Strapi transfer with prod credentials
  destroyed 201 Cloudinary images. Root cause (confirmed in config): Cloudinary is the
  Strapi upload provider, the provider's `delete` action is enabled, and `strapi transfer`
  wipes the destination (deleting file records → deleting Cloudinary binaries) before
  re-importing. If the source lacks those media, they are gone permanently.
- **No managed DB backups.** The Strapi Cloud plan is low-tier and does not include
  database backups. There is currently no reliable, restorable backup of content or of the
  DB→image mapping.
- **Ambiguous content-vs-code boundary.** Some change requests are CMS content (press
  order, contact address), some are React code (colors, spacing, layout), and some *look*
  like content but are hardcoded (e.g. the "Location" label at `ConnectPage.tsx:220`).
  Nobody has mapped which is which, so effort gets wasted hunting in the wrong place.

The immediate forcing function is a punch list of website tweaks from Ardis. That punch
list is **not** the goal — it is the first real test case for the system this spec defines.

## Goals

- [ ] Make destructive, link-severing operations impossible to trigger accidentally or
      autonomously.
- [ ] Provide reliable, restorable, in-repo backups of content + the Cloudinary asset
      mapping + the original image binaries — independent of the Strapi Cloud plan.
- [ ] Give the agent a site-specific operating manual (`CLAUDE.md`) encoding wiring,
      guardrails, risk tiers, and the content-vs-code map.
- [ ] Define an iterative workflow with tiered review: low-risk changes auto-merge after
      automated + visual verification; structural/risky changes wait for James's review.
- [ ] Establish a clear intake + triage process so requests land on the right execution
      path the first time.
- [ ] Validate the whole system by running Ardis's punch list through it.

## Non-Goals

- Not building a custom CMS UI or replacing Strapi.
- Not migrating off Strapi Cloud, Cloudinary, or Vercel (stay on managed services).
- Not giving the agent autonomous authority over destructive/prod-data operations — those
  remain human-only by design.
- Not detailing every punch-list item's exact values (colors, which projects) in this
  spec; those are execution-time decisions tracked in intake.
- Not solving full bidirectional content sync between local and cloud.

## Operating Model (decided)

- **Hybrid division of labor.** Ardis self-serves the CMS content she's comfortable with
  in Strapi (text, press ordering, swapping images). Code/design/layout/structure is the
  agent's job. The agent owns the content-vs-code map so the bucket is never ambiguous.
- **Tiered auto-merge.** Low *technical* risk changes auto-merge after automated checks +
  the agent's visual verification. Structural/risky changes require James's PR review.
- **Ship-then-refine for design.** Visual changes go live; the agent posts a screenshot +
  heads-up so Ardis (design authority) knows to look, and keeps a one-command revert ready.
- **Ardis gets a Strapi login** (already in `todos.md`) so the hybrid model works.

## Architecture: Five Pillars

Sequencing is strict: **1 → 2 → (3 & 4) → 5.** No punch-list/content work happens until
Pillar 1 is real.

### Pillar 1 — Safety & Backups (built first)

1. **Neutralize the failure mode at the source.** Remove the `delete` action from the
   Cloudinary provider config in `api/config/plugins.ts`. Deleting a Strapi record then
   leaves the Cloudinary original intact (a cheap, cleanable orphan) instead of destroying
   it.
2. **Quarantine the loaded guns.** Rename/gate `transfer:to-cloud`, `transfer:from-cloud`,
   `deploy:cloud`, `delete:cloud-media`, and `restore` behind a deliberate, human-only
   confirmation step with a warning header. Rewrite `api/AI-INSTRUCTIONS.md` to *warn*
   against them instead of recommending them.
3. **Backups, committed in-repo, secret-free:**
   - Strapi content export (JSON) — the data.
   - Cloudinary asset manifest (JSON): `public_id` → URL, dimensions, and which record
     references it. The restore map.
   - Original image binaries via **git-lfs** — true disaster recovery even if Cloudinary
     is wiped again.
   - Runs **pre-flight** (before any mutation) and on a **nightly schedule**
     (GitHub Action).
   - Backups must contain **no plaintext secrets** (sanitize/exclude credentials).
4. **A tested restore path.** `scripts/restore-cloudinary.py` + import, documented and
   exercised at least once to prove it works.

### Pillar 2 — Operating Manual (`CLAUDE.md` at repo root)

Encodes:
- **Site wiring:** Strapi Cloud → Cloudinary → `frontend/src/generated/static-data.json`
  → webhook → Vercel rebuild.
- **NEVER-DO list:** the quarantined scripts, prod credentials, anything that can sever
  asset links.
- **The content-vs-code map** (see Pillar 4) and the **risk tiers** for auto-merge.
- **Workflow rules** (Pillar 3).

### Pillar 3 — Iterative Workflow

- Branch → automated checks (build, lint, types) + **visual verification** (screenshot the
  change) → **tiered**:
  - **Low technical risk** (copy, color, spacing, content): auto-merge after checks.
  - **Structural / risky** (data shape, dependencies, Strapi schema, anything touching the
    backup/asset path): PR for James to review.
- **Design changes ship-then-refine:** live immediately, with screenshot + heads-up to
  Ardis and a one-command revert held ready.
- Vercel preview deploys available for reference where useful.

### Pillar 4 — Intake & Content/Code Map

- **Intake:** requests live as a tracked markdown punch list in the repo (Ardis's notes
  are already this format). The agent triages each item into a bucket and checks it off.
- **The map** (lives in `CLAUDE.md`) classifies every request as:
  - **CMS content** — Ardis self-serves in Strapi (text, press order, swapping images).
  - **React code** — agent handles (layout, colors, spacing, structure).
  - **Looks-like-content-but-is-code** — trap cases (e.g. "Location" label at
    `ConnectPage.tsx:220`). Flagged so nobody hunts in the CMS for them.

### Pillar 5 — Proving Ground

Run Ardis's punch list through the system (after Pillar 1 lands). Each item is triaged via
the map, executed on the right path, and verified. Items blocked on assets/decisions from
Ardis (new poolhouse photo, the two color picks, contact-page spruce-up) stay parked until
she provides them.

## Behavior / Key Workflows

- **A new request arrives** → agent adds it to the intake list → classifies it via the map
  → routes to CMS-content (hand to Ardis / do in admin), React code, or trap-case path.
- **Before any content mutation** → pre-flight backup runs automatically; if it fails, the
  mutation does not proceed.
- **A low-risk code change** → branch → checks pass → visual verification → auto-merge →
  (if visual) screenshot + heads-up to Ardis + revert ready.
- **A risky/structural change** → branch → checks → PR → James reviews → merge.
- **A destructive operation is requested** → agent refuses to run it autonomously, explains
  why, and directs the human to the gated manual path.

## Key Decisions

- **Disable Cloudinary auto-delete** (orphan instead of destroy) — directly removes the
  2026-03-19 failure mechanism.
- **Binary backups in-repo via git-lfs** — full disaster recovery, accepting repo growth.
- **Backups in code, secret-free** — no new cloud bucket required; versioned and diffable.
- **Tiered auto-merge keyed on *technical* risk**, with aesthetic approval handled
  separately via ship-then-refine (Ardis is the design authority).
- **Safety first, strictly sequenced** — no content/punch-list work before Pillar 1.

## Open Questions

- [ ] Does the low-tier Strapi Cloud plan expose direct Postgres access (true `pg_dump`),
      or only API/CLI export? Determines the backup export method, not the design.
- [ ] git-lfs introduction to this repo — confirm acceptable (assumed yes from approved
      design).
- [ ] Where the canonical intake list lives — reuse `todos.md`, or a dedicated
      `requests/` file? (Resolve in writing-plans.)
- [ ] Nightly backup via GitHub Action — confirm Actions are enabled (or can be) and a
      read-only cloud token can be stored as a repo secret.

## References

- Cloudinary provider config: `api/config/plugins.ts` (the `delete` action to remove)
- Dangerous scripts: `api/package.json` (`transfer:*`, `deploy:cloud`,
  `delete:cloud-media`, `restore`)
- Misleading AI guidance to rewrite: `api/AI-INSTRUCTIONS.md`
- Existing recovery tool: `scripts/restore-cloudinary.py`
- Trap-case example: `frontend/src/pages/ConnectPage.tsx:220` ("Location" label)
- Static data pipeline: `frontend/src/generated/static-data.json`
- Incident memory: "NEVER run strapi transfer with prod creds" (2026-03-19, 201 images)
