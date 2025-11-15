# About Page Dynamic Content - Quick Setup Guide

## Summary

The About page now fetches content dynamically from Strapi instead of using hardcoded text. This allows you to update the about page content through Strapi's admin panel without touching code.

## Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
cd frontend
pnpm install
```

This installs:
- `react-markdown` - For rendering rich text
- `remark-gfm` - GitHub Flavored Markdown support

### Step 2: Configure Strapi Permissions

1. Open Strapi admin panel: `http://localhost:1337/admin` (or your production URL)
2. Go to **Settings** → **Users & Permissions Plugin** → **Roles** → **Public**
3. Find **About** in the permissions list
4. Check the box for **find** (allows public read access to the about page)
5. **Save**

### Step 3: Add Content in Strapi

1. In Strapi admin, go to **Content Manager** → **Single Types** → **About**
2. Add a **Title** (e.g., "About Our Studio")
3. Click **"Add a component to blocks"** to add content blocks:

   **Available Block Types:**
   - **Media** - Upload a single image or video
   - **Quote** - Add a quote with author name
   - **Rich text** - Write formatted content with markdown
   - **Slider** - Upload multiple images for a gallery

4. **Save** the content
5. The content is automatically available (no publish step needed, `draftAndPublish` is disabled)

## Testing

1. Start Strapi (if not running):
   ```bash
   cd api
   pnpm develop
   ```

2. Start the frontend:
   ```bash
   cd frontend
   pnpm dev:local    # Uses local Strapi at localhost:1337
   # OR
   pnpm dev:prod     # Uses production Strapi
   ```

3. Navigate to: `http://localhost:5173/about`

## What You'll See

- Dynamic title (if set)
- All content blocks in the order you arranged them
- Responsive layout that matches the rest of the site
- Loading spinner while fetching
- Error message if Strapi is unavailable

## Example Content Structure

Here's a suggested content layout:

1. **Title:** "About Beckwith Barrow"
2. **Media Block:** Team photo
3. **Rich Text Block:** Introduction paragraphs
4. **Quote Block:** Philosophy or testimonial
5. **Rich Text Block:** More details about services
6. **Slider Block:** Office/project photos

## Markdown Examples (for Rich Text blocks)

```markdown
# Large Heading

## Medium Heading

### Small Heading

Regular paragraph text with **bold** and *italic* formatting.

- Bullet point 1
- Bullet point 2
- Bullet point 3

1. Numbered list
2. Second item
3. Third item

[Link text](https://example.com)

> This is a blockquote
```

## Troubleshooting

### "Unable to load about page content"

**Check:**
- Is Strapi running? (`cd api && pnpm develop`)
- Are public permissions enabled for the About endpoint?
- Open browser DevTools console - look for "About API Response:"

### Images not showing

**Check:**
- Images uploaded in Strapi admin?
- Cloudinary configured properly?
- Check browser Network tab for failed image requests

### Styling looks wrong

**Check:**
- Dependencies installed? (`pnpm install`)
- Any console errors?
- Try clearing browser cache

## Technical Details

### API Endpoint
```
GET /api/about?populate[blocks][populate][file]=*&populate[blocks][populate][files]=*
```

### Response Structure
```json
{
  "data": {
    "id": 1,
    "title": "About Our Studio",
    "blocks": [
      {
        "id": 1,
        "__component": "shared.media",
        "file": { "url": "...", "formats": {...} }
      },
      {
        "id": 2,
        "__component": "shared.quote",
        "quoteText": "Great design starts with listening",
        "name": "Jane Doe"
      },
      {
        "id": 3,
        "__component": "shared.rich-text",
        "body": "# Our Story\n\nWe are..."
      },
      {
        "id": 4,
        "__component": "shared.slider",
        "files": [
          { "url": "...", "formats": {...} },
          { "url": "...", "formats": {...} }
        ]
      }
    ]
  }
}
```

### Caching
- Content is cached for 5 minutes (React Query)
- Automatically refetches on window focus
- Manual refresh: reload the page

## Documentation

For detailed technical documentation, see:
- `frontend/ABOUT-PAGE-IMPLEMENTATION.md` - Full implementation details
- `frontend/src/components/BlockRenderer.tsx` - Component documentation
- `frontend/src/pages/AboutPage.tsx` - Page implementation

## Files Changed

### Created:
- `frontend/src/components/BlockRenderer.tsx`
- `frontend/ABOUT-PAGE-IMPLEMENTATION.md`
- `ABOUT-PAGE-SETUP.md` (this file)

### Modified:
- `frontend/src/pages/AboutPage.tsx`
- `frontend/package.json`

---

**Need Help?** Check the detailed documentation in `frontend/ABOUT-PAGE-IMPLEMENTATION.md`

