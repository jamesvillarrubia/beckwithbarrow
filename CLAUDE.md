# Beckwith Barrow — Project Operating Manual

Portfolio site for Karen Beckwith / Beckwith Barrow (architecture & interior design).
Nx monorepo, pnpm. **Strapi v5 CMS** (`api/`) + **React 18 / Vite** frontend (`frontend/`).
Content in **Strapi Cloud**, media in **Cloudinary**, frontend on **Vercel**.

> This file is the operating manual for anyone (human or agent) working on this site.
> Full design rationale: `reqts/website-management-agent.md`.

## Who works here

James (developer) + **Ardis Barrow (design authority)**. **Hybrid model:** Ardis
self-serves CMS content in Strapi; the agent owns code/design/layout/structure. The agent
maintains the content-vs-code map below so no request lands in the wrong bucket.

---

## ⛔ NEVER RUN — irreversible data loss

On **2026-03-19**, a `strapi transfer` with production credentials **destroyed 201
Cloudinary images**. Cloudinary is Strapi's upload provider; `strapi transfer` wipes the
destination (deleting file records → deleting the Cloudinary binaries). An agent must
**NEVER run, suggest running, or auto-chain into** any of these:

- `strapi transfer` (any direction) — wipes the destination, deletes Cloudinary assets
- `strapi import` / `pnpm restore` — overwrites the DB (gated behind `api/scripts/guard-forbidden.mjs`)
- `strapi deploy` / any `deploy:cloud*` — production push
- any `delete:cloud-media*` — deletes Cloudinary binaries directly

Also never (without explicit per-action human approval): push/merge to `main` or any
protected/deployed branch; modify production/staging; touch secrets, credentials, or access
controls. Recovery is humans-only and supervised — see `docs/RESTORE-RUNBOOK.md`.

## Safety mechanisms already in place (Pillar 1 — PR #17)

- **Cloudinary auto-delete disabled at startup** (`api/src/index.ts` → `installNoDeleteOverride`,
  **fails closed in production**). Deleting a Strapi record now *orphans* the image, never
  destroys it. Verify the deployed build logs `[safety] Cloudinary auto-delete disabled`.
- **Destructive scripts quarantined**; `restore` blocked by default behind the guard.
- **Read-only backups**: `cd api && pnpm backup:safe` → `api/backups/` (binaries via git-lfs +
  `cloudinary-manifest.json` + `cloudinary-upload-plan.json`). Nightly GitHub Action. Recovery
  tool: `scripts/restore-cloudinary.py`.

---

## Architecture / data flow

```
Strapi Cloud (Postgres = content)  →  Cloudinary (media binaries)
        │                                   │
        └──────────────┬────────────────────┘
                       ▼
   frontend reads content via the PUBLIC prod API (VITE_PROD_API_URL, no token)
   build-time snapshot → frontend/src/generated/static-data.json seeds React Query
   Strapi webhook → Vercel rebuild → live site
```

**Strapi content types** (source of the content-vs-code map):
- Singletons: `about`, `approach`, `connect`, `home`, `press`, `global`, `menu`
- Collections: `project`, `press-article`, `category`
- Note: there is **no usable Strapi API token** (all empty); content is read token-free via
  the public API. Backups run in Cloudinary-only mode.

## Commands

- Dev: `pnpm dev` (all) · `pnpm dev:api` · `pnpm dev:frontend`
- **Tests (api):** `cd api && pnpm test` (vitest). ⚠️ The api package is named
  `my-strapi-project`, so `pnpm --filter api` does NOT resolve — use `pnpm --filter ./api`
  (path filter) or `cd api && pnpm …`.
- Read-only backup: `cd api && pnpm backup:safe` (needs Cloudinary creds; Strapi token optional).
- Package manager: **pnpm only** (never npm/yarn).

---

## Content-vs-code map

**Rule of thumb:** *values* (page text, project/press entries, contact info, images, any
color set via a color-picker field, item ordering) = **CMS content → Ardis self-serves in
the Strapi admin**. *Structure* (layout, spacing, Tailwind color classes not backed by a
color-picker field, section headings, field labels, fonts, decorative SVGs) = **React code →
agent**. Beware **hardcoded-traps**: strings that look like editable content but live in JSX.

### CMS content (Strapi admin — Ardis self-serves)
| What | Where |
|---|---|
| Page body text | `about.topRightText` / `about.bottomLeftText`, `press.introduction`, `approach.quote`, `home.quote.quoteText`/`name` |
| Contact info | `connect.email` / `connect.phone` / `connect.address` |
| Images | `about.*Image`, `approach.coverImage`, `home.leftImage`/`rightImage`, `project.cover`/`images`, `press-article.cover`/`images` |
| Color-picker colors | `approach.quoteBgColor`, `home.quoteBgColor` / `numberColors`, `global.lightThemeColor`, `press-article.color` |
| Ordering | `press.pressArticles` relation (drag-drop), `home.projects` relation (drag-drop) |
| Add/edit entries | `project` and `press-article` collections |

### React code (agent)
- Layout & spacing; Tailwind color classes **not** backed by a color-picker field (e.g. the
  Approach gray panel `bg-gray-100` at `frontend/src/pages/ApproachPage.tsx:239`).
- Section headings: "What We Do" / "How We Do It" (`ApproachPage.tsx:231,317`), "Let's
  Connect" / "Get In Touch" / "Send a Message" (`ConnectPage.tsx:157,172,250`).
- Field **labels**: "Location", "Email", "Phone" (`ConnectPage.tsx:196,208,220`).
- Fonts, animations (the snake timeline), decorative SVGs (`components/ArchBackground.tsx`).

### Hardcoded-traps (look like content, are code) — with `file:line`
- `ConnectPage.tsx:220` **and** `:239` — the "Location" label (the *address value* is CMS, the
  *label* is code; the duplicate at :239 is the no-data fallback).
- `ApproachPage.tsx:231` / `:317` — "What We Do" / "How We Do It" headings.
- Fallback values: `ConnectPage.tsx:229-241` (hello@beckwithbarrow.com, etc.); `HomePage.tsx`
  fallback images/quote (Unsplash URL, "Julia Morgan").

---

## Workflow (tiered)

- Branch off `main` → automated checks (build / lint / types, `cd api && pnpm test`) + **visual
  verification** (screenshot the change) → tiered:
  - **Low technical risk** (copy, color, spacing, content): auto-merge after checks.
  - **Structural / risky** (Strapi schema, data shape, deps, anything touching the backup/asset
    path): PR for James to review.
- **Design changes ship-then-refine:** go live, post a screenshot + heads-up so Ardis (design
  authority) knows to look, and keep a **one-command revert** ready.
- Never commit directly to `main`; use feature branches. Conventional Commits.

## Pointers

- Design spec: `reqts/website-management-agent.md` · Pillar plans: `docs/plans/`
- Recovery runbook: `docs/RESTORE-RUNBOOK.md` · Forbidden-ops guard: `api/scripts/guard-forbidden.mjs`
