# Navigation System

A dynamic, CMS-managed navigation system built with Strapi and React.

## Overview

The navigation system allows you to manage your website's header and footer navigation links directly from the Strapi admin panel, without requiring code changes.

## Features

- ✅ **CMS-Managed**: Add, edit, reorder, or remove links from Strapi admin
- ✅ **Dual Navigation**: Separate header and footer navigation
- ✅ **External Links**: Support for external URLs with target control
- ✅ **Auto-Sorted**: Links are automatically ordered by the `order` field
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Prefetched**: Navigation data loads on app start for instant availability
- ✅ **Graceful Fallback**: Uses hardcoded links if API fails

## Strapi Setup

### 1. Access Global Settings

In your Strapi admin panel:
1. Go to **Content Manager** → **Single Types** → **Global**
2. Scroll to the **Header Navigation** and **Footer Navigation** sections

### 2. Add Navigation Links

Click "Add component" to create a new navigation link with these fields:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| **label** | Text | Link text (max 50 chars) | ✅ Yes |
| **url** | Text | Link URL (e.g., `/about` or `https://example.com`) | ✅ Yes |
| **external** | Boolean | Is this an external link? | No (default: false) |
| **openInNewTab** | Boolean | Open link in new tab? | No (default: false) |
| **order** | Number | Display order (lower numbers first) | No (default: 0) |

### 3. Example Configuration

**Header Navigation:**
```
Link 1:
  label: "Home"
  url: "/"
  external: false
  openInNewTab: false
  order: 0

Link 2:
  label: "About"
  url: "/about"
  external: false
  openInNewTab: false
  order: 1

Link 3:
  label: "Connect"
  url: "/connect"
  external: false
  openInNewTab: false
  order: 2

Link 4:
  label: "Instagram"
  url: "https://instagram.com/beckwithbarrow"
  external: true
  openInNewTab: true
  order: 3
```

### 4. Save and Publish

Click **Save** to apply your changes. The frontend will automatically fetch and display the updated navigation on the next page load (or immediately if already cached).

## Frontend Usage

### Using in Components

The navigation data is available via the `useGlobalSettings` hook:

```typescript
import { useGlobalSettings } from '../hooks/useGlobalSettings';

function MyComponent() {
  const { headerNavigation, footerNavigation, isLoading } = useGlobalSettings();

  if (isLoading) return <div>Loading...</div>;

  return (
    <nav>
      {headerNavigation.map(link => (
        <a key={link.id} href={link.url}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}
```

### NavigationLink Type

```typescript
interface NavigationLink {
  id: number;
  label: string;
  url: string;
  external: boolean;
  openInNewTab: boolean;
  order: number;
}
```

### Handling External Links

The `Navigation` component automatically handles external vs internal links:

- **Internal links** (`external: false`): Uses React Router `<Link>` for client-side navigation
- **External links** (`external: true`): Uses standard `<a>` tag with proper `target` and `rel` attributes

## Technical Details

### Backend Schema

**Component:** `api/src/components/shared/navigation-link.json`
- Defines the navigation link structure
- Reusable across different content types

**Global Singleton:** `api/src/api/global/content-types/global/schema.json`
- Contains `headerNavigation` and `footerNavigation` fields
- Both are repeatable components using `navigation-link`

### Frontend Implementation

**Hook:** `frontend/src/hooks/useGlobalSettings.ts`
- Fetches global settings with navigation data
- Auto-sorts links by `order` field
- 10-minute cache for performance

**Component:** `frontend/src/components/Navigation.tsx`
- Uses `useGlobalSettings` hook
- Dynamically renders navigation links
- Handles internal/external link logic
- Includes fallback navigation if API fails

**Prefetch:** `frontend/src/hooks/usePrefetchPages.ts`
- Global settings are prefetched on app load
- 10-minute cache (longer than page data)
- Ensures navigation is always ready

## Caching

- **Cache Duration**: 10 minutes
- **Cache Key**: `['global-settings']`
- **Stale Time**: 10 minutes (updates checked after this period)

To force a cache refresh, refresh the browser page.

## Fallback Behavior

If the API fails or is loading, the Navigation component uses hardcoded fallback links:

```typescript
const fallbackNavItems = [
  { label: 'Home', url: '/', external: false, openInNewTab: false, order: 0 },
  { label: 'About', url: '/about', external: false, openInNewTab: false, order: 1 },
  { label: 'Connect', url: '/connect', external: false, openInNewTab: false, order: 2 },
];
```

## Troubleshooting

### Links not updating?
1. Check that you **saved** the changes in Strapi
2. Wait for the cache to expire (10 minutes) or hard refresh the browser
3. Check the browser console for API errors

### Navigation not showing?
1. Verify global settings are configured in Strapi admin
2. Check that navigation links have been added
3. Look for errors in the browser console

### External links not opening in new tab?
Ensure both `external` and `openInNewTab` are set to `true` in Strapi.

## Future Enhancements

Potential improvements to consider:

- 📱 Mobile menu with hamburger navigation
- 🎨 Icon support for navigation items
- 🏷️ Badge/label support (e.g., "New")
- 📂 Nested/dropdown menus
- 🔒 Role-based link visibility
- 🌐 Multi-language support

---

**Last Updated**: January 2025

