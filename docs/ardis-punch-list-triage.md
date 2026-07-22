# Ardis's Punch List — Triage (Pillar 5 proving ground)

Each item from Ardis's 2026-06-15 notes, classified via `docs/content-code-map.md` into
**CMS-content** (she edits in Strapi), **React-code** (agent/dev change), or **trap**
(looks like content, is hardcoded). Status is **doable-now** or **blocked-on-<X>**.

> Verbatim source: `.claude/overnight/ardis-punch-list.md`. Items she flagged BOLD need
> info/assets from her.

| # | Item | Page | Class | Where | Status | Action |
|---|---|---|---|---|---|---|
| 1 | Move "a contemporary farmhouse in Williamstown" (New England Home, cover story) to top | Press | **CMS** | `press.pressArticles` ordered relation | **doable-now** | Drag to top in Strapi admin (Ardis, or agent via admin) |
| 2 | Move the other New England home up to just above the Best-of-Houzz announcements | Press | **CMS** | `press.pressArticles` ordered relation | **doable-now** | Reorder in Strapi admin |
| 3 | Change the vertical photo (too similar to main page) to the poolhouse one | Approach | **CMS** | `approach.coverImage` (Cloudinary) | **blocked-on-asset** | Ardis emails the poolhouse image → swap `coverImage` in Strapi |
| 4 | Add a color to the gray area behind the photo | Approach | **React-code** | hardcoded `bg-gray-100` at `ApproachPage.tsx:239` | **blocked-on-decision** | Code change to a chosen color; ask Ardis to pick the color (after #3's image is in) |
| 5 | Change the beige/brown color behind the title text below the photo | Approach | **needs-verify** | likely `approach.quoteBgColor` (CMS color picker, quote section) OR a hardcoded block — confirm which element | **blocked-on-verify+decision** | Confirm in admin which element she means; if `quoteBgColor` → CMS; if hardcoded → code. Then get the new color |
| 6 | "How we do it" feels cramped above/below — let the title breathe | Approach | **React-code** | `ApproachPage.tsx:317-319` (heading margins, `mb-24`) + section padding | **doable-now** | Increase vertical spacing around the "How We Do It" heading |
| 7 | Add two missing projects (Byers-Dunne poolhouse; blockeight) | Home | **CMS** | `home.projects` ordered relation; needs `project` records + Cloudinary images | **blocked-on-verify** | Check if these Project records exist in Strapi (with photos). If yes → add to `home.projects`. If no → create them (needs photos + info from the KBC reference pages) |
| 8 | Adjust spacing in the top paragraph down a bit (crowding the line above) | About | **React-code** | `AboutPage.tsx` top paragraph block spacing (content itself is `about.topRightText` CMS) | **doable-now** | Adjust margin/padding so it matches the lower paragraph's spacing |
| 9 | Spruce up the contact page (line-drawing element? color block?) — "nice to have" | Contact | **React-code (design)** | `ConnectPage.tsx` layout | **blocked-on-direction** | Needs Ardis's line-drawing asset / art direction before design work |
| 10 | Change "Location" to say "Mailing Address" | Contact | **React-code (trap)** | hardcoded label `ConnectPage.tsx:220` | **doable-now** | One-line string change (the value stays `connect.address`) |

## Summary

**Doable now (5):**
- #1, #2 — Press reordering (CMS; Ardis can do these herself, no code).
- #6 — Approach "How We Do It" spacing (React).
- #8 — About top-paragraph spacing (React).
- #10 — "Location" → "Mailing Address" (React trap, trivial).

**Blocked on Ardis (4):**
- #3 — poolhouse image (asset).
- #4 — gray-area color pick (decision).
- #5 — beige/brown element confirmation + color (verify + decision).
- #9 — contact-page art direction / line-drawing asset.

**Needs investigation (1):**
- #7 — do the two Project records + photos already exist in Strapi? Determines CMS-only vs create-records.

## Recommended first batch (when Pillar 3 workflow exists)

The three trivial React changes are ideal first auto-merge candidates (low technical risk):
**#10** (label), **#6** (Approach spacing), **#8** (About spacing). #1/#2 are CMS — hand to Ardis
or do in the admin. Everything else waits on Ardis's assets/decisions.
