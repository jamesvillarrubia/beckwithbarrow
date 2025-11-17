# Cache Versioning Guide

## Overview

The application uses **automatic cache versioning** to prevent stale data issues when you make changes to:
- API response structures
- Populate parameters
- Data schemas
- Query logic

## How It Works

### 1. Version-Based Cache Keys

Instead of a single cache key, the app uses versioned keys:

```typescript
// Old cache (before changes)
localStorage: 'beckwithbarrow-cache-v1'

// New cache (after changes)
localStorage: 'beckwithbarrow-cache-v2'
```

When you increment the version, the old cache is automatically:
- **Ignored** - React Query won't use old data
- **Cleaned up** - Removed from localStorage to save space

### 2. Automatic Cleanup

On app startup, the system:
1. Checks for old cache versions
2. Removes them automatically
3. Logs cleanup in console (dev mode)

## When to Increment the Version

### ✅ DO Increment When:

1. **Changing populate parameters**
   ```typescript
   // Before
   getSingleType('about', 'topLeftImage,bottomRightImage')
   
   // After - INCREMENT VERSION!
   getSingleType('about', '*')
   ```

2. **Changing API response structure in Strapi**
   - Adding/removing fields
   - Changing field types
   - Modifying component structures

3. **Breaking changes to data transformation**
   ```typescript
   // Before
   data.title
   
   // After - INCREMENT VERSION!
   data.attributes.title
   ```

4. **Updating Strapi major versions**
   - Strapi v4 → v5 (different response structures)

### ❌ DON'T Increment When:

1. **Adding new content** (no schema changes)
2. **Fixing bugs** that don't change data structure
3. **Styling changes** (no data impact)
4. **Adding new pages** (doesn't affect existing cache)

## How to Increment Version

**Location**: `/frontend/src/App.tsx`

```typescript
// Find this line:
const CACHE_VERSION = 'v2';

// Change to:
const CACHE_VERSION = 'v3';
```

That's it! The next time users load your app:
- Old cache (`v2`) is automatically deleted
- New cache (`v3`) starts fresh
- No manual cleanup needed

## Version Naming Convention

Use semantic-style versioning:

```typescript
const CACHE_VERSION = 'v1';   // Initial version
const CACHE_VERSION = 'v2';   // Minor schema change
const CACHE_VERSION = 'v3';   // Another change
// etc.
```

For major breaking changes, you can use descriptive names:

```typescript
const CACHE_VERSION = 'v2-strapi5';     // Strapi upgrade
const CACHE_VERSION = 'v3-media-refactor'; // Media system overhaul
```

## Automatic Invalidation Strategies

The app uses multiple cache invalidation strategies:

### 1. **Version-Based (Manual Trigger)**
- Increment `CACHE_VERSION`
- Users get fresh data on next load
- **Best for**: Breaking changes, schema updates

### 2. **Time-Based (Automatic)**
- Cache expires after 24 hours (default)
- Refetches in background if stale
- **Best for**: Content that changes regularly

### 3. **Max Age (Automatic)**
- Cache deleted after 7 days if unused
- Keeps localStorage clean
- **Best for**: Storage management

### 4. **Hard Refresh (User Control)**
- Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Bypasses all caches
- **Best for**: Testing, troubleshooting

## Examples

### Example 1: About Page Populate Change

**Problem**: Changed populate parameter, but users see old data without images

**Solution**:
```typescript
// 1. Update the populate parameter
getSingleType('about', '*')  // Changed from specific fields

// 2. Increment version
const CACHE_VERSION = 'v2';  // Was 'v1'
```

**Result**: Next page load automatically:
- Deletes old cache
- Fetches with new populate parameter
- Users see images immediately

### Example 2: Adding New Press Page

**Scenario**: Created new Press content type

**Do you need to increment?** ❌ **NO**

**Why?** New pages don't affect existing cached data. The Press page will cache itself separately.

### Example 3: Strapi Field Rename

**Problem**: Renamed field in Strapi from `description` to `content`

**Solution**:
```typescript
// 1. Update your code
// Before: project.description
// After: project.content

// 2. Increment version
const CACHE_VERSION = 'v3';
```

**Result**: Users get fresh data with new field names

## Monitoring Cache Versions

### Check Current Version (Browser Console)

```javascript
// View all cache keys
Object.keys(localStorage).filter(k => k.startsWith('beckwithbarrow'))

// Expected output:
// ["beckwithbarrow-cache-v2"]
```

### Check Cache Size by Version

```javascript
const cache = localStorage.getItem('beckwithbarrow-cache-v2');
const sizeKB = (new Blob([cache]).size / 1024).toFixed(2);
console.log(`Cache size: ${sizeKB} KB`);
```

## Troubleshooting

### Problem: Users still seeing old data after version increment

**Possible causes**:
1. Users haven't refreshed the app yet
2. Browser cache (separate from localStorage)
3. Service worker cache (if using PWA)

**Solutions**:
1. Wait for users to reload naturally
2. Add a "New version available" notification
3. Force reload: `window.location.reload(true)`

### Problem: Cache fills up localStorage

**Solution**: Increment version regularly or reduce `gcTime`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 3, // 3 days instead of 7
    },
  },
});
```

## Best Practices

### 1. Document Version Changes

Keep a changelog in your commits:

```bash
git commit -m "feat(cache): increment to v3 for press page schema

BREAKING CHANGE: Press items now include color field
Cache version bumped to invalidate old structure"
```

### 2. Test After Incrementing

After incrementing version:
1. Clear your dev cache manually
2. Test that all pages load correctly
3. Verify images and data display properly

### 3. Coordinate with Strapi Changes

When deploying Strapi changes:
1. Deploy Strapi first
2. Increment cache version in frontend
3. Deploy frontend
4. Users automatically get fresh data

### 4. Use Descriptive Versions for Major Changes

```typescript
// Instead of just v3, v4, v5...
const CACHE_VERSION = 'v3-strapi5-migration';
const CACHE_VERSION = 'v4-new-media-system';
```

This makes it easier to track what changed in git history.

## Advanced: Programmatic Version Detection

For automatic version detection based on package.json:

```typescript
import packageJson from '../package.json';

// Use app version as cache version
const CACHE_VERSION = `v${packageJson.version}`;
```

This automatically invalidates cache on every release!

## Summary

✅ **Version control prevents stale cache issues**
✅ **Automatic cleanup keeps localStorage clean**
✅ **Simple to use - just increment a number**
✅ **No user action required**

**Golden Rule**: When in doubt, increment the version. It's better to refetch data once than show broken UI from stale cache.

