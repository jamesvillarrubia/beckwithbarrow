# Caching Strategy Documentation

## Overview

The application implements a robust caching strategy using React Query with localStorage persistence. This provides an **offline-first experience** where users see cached content immediately on page reload, eliminating loading states for previously visited pages.

## Implementation Details

### Core Technology Stack

- **React Query (TanStack Query)** - Client-side data fetching and caching
- **React Query Persist Client** - Persists cache to localStorage
- **localStorage** - Browser storage for cache persistence

### Configuration

**Location**: `/frontend/src/App.tsx`

```typescript
// Query Client Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24, // 24 hours - data stays fresh
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - unused data kept for a week
      retry: 3, // Retry failed requests 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false, // Don't refetch when tabbing back
      refetchOnReconnect: true, // Refetch when internet restored
      refetchOnMount: false, // Don't refetch if cache exists
    },
  },
});

// localStorage Persister
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'beckwithbarrow-cache',
});
```

### Cache Levels

The application uses **two levels of caching**:

#### 1. Default Cache (24 hours)
- Used for most content
- Data is considered "fresh" for 24 hours
- Persisted to localStorage for 7 days

#### 2. Page-Specific Cache (5 minutes)
- Some pages override with shorter stale times (5 minutes)
- Useful for content that updates more frequently
- Still persisted to localStorage

Examples of page-specific configuration:
- Home page: 5 minutes
- About page: 5 minutes
- Press page: 5 minutes
- Projects: 5 minutes

## How It Works

### First Visit (No Cache)

1. User visits `/about`
2. Page shows loading state
3. Data is fetched from Strapi API
4. Data is stored in:
   - React Query cache (in-memory)
   - localStorage (persistent)
5. Page renders with content

### Return Visit (With Cache)

1. User visits `/about` again (or reloads page)
2. **Cached data is shown immediately** (no loading state!)
3. If data is "stale" (older than staleTime):
   - Background refetch happens silently
   - UI updates when fresh data arrives
4. If data is "fresh":
   - No refetch occurs
   - Cached data is used

### Offline Experience

1. User has previously visited pages
2. User loses internet connection
3. **All cached pages work perfectly**
4. New pages show error state (not cached)
5. When connection restored, fresh data is fetched

## Cache Storage Structure

Data is stored in localStorage under the key: `beckwithbarrow-cache`

### Storage Size

- Typical cache size: 100KB - 500KB
- localStorage limit: 5-10MB (browser dependent)
- Cache is automatically pruned after 7 days

### Inspecting Cache

**Chrome DevTools**:
1. Open DevTools (F12)
2. Go to Application tab
3. Navigate to Local Storage → Your domain
4. Find `beckwithbarrow-cache` key

The cache structure:
```json
{
  "clientState": {
    "queries": [
      {
        "queryKey": ["home"],
        "queryHash": "...",
        "state": {
          "data": { /* cached data */ },
          "dataUpdatedAt": 1234567890,
          "status": "success"
        }
      }
    ]
  },
  "timestamp": 1234567890
}
```

## Cache Invalidation Strategies

### Automatic Invalidation

1. **Time-based (Stale Time)**
   - Default: 24 hours
   - Page-specific: 5 minutes
   - After stale time, background refetch occurs

2. **Age-based (GC Time)**
   - Unused cache older than 7 days is automatically removed

3. **Reconnection**
   - When internet is restored, stale queries are refetched

### Manual Invalidation

Users never need to manually clear cache, but developers can:

```typescript
// In browser console or dev tools
localStorage.removeItem('beckwithbarrow-cache');
// Then reload page
```

## Benefits

### User Experience

✅ **Instant page loads** on return visits
✅ **Offline functionality** for previously visited pages
✅ **No loading spinners** when data is cached
✅ **Seamless navigation** between cached pages
✅ **Reduced API calls** = faster perceived performance

### Performance

✅ **Reduced server load** (fewer API requests)
✅ **Faster page transitions** (no network delay)
✅ **Background updates** (users see cached content while fresh data loads)
✅ **Automatic retry** on failed requests

### Developer Experience

✅ **Automatic cache management** (no manual code needed)
✅ **Predictable behavior** (consistent caching rules)
✅ **Easy debugging** (cache visible in DevTools)
✅ **Configurable per-query** (can override defaults)

## Edge Cases & Handling

### Cache Miss
- Occurs when: First visit or cache expired
- Behavior: Shows loading state, fetches data, caches result

### Stale Data
- Occurs when: Data older than staleTime
- Behavior: Shows cached data, refetches in background, updates UI

### Network Error
- Occurs when: API unavailable or network down
- Behavior: Shows cached data if available, error state if not

### Cache Corruption
- Occurs when: localStorage data is invalid
- Behavior: React Query ignores corrupt data, refetches fresh

### Storage Quota Exceeded
- Occurs when: localStorage is full
- Behavior: Cache writes fail silently, queries still work

## Prefetching Strategy

The app also implements **smart prefetching** (see `usePrefetchPages` hook):

1. Current page loads first (priority)
2. Other pages prefetch in background
3. Prefetched data is also cached to localStorage
4. Users get instant navigation to any prefetched page

**Prefetch Order**:
1. Global settings & menu (loaded first)
2. Home page
3. About page
4. Approach page
5. Connect page
6. Press page

## Monitoring & Debugging

### Check Cache Status

```typescript
// In React component
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const queryClient = useQueryClient();
  
  // Get cache for specific query
  const homeData = queryClient.getQueryData(['home']);
  
  // Get all queries
  const allQueries = queryClient.getQueryCache().getAll();
  
  console.log('Home cache:', homeData);
  console.log('All cached queries:', allQueries);
}
```

### Debug Mode

Enable React Query DevTools for development:

```typescript
// Add to App.tsx (dev only)
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In App component
<PersistQueryClientProvider ...>
  <Router>
    <AppContent />
  </Router>
  {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
</PersistQueryClientProvider>
```

## Best Practices

### For Content Editors

- **No action needed!** Cache updates automatically
- Changes in Strapi appear within 5-24 hours (depending on page)
- For immediate updates, users can hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### For Developers

1. **Don't manually manage cache** - React Query handles it
2. **Use appropriate staleTime** - Content-heavy = longer, dynamic = shorter
3. **Test offline** - Ensure cached pages work without network
4. **Monitor localStorage size** - Don't cache huge images
5. **Version cache key** - Change `beckwithbarrow-cache` if schema changes dramatically

### For Users

- **Nothing to do!** Everything is automatic
- Cache makes the site faster on return visits
- Hard refresh clears cache if something seems broken

## Cache Versioning

If you make breaking changes to your API response structure, increment the cache key:

```typescript
// Before
key: 'beckwithbarrow-cache',

// After breaking change
key: 'beckwithbarrow-cache-v2',
```

This forces all clients to refetch with the new structure.

## Performance Metrics

Expected improvements with caching:

| Metric | Without Cache | With Cache | Improvement |
|--------|--------------|------------|-------------|
| Time to Interactive (return visit) | ~1-2s | ~100-300ms | **5-10x faster** |
| API Requests (5 page session) | 25-30 | 5-10 | **60-80% reduction** |
| Works offline | ❌ No | ✅ Yes | **100% offline capability** |
| Loading states shown | Every visit | First visit only | **80-90% reduction** |

## Troubleshooting

### Problem: Cache not persisting across reloads

**Possible causes**:
- Browser in private/incognito mode
- localStorage disabled or full
- Browser extensions blocking localStorage

**Solution**: Check browser console for errors, test in regular browser window

### Problem: Seeing stale data

**Expected behavior**: Stale data shows while fresh data loads in background

**If problematic**: Reduce staleTime for that specific query

### Problem: Cache too large

**Solution**: Reduce gcTime or implement selective caching for large data

## Future Enhancements

Potential improvements:

1. **Service Worker caching** - Cache images and assets
2. **IndexedDB migration** - For larger cache limits
3. **Selective persistence** - Only cache certain queries
4. **Cache compression** - Reduce localStorage usage
5. **Optimistic updates** - Update cache before API confirms

