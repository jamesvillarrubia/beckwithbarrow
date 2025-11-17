# Quick Cache Implementation Guide

## ✅ What Was Implemented

Local caching with localStorage persistence so users **never see loading states on return visits**.

## 📦 Installation Required

```bash
cd frontend
pnpm install
```

This will install:
- `@tanstack/react-query-persist-client`
- `@tanstack/query-sync-storage-persister`

## 🎯 How It Works

### Before (Without Caching)
1. User visits page → Shows loading spinner
2. Fetches data from API
3. Displays content
4. **User reloads page → Shows loading spinner AGAIN**

### After (With Caching)
1. User visits page → Shows loading spinner
2. Fetches data from API
3. Saves to localStorage
4. Displays content
5. **User reloads page → Shows cached content INSTANTLY** ✨
6. Silently refetches fresh data in background

## 🔧 Cache Settings

| Setting | Value | Why |
|---------|-------|-----|
| **Cache Version** | v2 | Automatically invalidates when changed |
| **Default Stale Time** | 24 hours | Most content doesn't change daily |
| **Page Stale Time** | 5 minutes | Individual pages can override |
| **Cache Duration** | 7 days | Keep data for a week before cleanup |
| **Refetch on Mount** | Disabled | Use cache if available |
| **Refetch on Focus** | Disabled | Don't refetch when tabbing back |
| **Refetch on Reconnect** | Enabled | Get fresh data when online again |

### 🔄 Automatic Cache Invalidation

**No manual cleanup needed!** When you change:
- API populate parameters
- Data schemas in Strapi
- Response structures

Just increment `CACHE_VERSION` in `App.tsx`:

```typescript
const CACHE_VERSION = 'v3'; // Bump from v2 to v3
```

All users automatically get fresh data on next page load. Old cache is deleted automatically.

## 🧪 Testing It

### Test 1: Basic Caching
1. Visit your site (e.g., `/about`)
2. Wait for content to load
3. **Reload the page** (Cmd+R / Ctrl+R)
4. ✅ Content should appear **instantly** (no loading spinner!)

### Test 2: Offline Mode
1. Visit several pages (home, about, press)
2. Open DevTools → Network tab
3. Set "Throttling" to "Offline"
4. Navigate between pages you already visited
5. ✅ All previously visited pages should work!

### Test 3: Background Updates
1. Visit `/press` page
2. Update content in Strapi
3. Come back after 5 minutes
4. ✅ Old content shows immediately, then updates to new content

## 🛠️ Developer Tools

### Browser Console Commands

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

### Inspect Cache in DevTools

**Chrome**:
1. DevTools (F12) → Application tab
2. Local Storage → Your domain
3. Find `beckwithbarrow-cache` key
4. View cached data

## 📊 Expected Performance

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Return visit load time | 1-2 seconds | 100-300ms | **5-10x faster** |
| Loading states shown | Every page load | First visit only | **90% reduction** |
| API requests | Every page load | Only when stale | **60-80% fewer** |
| Works offline | ❌ No | ✅ Yes | **Full offline support** |

## 🔍 Debugging

### Problem: Not seeing instant loads

**Check**:
```javascript
window.cacheUtils.logCacheInfo()
```

**Expected output**:
```
Cache exists: true
Cached queries: 6
Cache age: 2m
Cache size: 156.32 KB
```

### Problem: Cache not persisting

**Possible causes**:
- Browser in incognito mode
- localStorage disabled
- Storage quota exceeded

**Solution**: Check browser console for errors

### Force Fresh Data

**Hard Refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

**Or clear cache**:
```javascript
window.cacheUtils.clearCache()
```

## 📝 For Content Editors

**When you update content in Strapi**:
- Changes appear within 5 minutes (default page staleTime)
- Users see old content briefly, then it updates
- No action needed from users

**For immediate updates**: Users can hard refresh (Cmd+Shift+R)

## 🚨 Important Notes

1. **First visit still requires network** - Caching only helps on return visits
2. **New pages need to load** - Only visited pages are cached
3. **Images are not cached** - Only text data is cached (for now)
4. **Cache is automatic** - No manual cache management needed
5. **7-day limit** - Old cache is automatically cleaned up

## 📚 Full Documentation

See [`CACHING-STRATEGY.md`](./CACHING-STRATEGY.md) for complete technical details.

## ✅ Next Steps

1. **Install dependencies**: `cd frontend && pnpm install`
2. **Test the implementation**: Follow "Testing It" section above
3. **Monitor in dev tools**: Use `window.cacheUtils.logCacheInfo()`
4. **Deploy and enjoy**: Users will love the instant page loads!

