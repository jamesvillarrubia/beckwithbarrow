# Press Article Structure

## Overview

The press system has been restructured to be more robust and flexible, similar to the Project system.

## Content Types

### 1. Press Article (Collection Type)
**API ID:** `press-article`  
**Endpoint:** `/api/press-articles`

Individual press articles with full content support and external link options.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | String | Yes | Article headline/title |
| `slug` | UID | Auto | URL-friendly identifier (auto-generated from title) |
| `source` | String | No | Publication name (e.g., "New England Home") |
| `publicationDate` | Date | No | When the article was published |
| `cover` | Media | No | Cover/preview image for the article |
| `images` | Media (multiple) | No | Gallery of additional images |
| `excerpt` | Text | No | Short description or excerpt |
| `articleContent` | Rich Text | No | Full article content (for internal display) |
| `externalLink` | String | No | URL to external article |
| `showExternal` | Boolean | Yes | `true` = link to external URL, `false` = show internal content |
| `color` | Color | No | Accent color for the article (hex code) |

#### Display Logic

```javascript
if (showExternal && externalLink) {
  // Show preview and link to external article
  // Display: cover, title, source, date, excerpt, "Read More" button
} else {
  // Show full internal article
  // Display: cover, title, source, date, articleContent, images gallery
}
```

### 2. Press Page (Single Type)
**API ID:** `press`  
**Endpoint:** `/api/press`

Landing page content for the Press section.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | String | No | Page title (default: "Press & Media") |
| `introduction` | Rich Text | No | Introductory text for the press page |

## Frontend Implementation

### Fetching Press Articles

```typescript
// List all press articles (for press landing page)
const articles = await apiService.getCollection('press-articles', 'cover');

// Get single press article (for detail page)
const article = await apiService.getBySlug('press-articles', slug, 'cover,images');
```

### Component Structure

```
/pages
  - PressPage.tsx          // Landing page - lists all articles
  - PressArticlePage.tsx   // Detail page - shows single article

/components
  - PressArticleCard.tsx   // Card preview for article list
  - PressArticleGallery.tsx // Gallery view for internal articles
```

## Migration from Old Structure

### Old Structure (Components)
- Press items were components within a singleton
- Limited to basic fields: title, text, image, link
- No individual article pages
- No slug-based routing

### New Structure (Collection Type)
- Press articles are full collection type entries
- Rich content support with galleries
- Individual article detail pages
- Slug-based routing
- Choose between external links or internal content

### Migration Steps

1. **Extract existing press items** from the Press singleton
2. **Create new Press Article entries** in Strapi
3. **Upload images** to each article's gallery
4. **Set `showExternal`** flag based on whether full content exists
5. **Update frontend** to fetch from `/api/press-articles`

## Example Usage in Strapi

### Creating an External Article Link

```json
{
  "title": "A Contemporary Farmhouse in Williamstown",
  "source": "New England Home",
  "publicationDate": "2021-09-28",
  "cover": [upload image],
  "excerpt": "Karen Beckwith Creative transforms a Berkshire home...",
  "externalLink": "https://www.nehomemag.com/a-contemporary-farmhouse-in-williamstown/",
  "showExternal": true,
  "color": "#2C5F2D"
}
```

### Creating an Internal Article

```json
{
  "title": "Designer Showcase at Ventfort Hall",
  "source": "New England Home",
  "publicationDate": "2011-05-15",
  "cover": [upload image],
  "images": [upload multiple images],
  "articleContent": "Full article text with rich formatting...",
  "showExternal": false,
  "color": "#2C5F2D"
}
```

## URL Structure

```
/press                          → Press landing page (list all articles)
/press/article-slug-here        → Individual article detail page
```

## API Populate Examples

```typescript
// Basic list (cover images only)
GET /api/press-articles?populate=cover

// Full article detail (all relations)
GET /api/press-articles?filters[slug][$eq]=article-slug&populate=cover,images

// Sorted by date (newest first)
GET /api/press-articles?sort=publicationDate:desc&populate=cover

// Filter by source
GET /api/press-articles?filters[source][$eq]=New%20England%20Home&populate=cover
```

## Notes

- **Color field** requires the Color Picker plugin to be installed
- **Slug** is auto-generated from title but can be manually edited
- **Draft & Publish** is enabled - articles must be published to appear
- **Images gallery** works exactly like Project images - use OptimizedImage component

