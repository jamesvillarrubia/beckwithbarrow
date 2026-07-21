# Website Punch-List Triage — beckwithbarrow.com

**Branch:** feature/static-data-cdn-cache
**Created:** 2026-06-19
**Status:** Read-only triage complete
**Scope:** Locate the code/component backing each punch-list item and classify it (AUTONOMOUS / NEEDS-ASSET / NEEDS-DECISION / NEEDS-CLARIFICATION).

---

## Critical architecture finding (read first)

**Almost all page _content_ is Strapi CMS, not hardcoded.** Every page component fetches via `apiService.getSingleType(...)` / `getCollection(...)` (React Query). The repo's `frontend/src/generated/static-data.json` is a **build-time snapshot** of that CMS data (produced by `frontend/scripts/generate-static-data.ts`) used only to seed the cache so first visitors don't hit a cold Strapi backend — it is **not the source of truth** and editing it does not change the live site.

That splits the punch-list cleanly:

- **Layout / styling / spacing / colors / element structure** → lives in the React component files → **editable in code (AUTONOMOUS or NEEDS-DECISION)**.
- **Which articles/projects appear and in what order, the body text, the images** → lives in **Strapi CMS** → **requires CMS admin access** (cannot be done by editing this repo). The static snapshot would also need regenerating after a CMS change, but the change itself happens in Strapi.

Strapi instance: `https://striking-ball-b079f8c4b0.strapiapp.com` (see `frontend/scripts/generate-static-data.ts#L19-L21`). Press order is a Strapi relation order — there is **no client-side sort** (`getSingleType('press', 'pressArticles.cover')` passes no `sort`; confirmed in `frontend/src/services/api.ts#L147-L175`).

---

## PRESS PAGE

Component: `frontend/src/pages/PressPage.tsx`. Articles render in the exact order of the `pressArticles` relation returned by Strapi (`PressPage.tsx#L68-L72`, mapped at `#L180`). No sorting is applied in code.

Current order in the CMS snapshot (`static-data.json` → `["press-page"]`):
1. Berkshire Bliss (Boston Magazine)
2. Berkshire Living Home + Garden Feature
3. Best of Houzz 2016
4. Best of Houzz 2018
5. Preview Magazine Cover Feature
6. **A Contemporary Farmhouse in Williamstown** (New England Home, 2020) ← the cover-story one to move to TOP
7. **The Berkshire Designer Showcase at Ventfort Hall** (New England Home, 2011) ← the "OTHER New England home"
8. Transformations: Island Cottage (Berkshire Edge)
9. When Life Changes, Design Supports (Berkshire Edge)

| # | Item | Classification | Where it lives | What it takes |
|---|------|----------------|----------------|---------------|
| P1 | Move "A Contemporary Farmhouse in Williamstown" to top | **NEEDS-CMS-ACCESS** (mechanically simple) | Strapi `Press` singleton → `pressArticles` relation order. Render order = relation order (`PressPage.tsx#L180`). | Reorder the relation in Strapi admin (drag article #6 to position 1), then regenerate `static-data.json`. Not a code edit. |
| P2 | Move "other New England home" (Ventfort Hall, 2011) up to just above the "Best of Houzz" announcements | **NEEDS-CMS-ACCESS** + **NEEDS-CLARIFICATION** | Same relation as P1. | "Best of Houzz" entries are currently #3 and #4. Ask: place the 2011 article immediately before Best of Houzz 2016 (i.e. new position 3)? Then reorder in Strapi. |

**Note on the `public/` JPGs:** `frontend/public/New-England-Home-2011.jpg`, `frontend/public/neh_septoct2020.jpeg`, `best-of-houzz-2016.png`, `best-of-houzz-2018.png`, `best-of-houzz-2023.gif` are **duplicate copies** of the press cover images. The live Press page does **not** use these `public/` files — it uses the Cloudinary/Strapi-hosted URLs (e.g. `...strapiapp.com/New_England_Home_2011_*.jpg`). They appear to be leftover source uploads. They do **not** control ordering and editing/reordering them has no effect.

---

## APPROACH / "WHAT WE DO" PAGE

Component: `frontend/src/pages/ApproachPage.tsx`. Layout is in code; image, title text, quote text, and the quote background color come from Strapi (`coverImage`, `quote`, `quoteBgColor`, `servicesList`, `stages`).

| # | Item | Classification | Where it lives | What it takes |
|---|------|----------------|----------------|---------------|
| A1 | Swap the vertical photo for a poolhouse image (user will email it) | **NEEDS-ASSET → then NEEDS-CMS-ACCESS** | Image is `approach.coverImage`, rendered at `ApproachPage.tsx#L247-L258`. It is a **CMS field**, not a repo file. | Wait for the emailed poolhouse image, upload it to the Strapi `Approach` singleton's `coverImage` field. Not a code edit. |
| A2 | Add a color to the gray area behind the photo (user picks color once image is in) | **NEEDS-DECISION** (AUTONOMOUS once color chosen) | The gray panel is **hardcoded in the component**: `bg-gray-100` at `ApproachPage.tsx#L237-L241` (`<div ... top-[215px] h-[525px] bg-gray-100 />`). | Once the user names a color, replace `bg-gray-100` with an arbitrary color (inline `style={{ backgroundColor }}` or a Tailwind class). Pure code edit. Blocked only on the color choice (which the user says depends on the new image). |
| A3 | Change the beige/brown color behind the title text below the photo | **NEEDS-DECISION** + **NEEDS-CLARIFICATION** | The beige/brown band is the **quote section**, colored by `approach.quoteBgColor` (CMS field) with fallback `#F9FAFB` — `ApproachPage.tsx#L297-L310`. | Two paths: (a) if it's CMS-driven, change `quoteBgColor` in Strapi; (b) change the hardcoded fallback in code. **Clarify** which band the user means ("below the photo") and what new color. If a specific color is given, doable; the _mechanism_ (CMS vs code fallback) needs confirming. |
| A4 | "How we do it" feels cramped — let the title breathe (more spacing) | **AUTONOMOUS** | "How We Do It" heading at `ApproachPage.tsx#L317-L319` (`mb-24`); section wrapper `py-16` at `#L314`; quote block above ends at `#L297-L310`; process/snake map starts at `#L321`. | Increase top padding on the section / margin above the heading (e.g. bump `py-16`→`py-24/py-32`, add `mt-*`/`pt-*`, or `mb-24`→`mb-32`). Pure CSS-class tweak. Iterate visually to taste. |

---

## HOME PAGE

Component: `frontend/src/pages/HomePage.tsx`. The project grid is driven by `homeContent.projects` — an **ordered relation on the Strapi `Home` singleton** (`HomePage.tsx#L113`, populated `projects.cover`), passed to `ProjectGrid` as `featuredProjects` (`HomePage.tsx#L245-L248`). `ProjectGrid` numbers them sequentially by array order (`ProjectGrid.tsx#L114`). So **which projects show on Home, and their order, is CMS data**, not code.

Current Home list has **15 projects** (snapshot), all with placeholder-style names (Hillside Farmhouse, Woodland Retreat, Modern Lake House, …). The full `projects` collection also has **15** — i.e. Home currently shows all of them.

**Cross-reference search result:** The two projects the user wants added are **NOT present anywhere in the repo or CMS snapshot**:
- "Byers-Dunne Poolhouse" / Williamstown pool house → keywords `byers`, `dunne`, `poolhouse`, `pool house` → **all absent** from `static-data.json`.
- "Block Eight" (`/blockeight`) → `blockeight` **absent**; `block` only matches prose ("Block Island", "white block houses…"), not a project.
- No matching cover images found in `frontend/public/` either.

This strongly implies these two projects **do not yet exist as Strapi `Project` entries**. The user's belief that "photos should already be available" is not borne out by the repo — the photos are not in `frontend/public/`, and no project record references them.

| # | Item | Classification | Where it lives | What it takes |
|---|------|----------------|----------------|---------------|
| H1 | Add "Poolhouse at Byers-Dunne" (karenbeckwith.com/2020-williamstown-pool-house) | **NEEDS-ASSET + NEEDS-CMS-ACCESS** | Home `projects` relation (CMS) + `Project` collection (CMS). Render: `HomePage.tsx#L245-L248` → `ProjectGrid.tsx`. | Create a `Project` entry in Strapi (title, slug, cover, images), then add it to the `Home.projects` relation in the desired position. Requires the actual photos (not in repo) + CMS access. Then regenerate static data. |
| H2 | Add "Block Eight" (karenbeckwith.com/blockeight) | **NEEDS-ASSET + NEEDS-CMS-ACCESS** | Same as H1. | Same as H1. Photos absent from repo; needs sourcing (the karenbeckwith.com pages are the visual reference) + CMS entry. |

(If the user can confirm the photos exist in Strapi/Cloudinary under a different name, this drops to NEEDS-CMS-ACCESS only. As the repo stands, treat both as needing the assets supplied.)

---

## ABOUT PAGE / "WHO WE ARE"

Component: `frontend/src/pages/AboutPage.tsx`. Title "Who we are" + a decorative SVG (horizontal line, vertical line, circle) sit above a 2×2 grid. Body text is CMS (`topRightText`, `bottomLeftText`); **spacing is in code.**

The "horizontal line above it" the user references is the decorative SVG `<line>` at `AboutPage.tsx#L236-L244` (horizontal at `y1=12.5`). The "top paragraph" is `topRightText` rendered in the top-right grid cell — its container has `pt-4` at `AboutPage.tsx#L319`; the paragraph below (`bottomLeftText`) container also has `pt-4` at `#L388`. The title section uses `pt-0` (`#L222`), and the grid section `pt-0` (`#L281`).

| # | Item | Classification | Where it lives | What it takes |
|---|------|----------------|----------------|---------------|
| AB1 | Nudge the top paragraph down so it stops crowding the horizontal line; match the spacing of the paragraph below it | **AUTONOMOUS** (likely; minor clarification possible) | Top-right text cell `pt-4` at `AboutPage.tsx#L319`; bottom-left text cell `pt-4` at `#L388`; SVG horizontal line at `#L236-L244`; title/grid `pt-0` at `#L222`,`#L281`. | Add top padding/margin to the top-right paragraph cell (e.g. `pt-4`→`pt-10/pt-12`, or `mt-*`) so it clears the SVG line, matching the visual rhythm of the lower paragraph. Pure CSS-class edit; verify visually. Note both cells currently share `pt-4`, so "match below" may mean increasing both equally — confirm by eye after the change. |

---

## CONTACT US PAGE

Component: `frontend/src/pages/ConnectPage.tsx`. Contact fields (email/phone/address) are CMS (`connect.email/phone/address`), but the **labels and page layout are hardcoded in the component.**

| # | Item | Classification | Where it lives | What it takes |
|---|------|----------------|----------------|---------------|
| C1 | Change "Location" → "Mailing Address" | **AUTONOMOUS** | Hardcoded label `<h3>Location</h3>` at `ConnectPage.tsx#L220` (Strapi-data branch) **and** the fallback at `#L239`. The label text is in code, not CMS. | One/two-line text change: `Location` → `Mailing Address` at `#L220` (and `#L239` for consistency). The address value itself stays CMS (`connect.address` = "27 Holland Rd.\nMelrose, MA 02176"). |
| C2 | "Nice to have": spruce up the page; add a line-drawing element + a color block | **NEEDS-DECISION** (open-ended design) | Whole component `ConnectPage.tsx`. Reusable line-drawing asset already exists: `frontend/src/components/ArchBackground.tsx` (the arch SVG used elsewhere). Logo SVGs in `frontend/public/Beckwith Barrow-Logo *.svg`. | Subjective. Could drop in `<ArchBackground />` as a decorative element and add a Tailwind color-block `<div>`. **Needs direction**: where on the page, which line drawing (arch vs logo line art), and what color for the block. Propose a mockup, then implement. |

---

## Consolidated classification summary

| Item | Page | Classification | Primary file |
|------|------|----------------|--------------|
| P1 Move Williamstown farmhouse to top | Press | NEEDS-CMS-ACCESS | `PressPage.tsx#L180` (order = Strapi relation) |
| P2 Move other NEH (Ventfort 2011) above Best of Houzz | Press | NEEDS-CMS-ACCESS + clarify exact slot | `PressPage.tsx#L180` |
| A1 Poolhouse vertical photo | Approach | NEEDS-ASSET → CMS upload | `ApproachPage.tsx#L247-L258` |
| A2 Color behind gray photo panel | Approach | NEEDS-DECISION (then AUTONOMOUS) | `ApproachPage.tsx#L237-L241` (`bg-gray-100`, code) |
| A3 Change beige/brown band color | Approach | NEEDS-DECISION + clarify CMS vs code | `ApproachPage.tsx#L297-L310` (`quoteBgColor`) |
| A4 More breathing room for "How We Do It" | Approach | AUTONOMOUS | `ApproachPage.tsx#L314-L319` |
| H1 Add Byers-Dunne poolhouse project | Home | NEEDS-ASSET + CMS (project absent) | `HomePage.tsx#L245`, `ProjectGrid.tsx` |
| H2 Add Block Eight project | Home | NEEDS-ASSET + CMS (project absent) | `HomePage.tsx#L245`, `ProjectGrid.tsx` |
| AB1 Nudge top paragraph spacing | About | AUTONOMOUS | `AboutPage.tsx#L319` (+ `#L236-L244`, `#L388`) |
| C1 "Location" → "Mailing Address" | Contact | AUTONOMOUS | `ConnectPage.tsx#L220`, `#L239` |
| C2 Spruce up contact page | Contact | NEEDS-DECISION | `ConnectPage.tsx`, `ArchBackground.tsx` |

**Fully autonomous right now (code-only, no input):** A4, AB1, C1.
**Code edits blocked only on a color/design decision:** A2, A3, C2.
**Blocked on CMS access (and the change happens in Strapi, not this repo):** P1, P2, plus the upload steps of A1, H1, H2.
**Blocked on the user supplying assets:** A1 (poolhouse image), H1/H2 (project photos — not in repo).

---

## What I need from the user to unblock

1. **Press reordering (P1, P2):** Confirm Strapi admin access (and whether you want me to guide you through reordering, since it's a CMS relation, not a code change). For P2, confirm the exact target slot for the 2011 Ventfort Hall article (immediately before "Best of Houzz 2016"?).
2. **Approach photo (A1):** Email the poolhouse image, and confirm I should upload it to Strapi's `Approach.coverImage`.
3. **Approach color behind gray panel (A2):** The hex/color you want once the new image is in.
4. **Approach beige/brown band (A3):** Confirm which band you mean ("below the photo" = the quote section) and the new color. Also confirm whether to change it in Strapi (`quoteBgColor`) or hardcode it.
5. **Home projects (H1, H2):** The photos for "Byers-Dunne Poolhouse" and "Block Eight" — they are **not in the repo or current CMS data**. Please send the images (or confirm they're already uploaded to Strapi under specific names). Also confirm titles/slugs and where in the Home order they should sit.
6. **Contact spruce-up (C2):** Direction — which line drawing (the arch from `ArchBackground.tsx`, or logo line art), where to place it, and what color the color block should be.

Items I can do immediately with **no further input**: A4 (spacing), AB1 (About paragraph spacing), C1 ("Location" → "Mailing Address").
