# Press Page Setup Guide

This document explains the Press page implementation and how to use it in your Strapi CMS.

## Implementation Complete ✅

The Press page has been **fully implemented** with:
- **Backend**: Strapi singleton content type created at `/api/src/api/press/`
- **Component**: Press Item component at `/api/src/components/shared/press-item.json`
- **Frontend**: Page component at `/frontend/src/pages/PressPage.tsx`
- **Route**: `/press` (configured in App.tsx)
- **Prefetching**: Automatically prefetches press data for fast navigation

## Strapi Backend Structure

The following have been created in your Strapi backend:

### Press Singleton Content Type

**Location**: `/api/src/api/press/content-types/press/schema.json`

**Fields**:
1. **title** (Text - Short text)
   - Default: "Press & Media"
   - Used as the main page heading

2. **introduction** (Rich Text - Markdown)
   - Page introduction/description
   - Supports markdown formatting

3. **pressItems** (Component - Repeatable)
   - List of individual press articles/mentions
   - Uses the `shared.press-item` component

### Press Item Component

**Location**: `/api/src/components/shared/press-item.json`

**Fields**:
1. **title** (Text - Short text, Required)
   - Title of the article or press mention
   - Example: "Architectural Digest Features Our Latest Project"

2. **text** (Rich Text - Markdown)
   - Main content/description of the press item
   - Supports markdown formatting

3. **image** (Media - Single)
   - Optional featured image
   - Recommended aspect ratio: 4:3
   - Displays as thumbnail with color accent border

4. **color** (Color Picker)
   - Custom accent color for this press item
   - Applied to: title text, color bar, image border, and "Read more" link
   - Helps visually differentiate press items

5. **source** (Text - Short text)
   - Publication or source name
   - Example: "Architectural Digest"

6. **date** (Date)
   - Publication date
   - Automatically formatted as "January 15, 2024"

7. **link** (Text - Short text)
   - External URL to the full article
   - Opens in new tab when clicked

## How to Use in Strapi Admin

### 1. Restart Strapi Server

After creating the content type files, restart your Strapi server to register the new content type:

```bash
cd api
npm run develop
# or
pnpm run develop
```

The Press content type should now appear in your Strapi admin panel.

### 2. Add Navigation Link

Navigate to: **Content Manager** → **Single Types** → **Menu**

Add a new menu item:
- **Label**: "Press"
- **URL**: "/press"
- **External**: false
- **Open in New Tab**: false
- **Order**: (set appropriate order for navigation)

### 3. Set Permissions

Navigate to: **Settings** → **Users & Permissions Plugin** → **Roles** → **Public**

Enable the following permissions:
- **Press**: `find` (allows public access to the press page data)

### 4. Add Content

Navigate to: **Content Manager** → **Single Types** → **Press**

Fill in:
1. **Page Title**: e.g., "Press & Media"
2. **Introduction**: Brief introduction text (supports markdown)
3. **Press Items**: Click "Add a component" to add press articles
   - For each item:
     - **Title**: Article or award title (required)
     - **Text**: Main content or description
     - **Image**: Upload a featured image
     - **Color**: Pick an accent color (e.g., `#3B82F6` for blue)
     - **Source**: Publication name
     - **Date**: Publication date
     - **Link**: External URL to full article
4. Save and Publish

## Example Content Structure

```json
{
  "title": "Press & Media",
  "introduction": "Our work has been featured in leading architecture and design publications. Explore our latest media coverage, awards, and press mentions.",
  "pressItems": [
    {
      "title": "Award-Winning Residential Design Featured in Architectural Digest",
      "text": "Our latest residential project has been recognized for its innovative use of natural materials and sustainable design principles. The design seamlessly integrates indoor and outdoor spaces.",
      "color": "#3B82F6",
      "source": "Architectural Digest",
      "date": "2024-01-15",
      "link": "https://example.com/article",
      "image": {
        "url": "/uploads/press_image_001.jpg"
      }
    },
    {
      "title": "Named Top 50 Architecture Firms",
      "text": "We're honored to be included in Design Magazine's annual list of top architecture firms for 2023.",
      "color": "#10B981",
      "source": "Design Magazine",
      "date": "2023-12-01",
      "link": "https://example.com/article-2"
    },
    {
      "title": "Sustainability Award Winner",
      "text": "Recognized for excellence in sustainable design and commitment to environmentally responsible architecture.",
      "color": "#8B5CF6",
      "source": "Green Building Council",
      "date": "2023-10-20",
      "link": "https://example.com/award"
    }
  ]
}
```

## Display Features

The Press page includes:
- **Responsive Layout**: Adapts to mobile, tablet, and desktop screens
- **Color Accents**: Each press item can have a custom color applied to:
  - Title text
  - Image border (left side, 4px)
  - Color bar (when no image is present)
  - "Read more" link
- **Image Thumbnails**: Optional images display with 4:3 aspect ratio
- **Rich Text Support**: Markdown formatting in text content
- **External Links**: Press items can link to external articles (opens in new tab)
- **Date Formatting**: Automatically formats dates (e.g., "January 15, 2024")
- **Breadcrumb Navigation**: Shows current location in site hierarchy
- **Loading States**: Graceful loading indicators during data fetch
- **Error Handling**: Shows placeholder content if Strapi isn't configured yet

## Testing

After setting up the content type and adding content:

1. Navigate to `/press` in your browser
2. Verify that the page title and introduction display correctly
3. Check that press items appear with proper formatting
4. Test external links (should open in new tabs)
5. Verify images load correctly
6. Test on mobile devices for responsive behavior

## Troubleshooting

### Press content type not appearing in Strapi admin?

1. **Restart Strapi**: The server must be restarted after creating new content types
   ```bash
   cd api
   pnpm run develop
   ```

2. **Check file locations**: Ensure all files are in the correct directories:
   - `/api/src/api/press/` (content type)
   - `/api/src/components/shared/press-item.json` (component)

3. **Build the admin panel**: Sometimes you need to rebuild the admin panel
   ```bash
   cd api
   pnpm run build
   pnpm run develop
   ```

### Color picker not working?

The color picker requires the `@strapi/plugin-color-picker` plugin. This should already be installed in your project (used in the Home page for number colors). If not:

```bash
cd api
pnpm add @strapi/plugin-color-picker
```

Then add it to your `config/plugins.ts` if not already there.

## Notes

- The navigation link is dynamically loaded from Strapi's menu system
- Data is cached for 5 minutes to improve performance
- The page implements retry logic for Strapi cold starts
- Background prefetching ensures fast navigation from other pages
- Each press item's color is optional - if not set, default colors are used

