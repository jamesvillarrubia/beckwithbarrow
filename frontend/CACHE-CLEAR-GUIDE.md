# Cache Clear Implementation

## Problem Fixed

The cache clearing functionality wasn't working because the cache key was versioned (`beckwithbarrow-cache-v5`) but the `clearCache()` function was looking for a non-versioned key (`beckwithbarrow-cache`).

## What Changed

### 1. Centralized Cache Configuration
Created `/constants/cache.ts` to manage cache version in one place:
- `CACHE_VERSION`: Current version (v5)
- `CACHE_KEY`: Full key with version (`beckwithbarrow-cache-v5`)

### 2. Fixed Cache Utils
Updated `/utils/cacheUtils.ts` to use the correct versioned cache key:
- `clearCache()` - Now clears the correct cache and all old versions
- `getCacheSize()` - Uses versioned key
- `getCacheInfo()` - Uses versioned key and includes version in output
- `getCachedQueries()` - Uses versioned key
- `exportCache()` - Uses versioned key and includes version in filename

### 3. Added Keyboard Shortcut
Created `/hooks/useCacheClear.ts` that enables **Ctrl + Shift + K** to clear cache and reload.

### 4. Updated App.tsx
- Imports cache constants from centralized location
- Enables keyboard shortcut on all pages
- Shows console message in dev mode with available shortcuts

## How to Use

### For Users
Press **Ctrl + Shift + K** (all platforms) anywhere on the site to:
1. Clear all cached data
2. Reload the page with fresh data from Strapi

> **Note**: Using Ctrl instead of Cmd on Mac to avoid conflicts with browser DevTools shortcuts.

### For Developers (Console Commands)
In development mode, these utilities are available in the browser console:

```javascript
// View cache information
window.cacheUtils.logCacheInfo()

// Clear all cached data
window.cacheUtils.clearCache()

// Export cache as JSON file
window.cacheUtils.exportCache()

// Get cache size
window.cacheUtils.getCacheSize()

// List all cached queries
window.cacheUtils.getCachedQueries()
```

## Testing

1. Visit the site and let some pages load
2. Open browser DevTools → Console
3. Run `window.cacheUtils.logCacheInfo()` to see cache info
4. Press **Ctrl + Shift + K**
5. You should see:
   ```
   🗑️  Cache clear shortcut detected (Ctrl + Shift + K)
   ✅ Cache cleared successfully (v5)
   🔄 Reloading page to fetch fresh data...
   ```
6. Page reloads and fetches fresh data from Strapi

## For Content Editors

When you update content in Strapi and want to see it immediately:
1. Press **Ctrl + Shift + K** (all platforms - yes, even on Mac!)
2. Site clears its cache and reloads with fresh content

No need to use browser developer tools or remember cache key names!

## Technical Details

### Why This Matters
- React Query persists data to localStorage with a versioned key
- When you change the cache version, old data is ignored
- But the old `clearCache()` function wasn't aware of versioning
- Result: Cache never actually cleared

### The Fix
1. Created a single source of truth for cache version
2. Updated all cache utility functions to use the versioned key
3. Made clearing work for both current and old cache versions
4. Added user-friendly keyboard shortcut for easy access

### Cache Versioning
When you increment `CACHE_VERSION` in `/constants/cache.ts`:
- Old cache is automatically ignored on next visit
- `cleanupOldCaches()` removes old versions from localStorage
- All users automatically get fresh data
- No manual intervention needed

