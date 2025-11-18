# Press Page Setup Documentation

## Overview

The Press system displays press coverage, media mentions, and publications. It features a two-tiered structure:

1. **Press Landing Page** (`/press`) - Lists all press articles
2. **Individual Article Pages** (`/press/:slug`) - Full article detail with gallery

## Architecture

### Strapi Content Types

#### 1. Press Page (Singleton)
- **API ID**: `press`
- **Endpoint**: `/api/press`
- **Purpose**: Landing page intro content
- **Fields**:
  - `title` - Page title (default: "Press & Media")
  - `introduction` - Rich text intro

#### 2. Press Article (Collection)
- **API ID**: `press-article`
- **Endpoint**: `/api/press-articles`
- **Purpose**: Individual press articles
- **Fields**:
  - `title` - Article headline
  - `slug` - URL-friendly identifier (auto-generated)
  - `source` - Publication name
  - `publicationDate` - Publish date
  - `cover` - Cover/preview image
  - `images` - Gallery of additional images
  - `excerpt` - Short description
  - `articleContent` - Full article content (rich text)
  - `externalLink` - URL to external article
  - `showExternal` - Boolean flag for display mode
  - `color` - Accent color (hex)

### Display Modes

#### External Mode (`showExternal: true`)
```
Press Landing → Click → External Website
```
- Shows article preview on landing page
- Clicking opens external link in new tab
- Article detail page redirects to external URL

#### Internal Mode (`showExternal: false`)
```
Press Landing → Click → Article Detail Page
```
- Shows article preview on landing page
- Clicking navigates to `/press/:slug`
- Shows full article content + gallery

## Frontend Components

### PressPage.tsx
**Path**: `/frontend/src/pages/PressPage.tsx`  
**Route**: `/press`

Displays press landing page with:
- Page title and introduction
- Grid of press article cards
- Each card shows: cover, source, date, title, excerpt
- Smart linking (external or internal based on `showExternal`)

**Data Fetching**:
```typescript
// Page intro
const pressPage = await apiService.getSingleType('press');

// Articles list
const articles = await apiService.getCollection('press-articles', 'cover');
```

### PressArticlePage.tsx
**Path**: `/frontend/src/pages/PressArticlePage.tsx`  
**Route**: `/press/:slug`

Displays individual article with:
- Cover image (hero)
- Article metadata (source, date)
- Title with color accent
- Excerpt
- Full article content (markdown)
- Image gallery with thumbnails
- External link button (if available)
- Back to Press link

**Data Fetching**:
```typescript
const article = await apiService.getBySlug('press-articles', slug, 'cover,images');
```

**Auto-Redirect**: If `showExternal = true`, automatically redirects to external URL.

## Usage Examples

### Creating an External Article Link

In Strapi Admin:

1. Go to **Content Manager** → **Press Article** → **Create new entry**
2. Fill in:
   ```
   Title: A Contemporary Farmhouse in Williamstown
   Source: New England Home
   Publication Date: 2021-09-28
   External Link: https://www.nehomemag.com/...
   Show External: ✅ true
   Cover: [upload image]
   Excerpt: Karen Beckwith Creative transforms...
   Color: #2C5F2D
   ```
3. **Publish**

Result: Clicking this article on `/press` opens the external link.

### Creating an Internal Article

In Strapi Admin:

1. Go to **Content Manager** → **Press Article** → **Create new entry**
2. Fill in:
   ```
   Title: Designer Showcase at Ventfort Hall
   Source: New England Home
   Publication Date: 2011-05-15
   Show External: ❌ false
   Cover: [upload image]
   Images: [upload gallery images]
   Article Content: [full article markdown]
   Excerpt: Notes from the field...
   Color: #2C5F2D
   ```
3. **Publish**

Result: Clicking this article navigates to `/press/designer-showcase-at-ventfort-hall` with full content.

## Styling

### Color Accents

Each article can have a custom accent color:
- Applied as left border on cover image
- Applied to title color
- Applied to "Read More" button
- Falls back to default black if not set

### Responsive Design

- **Mobile**: Single column, stacked layout
- **Tablet**: Grid with 3/9 column split (image/content)
- **Desktop**: Same as tablet with larger spacing

### Typography

- Titles: Serif, light weight, large size
- Body: Sans-serif, comfortable line height
- Meta info: Smaller, medium weight

## API Queries

### List All Articles (Sorted by Date)

```typescript
GET /api/press-articles?sort=publicationDate:desc&populate=cover
```

### Get Single Article by Slug

```typescript
GET /api/press-articles?filters[slug][$eq]=article-slug&populate=cover,images
```

### Filter by Source

```typescript
GET /api/press-articles?filters[source][$eq]=New%20England%20Home&populate=cover
```

## Permissions

Required public permissions in Strapi:

- **Press** (Singleton): `find`
- **Press-article** (Collection): `find`, `findOne`

## Cache Strategy

- **Stale Time**: 5 minutes
- **Retries**: 3 with exponential backoff
- **Persistence**: Cached in localStorage via React Query

Clear cache: Press **Ctrl + Shift + K** in browser

## Migration from Old Structure

See: `/docs/PRESS-MIGRATION-GUIDE.md`

The old structure used embedded components within a singleton. The new structure uses a full collection type with individual pages.

## Testing Checklist

- [ ] Press landing page loads at `/press`
- [ ] Press intro text displays
- [ ] All articles show with cover images
- [ ] External articles open in new tab
- [ ] Internal articles navigate to detail page
- [ ] Article detail shows full content
- [ ] Image gallery works with thumbnails
- [ ] Back to Press link works
- [ ] Mobile responsive design works
- [ ] Color accents display correctly

## Common Issues

### Articles not showing?
- Check if published in Strapi
- Verify public permissions are enabled
- Clear React Query cache (Ctrl + Shift + K)

### Images not loading?
- Check image URLs in browser DevTools
- Verify images are in Strapi media library
- Check `populate` parameter in API query

### Slug routing not working?
- Verify route exists in `App.tsx`
- Check that slug matches exactly
- Look for errors in browser console

## Performance Notes

- Images use Cloudinary transformations
- Lazy loading for page components
- React Query caching for instant navigation
- LocalStorage persistence across sessions

## Related Documentation

- `/docs/PRESS-ARTICLE-STRUCTURE.md` - Detailed field reference
- `/docs/PRESS-MIGRATION-GUIDE.md` - Migration steps
- `/docs/PRESS-ARTICLES-DATA.md` - Extracted article data from old site
