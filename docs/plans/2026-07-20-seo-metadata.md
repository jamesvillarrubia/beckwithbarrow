# SEO Metadata Implementation Plan

**Branch:** feature/seo-metadata (worktree .worktrees/seo-improvements, off main)
**Created:** 2026-07-20
**Source audit:** docs/analysis/2026-07-20-seo-audit.md
**Scope:** P0/P1 SEO fixes WITHOUT prerendering. React SPA (Vite) + react-helmet-async.

## Objective
Give every route unique, crawlable metadata; add structured data and a real sitemap.
No rendering-architecture change (prerendering is explicitly out of scope / a later project).

## Non-Goals
- No SSR / SSG / prerendering.
- No content rewriting beyond the page meta copy defined here.
- No Strapi/CMS edits (alt-text backfill is a separate content task).

## Hard gates (per CLAUDE.md)
- TDD: no implementation without a failing test first. Frontend uses Vitest + @testing-library/react.
- Subagents implement + test + report ONLY. They do NOT commit. Main agent commits after two-stage review.
- pnpm only. Conventional Commits.

## Canonical SEO copy (use verbatim; brand voice = "full-service, boutique, upscale")
Base URL: https://beckwithbarrow.com  ·  OG image (existing): https://res.cloudinary.com/dqeqavdd8/image/upload/v1758995559/demkxyyquntlquyz4wgf.jpg

| Route | `<title>` | `<meta description>` |
|---|---|---|
| `/` | Beckwith Barrow Interior Design \| The Berkshires & Boston | A full-service, boutique interior design firm creating upscale, livable interiors across The Berkshires and Boston. |
| `/about` | About \| Beckwith Barrow Interior Design | Meet Beckwith Barrow — a boutique interior design studio delivering full-service, upscale residential design in The Berkshires and Boston. |
| `/approach` | Our Approach \| Beckwith Barrow Interior Design | Our collaborative, detail-driven interior design process for upscale homes across The Berkshires and Boston. |
| `/connect` | Contact \| Beckwith Barrow Interior Design | Get in touch with Beckwith Barrow, a boutique interior design firm based in The Berkshires and Boston. |
| `/press` | Press \| Beckwith Barrow Interior Design | Beckwith Barrow in the press — featured interior design projects and recognition across The Berkshires and Boston. |
| `/press/:slug` | `${article.title} \| Press \| Beckwith Barrow` | article excerpt/first paragraph, trimmed to ~155 chars; fallback to the Press description above. |
| `/project/:slug` | `${project.title} \| Beckwith Barrow Interior Design` | project excerpt/summary trimmed to ~155 chars; fallback to the Home description above. |

Canonical for each = `https://beckwithbarrow.com` + pathname.
Per-page OG: og:title = page title, og:description = page description, og:image = page hero if available else the default OG image, og:url = canonical. Add `twitter:card=summary_large_image`.

## Tasks

### Task 1 — Test infra + `<Seo>` foundation
**Files:** Create `frontend/vitest.config.ts` (or extend vite.config), `frontend/src/test/setup.ts`, `frontend/src/components/Seo.tsx`, `frontend/src/components/Seo.test.tsx`, `frontend/src/config/site.ts`. Modify `frontend/package.json` (add devDeps + `"test": "vitest run"`), `frontend/src/App.tsx` (wrap in `<HelmetProvider>`).
- Add devDeps: `vitest @testing-library/react @testing-library/jest-dom jsdom` and dep `react-helmet-async` (via `pnpm add` — never hand-edit versions).
- `<Seo>` props: `title`, `description`, `canonicalPath`, `ogImage?`, `type?`, `jsonLd?` (object → `<script type="application/ld+json">`).
- TDD: Seo.test.tsx renders `<HelmetProvider><Seo .../></HelmetProvider>`, waits, asserts `document.title` and the `meta[name=description]` / `link[rel=canonical]` / `meta[property="og:title"]` content. (react-helmet-async writes to `document.head`.)

### Task 2 — Per-page `<Seo>` on every route
**Files:** Modify each page in `frontend/src/pages/` (Home, About, Approach, Connect, Press, PressArticle, Project). Tests colocated `*.test.tsx` for at least Home, Press (static) and PressArticle (dynamic title from data).
- Use the copy table above. Dynamic pages derive title/description from fetched data with the specified fallbacks.
- TDD first: assert each page sets the expected `document.title`. Mock data hooks (React Query) as needed; keep tests light — a page-level render asserting title is enough.

### Task 3 — Structured data + keyword cleanup
**Files:** Modify `frontend/index.html` (add static JSON-LD, remove keyword stuffing), `frontend/src/pages/PressArticlePage.tsx` (per-article `Article` JSON-LD via `<Seo jsonLd=...>`).
- Static site-wide JSON-LD in `index.html` `<head>`: a `ProfessionalService`/`InteriorDesignBusiness` (`@type` "ProfessionalService") + `WebSite` graph — name, url, description, image (default OG), `areaServed: ["The Berkshires","Boston"]`, `sameAs` = social links if present in the footer/menu (else omit). Do NOT invent a street address; omit `address` unless a real one is already in the repo/Connect data.
- Remove the repeated `meta keywords` (delete it or replace with a short 4–6 term honest list).
- TDD: a small unit test that the `Article` JSON-LD builder produces valid `@type: Article` with headline = article.title.

### Task 4 — Real sitemap.xml + robots
**Files:** Create `frontend/scripts/generate-sitemap.ts` (+ colocated test for the pure URL-building fn), wire into `build` script; modify `frontend/public/robots.txt`.
- Static routes always included; dynamic press/project URLs pulled from Strapi (reuse the API base + fetch pattern from `frontend/scripts/generate-static-data.ts`). Write to `frontend/public/sitemap.xml` (so Vercel serves a real XML file, fixing the false-200).
- Add `Sitemap: https://beckwithbarrow.com/sitemap.xml` to robots.txt and a positive `User-agent: *\nAllow: /`.
- TDD: pure `buildSitemapXml(urls)` returns valid `<urlset>` with `<loc>` entries; unit-tested. Network fetch stays in the script shell, not the tested fn.

## Confirmation (main agent + confirm subagent)
1. `pnpm --dir frontend test` green; `pnpm --dir frontend build` succeeds; `tsc -b` clean.
2. Runtime check (react-helmet is client-side): serve `pnpm --dir frontend preview` and, via headless browser, load `/`, `/about`, `/press` and assert `document.title` differs per route.
3. Raw-file checks on the built `dist/`: `sitemap.xml` is valid XML; `index.html` contains the LocalBusiness JSON-LD; `robots.txt` has the `Sitemap:` line; keyword stuffing gone.
4. Final code-quality review subagent over the whole diff.
