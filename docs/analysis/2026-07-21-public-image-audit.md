# Audit: untracked images in `frontend/public/`

**Date:** 2026-07-21
**Branch:** chore/overnight-cleanup
**Status:** Report only — nothing was deleted.

## Why

16 image files (3.8 MB) have been sitting untracked in `frontend/public/` on
`feature/static-data-cdn-cache`. Anything in `public/` is copied verbatim into
the Vercel build output, so if these are dead they are shipping to every
visitor's origin for nothing.

## Method

For each file: `grep` the basename across `frontend/src`, `frontend/index.html`,
`api/src`, and `docs/`, then inspect the surrounding context of every hit to
distinguish a real code reference from an incidental string match.

## Finding: all 16 are orphaned

**No source file — `.tsx`, `.ts`, or `index.html` — references any of these
filenames.** Zero hits.

The apparent hits in `frontend/src/generated/static-data.json` are misleading
and are the reason this needed checking rather than eyeballing. Those matches
are Strapi asset **`name`** fields, not paths into `public/`. The sibling `url`
field on the same asset resolves to remote media, e.g.:

| Local file | What the app actually loads |
|---|---|
| `best-of-houzz-2016.png` | `https://striking-ball-b079f8c4b0.media.strapiapp.com/thumbnail_best_of_houzz_2016_e79eba579f.png` |

So the CMS record shares a *name* with the local file while serving a
differently-named remote object. The local copy is never requested.
`static-data.json` is itself generated and untracked, so it is not evidence of
intent either.

The remaining hits are in `docs/analysis/website-punch-list-triage.md` — prose
mentions in a triage document, not references.

| File | Size | Verdict |
|---|---|---|
| `New-England-Home-2011.jpg` | 224K | orphaned (name-only match in static-data.json) |
| `Scan+2018-12-11+13.49.44.webp` | 336K | orphaned (no hits) |
| `Scan+2018-12-11+13.49.44a.webp` | 312K | orphaned (no hits) |
| `Scan+2018-12-11+13.49.44b.webp` | 340K | orphaned (no hits) |
| `Scan+2018-12-11+13.49.44d.webp` | 388K | orphaned (no hits) |
| `Scan+2018-12-11+13.49.44e.webp` | 280K | orphaned (no hits) |
| `Scan+2018-12-11+13.49.44f.webp` | 260K | orphaned (no hits) |
| `Scan+2018-12-11+13.49.44g.webp` | 324K | orphaned (no hits) |
| `Scan+2018-12-11+13.49.44h.webp` | 280K | orphaned (no hits) |
| `Scan+2018-12-11+13.54.36.webp` | 504K | orphaned (name-only match) |
| `Scan+2018-12-11+14.22.37.webp` | 272K | orphaned (no hits) |
| `best-of-houzz-2016.png` | 52K | orphaned (name-only match) |
| `best-of-houzz-2018.png` | 52K | orphaned (name-only match) |
| `best-of-houzz-2023.gif` | 16K | orphaned (docs prose only) |
| `e3ec81_219d1224ada04e5f97df10c3be2189c6~mv2.png` | 28K | orphaned (no hits) — the filename is a Wix CDN export, i.e. a leftover from the original site migration |
| `neh_septoct2020.jpeg` | 224K | orphaned (name-only match) |

## Likely origin

The `Scan+...` and `best-of-houzz` names match press assets, and the `~mv2.png`
is a Wix export. Best guess: manual downloads from the March 2026 Cloudinary
restore effort (see `scripts/restore-cloudinary.py`, also untracked) that were
left in `public/` rather than a scratch directory.

## Recommendation — needs James, not an agent

Do **not** blind-delete. These may be the only local copies of press scans, and
given the 2026-03-19 incident that destroyed 201 Cloudinary assets, local
originals have real value.

Suggested: move them out of `public/` (so they stop shipping) and into a
deliberate archive — either an untracked `assets-archive/` outside the build, or
git-lfs alongside the existing backups — after confirming they duplicate what is
already in the CMS. That confirmation is a content check, not a code check.
