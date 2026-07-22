# Beckwith Barrow — Content vs. Code Map

**Purpose:** Tells content editor Ardis what she can change herself in the Strapi admin
vs. what requires a developer (and which "content-looking" strings are actually hardcoded).
**Audited:** 2026-06-15 against `main` (frontend/src/pages/*.tsx + api/src/api/*/content-types).
**Strapi admin:** https://striking-ball-b079f8c4b0.strapiapp.com/admin

> This is the canonical routing table for the hybrid operating model: an incoming request is
> **CMS-content** (Ardis edits in Strapi), **React-code** (developer/agent), or a **trap**
> (looks like content, is hardcoded). The agent must consult this before routing any request.

---

## 1. Strapi Content Types

### Single Types (one record each — edit in place in the Strapi admin)

| Type | Admin label | Key editable fields |
|---|---|---|
| `global` | **Global** | `siteName`, `siteDescription`, `lightThemeColor` (color picker — decorative SVG accent lines sitewide), `defaultSeo` (metaTitle, metaDescription, shareImage) |
| `menu` | **Menu** | `menuItem` repeatable: `label`, `url`, `external`, `openInNewTab`, `order`. Controls nav bar + footer links on every page. |
| `home` | **Home Page** | `leftImage`, `rightImage` (Cloudinary), `quote` (`quoteText`, `name`), `quoteBgColor` (color picker), `numberColors` (color picker), `projects` (ordered relation — which projects show + order), `seo` |
| `approach` | **Approach** | `coverImage`, `quote`, `quoteBgColor` (color picker), `servicesList` (repeatable `text`), `stages` (repeatable: `title`, `description` richtext, optional `image`). NOTE: `title` field exists but is NOT rendered. |
| `about` | **About** | `title` (heading), `topLeftImage`, `topRightText` (richtext), `bottomLeftText` (richtext), `bottomRightImage` |
| `connect` | **Connect** | `email`, `address`, `phone` (values only — the labels are hardcoded) |
| `press` | **Press & Media Page** | `title`, `introduction` (richtext), `pressArticles` (ordered relation — which articles show + order) |

### Collection Types

| Type | Admin label | Key editable fields |
|---|---|---|
| `project` | **Project** | `title`, `slug` (auto), `description`, `cover`, `images` (multiple), `categories` |
| `press-article` | **Press Article** | `title`, `slug`, `source`, `publicationDate`, `cover`, `images`, `excerpt`, `articleContent` (richtext), `externalLink`, `showExternal` (bool — redirect to external instead of internal page), `color` (color picker) |
| `category` | **Category** | `name`, `slug`, `description` — tags Projects (currently not rendered in UI) |

---

## 2. Per-Page Map (condensed — see §3 for traps)

**HomePage** (`home`): hero images (`leftImage`/`rightImage`), slogan (`quote.quoteText`/`name`),
quote bg (`quoteBgColor`), project grid + order (`projects` relation), number color (`numberColors`)
— all CMS. Logo is hardcoded SVG (`Logo.tsx`). Footer "Connect with us" hardcoded (`Footer.tsx:54`).

**ApproachPage** (`approach`): cover image, services list, stage titles/descriptions/images,
optional quote + `quoteBgColor` — all CMS. Headings "What We Do" (`ApproachPage.tsx:232`) and
"How We Do It" (`ApproachPage.tsx:318`) are **hardcoded**. The gray panel behind the cover image
is hardcoded `bg-gray-100` at `ApproachPage.tsx:239` (a fixed-position decorative block).

**ConnectPage** (`connect`): email/phone/address **values** are CMS; every **label** and heading
is hardcoded (see traps). "Location" label at `ConnectPage.tsx:220`.

**AboutPage** (`about`): heading (`title`), both rich-text blocks, both images — all CMS.
Decorative line color from `global.lightThemeColor`/`home.numberColors`.

**PressPage** (`press`): heading (`title`), intro (`introduction`), articles + order
(`pressArticles` relation) — all CMS. Link labels "Read article"/"View article" hardcoded.

**PressArticlePage** (`press-article`): all article fields CMS. "Gallery" heading hardcoded
(`PressArticlePage.tsx:311`), "Back to Press" hardcoded.

**ProjectPage** (`project`): title, description, cover, gallery images — all CMS. Category tags
and metadata (Location/Year/Client) exist in schema but JSX is **commented out** — filling them
in Strapi has no visible effect today (`ProjectPage.tsx:244-263`).

---

## 3. Trap Cases — hardcoded strings that look like CMS content

| Looks like content | Reality | file:line |
|---|---|---|
| "Let's Connect" H1 | hardcoded | `ConnectPage.tsx:157` |
| "Ready to bring your vision to life…" subtitle | hardcoded | `ConnectPage.tsx:159` |
| "Get In Touch" / "Send a Message" headings | hardcoded | `ConnectPage.tsx:172`, `:250` |
| "Location" / "Email" / "Phone" labels | hardcoded labels (values are CMS) | `ConnectPage.tsx:220`, `:196`, `:207` |
| Form labels/placeholders/buttons/status msgs | hardcoded | `ConnectPage.tsx:257-347` |
| Fallback contact info (hello@…, +1 (555)…, San Francisco) | hardcoded placeholder, shown only if CMS empty | `ConnectPage.tsx:229-242` |
| "What We Do" / "How We Do It" headings | hardcoded (the `approach.title` field is unused) | `ApproachPage.tsx:232`, `:318` |
| Approach gray panel behind cover image | hardcoded `bg-gray-100` | `ApproachPage.tsx:239` |
| "Connect with us" footer button | hardcoded | `Footer.tsx:54` |
| "Gallery" heading | hardcoded | `PressArticlePage.tsx:311` |
| Fallback hero quote ("Architecture is a visual art…" / "Julia Morgan") | hardcoded, shown only if `home.quote` empty | `HomePage.tsx:235`, `:238` |
| Project categories + metadata (Location/Year/Client) | schema fields exist but JSX commented out — no visible effect | `ProjectPage.tsx:244-263` |
| Breadcrumb "Back to Projects" | hardcoded default | `Breadcrumb.tsx:22` |

---

## 4. Shared / global surfaces

| Surface | Source | Who edits |
|---|---|---|
| Logo (SVG mark + wordmark) | hardcoded `Logo.tsx` | Developer |
| Nav + footer links | `menu.menuItem` (Strapi) | Ardis |
| Footer "Connect with us" button | hardcoded `Footer.tsx:54` | Developer |
| Accent/theme color (decorative lines) | `global.lightThemeColor` (Strapi) | Ardis |
| Default SEO meta | `global.defaultSeo` (Strapi) | Ardis |

---

## How the agent uses this

1. A request arrives → find the surface in this map.
2. **CMS-content** → Ardis self-serves in the Strapi admin (or agent does it via admin if asked); no code change.
3. **React-code** → developer/agent change on a branch via the Pillar 3 workflow.
4. **Trap** → tell the requester it can't be changed in the CMS; it's a code change (cite the file:line here).

Keep this map updated when pages or schemas change — it is only useful if it's accurate.
