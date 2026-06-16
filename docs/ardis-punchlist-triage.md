# Ardis's Punch List — Content/Code Triage

**Created:** 2026-06-15 (overnight run) · **Source:** Ardis's notes (see
`reqts/website-management-agent.md` / overnight OBJECTIVE) · **Map:** root `CLAUDE.md`

Each item is classified into a bucket, with the exact place the change is made and whether
it's **doable now** or **blocked on an asset/decision from Ardis**.

**Buckets:** `CMS` = Ardis self-serves in the Strapi admin · `CODE` = React change (agent) ·
`TRAP` = looks like content but is hardcoded in JSX · `BLOCKED` = needs an asset/decision first.

---

## Press page

| # | Item | Bucket | Where | Status |
|---|---|---|---|---|
| 1 | Move "New England Home — a contemporary farmhouse in Williamstown" (the cover story) to the **top** | **CMS** | Strapi admin → Press & Media → `pressArticles` relation → drag to top → Save. (Order is the manual order of the `press.pressArticles` oneToMany relation; commit `716a8f6` added drag-and-drop ordering.) | **Doable now** (Ardis) |
| 2 | Move the other New England Home up to just above the Best of Houzz announcements | **CMS** | Same relation; drag into position | **Doable now** (Ardis) |

> Note: this is pure ordering of the Press relation — no code change. Good first task to hand
> Ardis once she has a login.

## Approach / "What we do" page

| # | Item | Bucket | Where | Status |
|---|---|---|---|---|
| 3 | Change the **vertical cover photo** to a poolhouse one | **CMS** (after asset) | `approach.coverImage` (media) — Strapi admin → Approach → upload | **BLOCKED**: Ardis will email the poolhouse photo |
| 4 | Add a **color to the gray area** behind the photo | **CODE** | `frontend/src/pages/ApproachPage.tsx:239` — hardcoded `bg-gray-100` panel (no CMS field). Change the Tailwind class or add an inline color. | **BLOCKED on decision**: Ardis to pick the color (do after #3 image lands) |
| 5 | Change the **beige/brown color** behind the title text below the photo | **CMS** | `approach.quoteBgColor` (color-picker). The `#F9FAFB` at `ApproachPage.tsx:301` is only the empty fallback — the actual color is set in Strapi. | **Doable now** (Ardis picks in Strapi) |
| 6 | "How We Do It" feels cramped — let the title breathe | **CODE** | `frontend/src/pages/ApproachPage.tsx:317` — `<h2 … mb-24 text-center>`. Add top breathing room (e.g. `mt-8`/`pt-8`) and/or increase `mb-24`; the section wrapper is `py-16` at `:314`. | **Doable now** (agent) |

> Correction worth noting: the beige/brown (#5) is **CMS**, but the gray panel (#4) is
> **code** — adjacent-looking changes, different buckets. Exactly why the map exists.

## Home page

| # | Item | Bucket | Where | Status |
|---|---|---|---|---|
| 7 | Add **two missing projects** — Byers-Dunne poolhouse (karenbeckwith.com/2020-williamstown-pool-house) and blockeight (karenbeckwith.com/blockeight) | **CMS** | `home.projects` oneToMany relation → Strapi admin → Home Page → add the two `project` entries (and order them). Used at `HomePage.tsx:246`. | **Doable now IF** the two `project` entries already exist with images; otherwise create the projects first (CMS). Ardis says photos should be available. |

> Two-step: (a) ensure a `project` entry exists for each (create + add cover/gallery images if
> not), (b) add both to the `home.projects` relation. Both CMS-admin.

## About / "Who we are" page

| # | Item | Bucket | Where | Status |
|---|---|---|---|---|
| 8 | Reduce spacing in the **top paragraph** (crowding the horizontal line above it); match the lower paragraph's spacing | **CODE** | `frontend/src/pages/AboutPage.tsx:319` — `pt-4` on the top-right text cell; grid gap `gap-8 md:gap-14` at `:284`; the lower cell uses the same `pt-4` at `:388`. Reduce the top cell's `pt-4` (e.g. `pt-1`/`pt-0`) to tighten under the divider. | **Doable now** (agent) |

## Contact us page

| # | Item | Bucket | Where | Status |
|---|---|---|---|---|
| 9 | Change **"Location" → "Mailing Address"** | **TRAP → CODE** | `frontend/src/pages/ConnectPage.tsx:220` (and the no-data fallback duplicate at `:239`). The address *value* is CMS (`connect.address`) but the *label* is hardcoded. Change both. | **Doable now** (agent) |
| 10 | Spruce up the page — line-drawing elements / a color block | **CODE** | Assets ready: `frontend/src/components/ArchBackground.tsx` (+ `components/arch.svg`), not yet used on Contact. Import + wrap a `relative` section + `<ArchBackground …>`. A color block = a new `<div>` (or add a `quoteBgColor`-style color-picker field to the `connect` schema = a small Strapi schema change → structural/PR). | **BLOCKED on decision** (nice-to-have): needs Ardis's input on the drawings/placement |

---

## Summary for execution order (once the system is live)

**Doable now by the agent (CODE, low-risk → tiered auto-merge + ship-then-refine):**
- #6 "How We Do It" breathing room (`ApproachPage.tsx:317`)
- #8 About top-paragraph spacing (`AboutPage.tsx:319`)
- #9 "Location" → "Mailing Address" (`ConnectPage.tsx:220` + `:239`)

**Doable now by Ardis (CMS, self-serve — good onboarding tasks):**
- #1, #2 press ordering · #5 approach beige/brown color · #7 add the two home projects (if the
  `project` entries exist)

**Blocked on Ardis's assets/decisions:**
- #3 poolhouse vertical photo (she'll email) → then #4 gray-area color pick
- #10 contact-page line-drawings / color block (nice-to-have, needs her direction)

**Structural / needs a PR (not auto-merge):**
- #10 *if* implemented as a new `connect.quoteBgColor` color-picker field (Strapi schema change).
