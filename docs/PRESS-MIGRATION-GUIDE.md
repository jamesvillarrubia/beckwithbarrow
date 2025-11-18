# Press System Migration Guide

## Overview

This guide walks you through migrating the Press system from the old component-based structure to the new collection-type structure with individual article pages.

## What Changed

### Before (Old Structure)
- **Press Singleton** with embedded `pressItems` components
- Limited fields: title, text, image, link, color, source, date
- No individual article pages
- All content displayed on single `/press` page

### After (New Structure)
- **Press Page Singleton** - Just intro content
- **Press Article Collection Type** - Individual articles with rich content
- Each article has its own detail page at `/press/:slug`
- Support for both external links AND internal full article content
- Image galleries for each article
- Boolean flag to choose display mode

## Migration Steps

### Step 1: Update Strapi Content Types

The new content types have been created:

1. **Press Article Collection Type**
   - Location: `/api/src/api/press-article/`
   - Files: `schema.json`, `controllers/`, `routes/`, `services/`

2. **Updated Press Singleton**
   - Location: `/api/src/api/press/content-types/press/schema.json`
   - Now only contains: `title`, `introduction`

### Step 2: Restart Strapi

```bash
cd api
pnpm run develop
```

Strapi will detect the new content types and update the database schema automatically.

### Step 3: Configure Permissions

In Strapi Admin Panel:

1. Go to **Settings** → **Roles** → **Public**
2. Find **Press-article** in the list
3. Enable these permissions:
   - ✅ `find` (list all articles)
   - ✅ `findOne` (get single article)
4. Save

### Step 4: Migrate Existing Press Data

You need to manually recreate press items as Press Article entries:

#### For Each Existing Press Item:

1. Go to **Content Manager** → **Press Article** → **Create new entry**

2. Fill in the fields:
   ```
   Title: [from old pressItem.title]
   Source: [from old pressItem.source]
   Publication Date: [from old pressItem.date]
   Excerpt: [short description or first paragraph]
   Cover: [upload the image from old pressItem.image]
   External Link: [from old pressItem.link]
   Show External: true (if you want to link out)
   Color: [from old pressItem.color]
   ```

3. Set **Show External**:
   - `true` = Article links to external URL
   - `false` = Article displays full content internally

4. If `showExternal = false`, you need to add:
   - Article Content (rich text with full article)
   - Images gallery (additional photos)

5. **Publish** the entry

#### Example Migration Data

Based on your existing press articles:

**Article 1: New England Home - Contemporary Farmhouse**
```
Title: A Contemporary Farmhouse in Williamstown
Source: New England Home
Publication Date: 2021-09-28
External Link: https://www.nehomemag.com/a-contemporary-farmhouse-in-williamstown/
Show External: true
Cover: [download and upload image]
```

**Article 2: The Berkshire Edge**
```
Title: When Life Changes, Design Supports
Source: The Berkshire Edge
Publication Date: 2019-01-23
External Link: https://theberkshireedge.com/real-estate/when-life-changes-design-supports/
Show External: true
Cover: [download and upload logo]
```

*(Continue for all 7 articles from `/docs/PRESS-ARTICLES-DATA.md`)*

### Step 5: Update Press Page Intro

1. Go to **Content Manager** → **Press** (singleton)
2. Update:
   - Title: "Press & Media"
   - Introduction: Your intro text
3. Save

### Step 6: Test Frontend

```bash
cd frontend
pnpm run dev
```

Visit:
- `http://localhost:5173/press` - Should show list of articles
- `http://localhost:5173/press/[article-slug]` - Should show article detail

### Step 7: Clear Frontend Cache

Press **Ctrl + Shift + K** in the browser to clear the React Query cache.

## New Content Type Fields Reference

### Press Article Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `title` | String | Yes | Article headline | "A Contemporary Farmhouse" |
| `slug` | UID | Auto | URL identifier | "contemporary-farmhouse" |
| `source` | String | No | Publication name | "New England Home" |
| `publicationDate` | Date | No | Publish date | 2021-09-28 |
| `cover` | Media | No | Cover/preview image | [image] |
| `images` | Media[] | No | Gallery images | [image, image, ...] |
| `excerpt` | Text | No | Short description | "Karen Beckwith Creative..." |
| `articleContent` | Rich Text | No | Full article text | [markdown content] |
| `externalLink` | String | No | External URL | "https://..." |
| `showExternal` | Boolean | Yes | Link out vs show internal | true/false |
| `color` | Color | No | Accent color | "#2C5F2D" |

## Display Logic

### When `showExternal = true`
- Press page shows article preview card
- Click → Opens external link in new tab
- Detail page redirects to external URL

### When `showExternal = false`
- Press page shows article preview card
- Click → Opens internal article detail page (`/press/:slug`)
- Shows full article content + gallery

## Frontend Changes

### Updated Components

1. **PressPage.tsx**
   - Now fetches from `/api/press-articles` collection
   - Displays article cards with cover images
   - Links to either external URL or `/press/:slug`

2. **PressArticlePage.tsx** (NEW)
   - Displays full article detail
   - Shows cover, content, gallery
   - Redirects if `showExternal = true`

3. **App.tsx**
   - Added route: `/press/:slug` → `<PressArticlePage />`

### API Endpoints

```
GET /api/press                     → Page intro content
GET /api/press-articles            → List all articles
GET /api/press-articles/:id        → Get article by ID
GET /api/press-articles?filters[slug][$eq]=slug → Get by slug
```

## Troubleshooting

### Articles not showing up?
- Check if articles are **Published** in Strapi
- Check if **Public** role has `find` and `findOne` permissions

### Images not loading?
- Verify images are uploaded to Strapi media library
- Check if images are populated in API response
- Use browser DevTools → Network tab to check image URLs

### "Article Not Found" error?
- Verify the slug matches exactly (check URL)
- Ensure article is published
- Check API response in browser console

### External links not working?
- Verify `showExternal = true`
- Check that `externalLink` field has valid URL
- Check browser console for redirect logs

## Rollback Plan

If you need to revert to the old structure:

1. Delete `/api/src/api/press-article/` directory
2. Restore old `press/schema.json` from git:
   ```bash
   cd api
   git checkout HEAD -- src/api/press/content-types/press/schema.json
   ```
3. Restore old `PressPage.tsx`:
   ```bash
   cd frontend
   git checkout HEAD -- src/pages/PressPage.tsx
   ```
4. Remove PressArticlePage route from `App.tsx`
5. Restart Strapi and frontend

## Next Steps After Migration

1. **SEO Optimization**
   - Add meta descriptions to each article
   - Consider adding Open Graph images

2. **Content Enhancement**
   - For external articles, consider transcribing content for internal display
   - Add more gallery images to showcase projects

3. **Performance**
   - Images are already optimized via OptimizedImage component
   - Consider adding lazy loading for article lists

4. **Analytics**
   - Track which articles get the most views
   - Monitor external link clicks

## Support

See documentation:
- `/docs/PRESS-ARTICLE-STRUCTURE.md` - Detailed field reference
- `/docs/PRESS-ARTICLES-DATA.md` - Extracted article data

Questions? Check the Strapi logs or frontend console for errors.

