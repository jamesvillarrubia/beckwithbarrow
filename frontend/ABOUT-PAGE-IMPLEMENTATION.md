# About Page Implementation - Dynamic Content from Strapi

## Overview

The About page has been updated to fetch dynamic content from Strapi's "About" singleton instead of using hardcoded content. This allows non-technical users to update the about page content through Strapi's admin panel.

## What Changed

### 1. New Dependencies Added

Added to `package.json`:
- `react-markdown` (^9.0.1) - For rendering rich text/markdown content
- `remark-gfm` (^4.0.0) - GitHub Flavored Markdown support (tables, strikethrough, etc.)

**Action Required:** Run `pnpm install` in the frontend directory to install these dependencies.

### 2. New Component: BlockRenderer

**File:** `frontend/src/components/BlockRenderer.tsx`

A comprehensive component that renders different block types from Strapi's dynamic zone:

#### Supported Block Types

1. **Media Block** (`shared.media`)
   - Renders single images or videos
   - Supports multiple image formats with automatic fallback
   - Displays captions if provided
   - Aspect ratio: 4:3

2. **Quote Block** (`shared.quote`)
   - Large, styled blockquote with author attribution
   - Matches the homepage design pattern
   - Centered layout with serif font

3. **Rich Text Block** (`shared.rich-text`)
   - Renders markdown content with custom styling
   - Supports:
     - Headings (H1, H2, H3)
     - Paragraphs
     - Lists (ordered and unordered)
     - Links (opens in new tab)
     - Blockquotes
     - GitHub Flavored Markdown features
   - Typography matches site design system

4. **Slider Block** (`shared.slider`)
   - Responsive image grid
   - Automatically adjusts columns based on image count:
     - 1 image: Full width
     - 2 images: 2 columns on desktop
     - 3+ images: 3 columns on desktop
   - Hover effect on images

### 3. Updated Component: AboutPage

**File:** `frontend/src/pages/AboutPage.tsx`

Major changes:
- **Data Fetching:** Uses React Query to fetch from Strapi's `/api/about` endpoint
- **Loading State:** Shows spinner while fetching
- **Error State:** User-friendly error message if fetch fails
- **Dynamic Title:** Displays title from CMS (optional)
- **Block Rendering:** Uses BlockRenderer to display all content blocks
- **Fallback Content:** Shows message if no content is defined

## Strapi Schema

The About page in Strapi has the following structure:

```json
{
  "title": "string (optional)",
  "blocks": "dynamic zone containing:"
    - shared.media (file: single media)
    - shared.quote (quoteText: text, name: string)
    - shared.rich-text (body: richtext)
    - shared.slider (files: multiple images)
}
```

## Testing the Implementation

### 1. Install Dependencies

```bash
cd frontend
pnpm install
```

### 2. Ensure Strapi is Running

Make sure the Strapi API is running (local or production).

### 3. Add Content in Strapi

1. Log into Strapi admin panel
2. Navigate to Content Manager → Single Types → About
3. Add a title (optional)
4. Add blocks:
   - Click "Add component to blocks"
   - Choose from: Media, Quote, Rich text, or Slider
   - Fill in the content for each block
   - Upload images/files as needed
5. Save and publish

### 4. Run the Frontend

```bash
# Use local API
pnpm dev:local

# OR use production API
pnpm dev:prod
```

### 5. Navigate to About Page

Visit `/about` in your browser to see the dynamic content.

## API Populate Strategy

The implementation uses the following populate parameter:
```
blocks.file,blocks.files
```

This explicitly populates:
- `blocks.file` - For media blocks (single file)
- `blocks.files` - For slider blocks (multiple files)

**Note:** Strapi v5 dynamic zones require explicit population of nested relations. The current implementation handles all known block types. If you add new block types with media relations, update the populate parameter in `AboutPage.tsx`.

## Potential Issues & Solutions

### Issue 1: Dependencies Not Installing

If you get a pnpm store error:
```bash
# Option 1: Reinstall from root
cd /path/to/beckwithbarrow
pnpm install

# Option 2: Configure global store
pnpm config set store-dir ~/.pnpm-store --global
pnpm install
```

### Issue 2: Images Not Loading

Check that:
1. Strapi is running and accessible
2. Images are uploaded in Strapi admin
3. The populate parameter includes the media fields
4. CORS is configured correctly in Strapi

To verify, check browser console for API response:
```javascript
// Look for: "About API Response:"
// Should show blocks with populated file/files objects
```

### Issue 3: Rich Text Not Rendering Correctly

- Ensure content is in Markdown format in Strapi
- Check that `react-markdown` and `remark-gfm` are installed
- Verify no console errors related to markdown parsing

### Issue 4: Strapi Populate Not Working

If blocks appear but media is missing:

**Option A:** Update populate to use deep populate (requires API service update):
```typescript
const result = await apiService.getSingleType('about', 'blocks.file,blocks.files');
```

**Option B:** Test with direct URL:
```
http://localhost:1337/api/about?populate[blocks][populate][file]=*&populate[blocks][populate][files]=*
```

## Design Decisions

### Typography
- Maintains consistency with homepage and project pages
- Uses serif font for headings (light weight)
- Uses sans-serif for body text (gray-700)
- Font sizes: 4xl-5xl for H1, 3xl-4xl for H2, 2xl-3xl for H3

### Spacing
- Consistent vertical rhythm with other pages
- Section padding: py-16 (standard), py-24 for quotes
- Max-width: 4xl for text, 6xl for images

### Colors
- White background with black text (consistent with About page aesthetic)
- Gray-600 for breadcrumbs, gray-700 for body text, gray-900 for headings

### Responsive Behavior
- All blocks are fully responsive
- Images maintain aspect ratios
- Text adjusts font size for mobile (md: breakpoint)
- Slider adjusts columns: 1 → 2 → 3 based on screen size

## Future Enhancements

Potential improvements to consider:

1. **Image Lightbox:** Add lightbox for media and slider blocks (similar to project images)
2. **Animation:** Add AnimatedSection wrapper for scroll animations
3. **Video Controls:** Enhanced video player with custom controls
4. **Deep Populate:** Update API service to support `populate=deep` for easier configuration
5. **Block Ordering:** Add drag-and-drop reordering in Strapi admin
6. **SEO Component:** Add SEO fields to About singleton
7. **Preview Mode:** Add draft/preview functionality for content editors

## Files Modified/Created

### Created:
- `frontend/src/components/BlockRenderer.tsx` (289 lines)
- `frontend/ABOUT-PAGE-IMPLEMENTATION.md` (this file)

### Modified:
- `frontend/src/pages/AboutPage.tsx` (completely rewritten)
- `frontend/package.json` (added 2 dependencies)

## Code Quality

- ✅ No linting errors
- ✅ TypeScript types properly defined
- ✅ Comprehensive documentation/comments
- ✅ Error handling (loading, error states)
- ✅ Responsive design
- ✅ Accessibility (aria-labels, alt text)
- ✅ Performance (React Query caching, image format optimization)

## Questions & Concerns

### Q: Why not use `populate=*` or `populate=deep`?

The current API service has a custom populate parser that doesn't support wildcard or deep populate syntax. Explicitly specifying fields ensures compatibility with the existing implementation.

### Q: Can I add more block types?

Yes! To add new block types:
1. Define the component schema in Strapi
2. Add it to the About page's dynamic zone
3. Create a new block type interface in `BlockRenderer.tsx`
4. Add a new renderer function
5. Add a new case in the switch statement
6. Update the populate parameter if it has media relations

### Q: What happens if Strapi is down?

The page shows a user-friendly error message: "Unable to load about page content. Please try again later." The user can still navigate via the breadcrumb back to projects.

### Q: Will this affect performance?

No. React Query implements:
- 5-minute cache (staleTime)
- Automatic retry (2 attempts)
- Request deduplication
- Background refetching

This means the page only fetches once per session unless explicitly refreshed.

---

**Implementation Date:** 2025-11-15  
**Status:** ✅ Complete - Ready for testing  
**Next Step:** Run `pnpm install` and test with Strapi content

