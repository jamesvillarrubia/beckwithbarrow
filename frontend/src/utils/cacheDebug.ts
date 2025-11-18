/**
 * Cache Debug Utilities
 * 
 * Helper functions to inspect React Query cache and localStorage
 * for debugging cache issues.
 * 
 * Usage in browser console:
 * - window.inspectCache()
 * - window.clearPressCache()
 * - window.showPressCache()
 */

import { CACHE_KEY } from '../constants/cache';

/**
 * Inspect what's in localStorage for React Query cache
 */
export function inspectLocalStorageCache() {
  try {
    const cacheData = localStorage.getItem(CACHE_KEY);
    
    if (!cacheData) {
      console.log('❌ No cache found in localStorage');
      return null;
    }
    
    const parsed = JSON.parse(cacheData);
    console.log('📦 Cache found in localStorage:', CACHE_KEY);
    console.log('🔍 Cache structure:', {
      clientState: !!parsed.clientState,
      queries: parsed.clientState?.queries ? Object.keys(parsed.clientState.queries).length : 0,
      mutations: parsed.clientState?.mutations ? Object.keys(parsed.clientState.mutations).length : 0,
    });
    
    // List all query keys in cache
    if (parsed.clientState?.queries) {
      console.log('\n📋 Cached queries:');
      Object.entries(parsed.clientState.queries).forEach(([key, value]: [string, any]) => {
        const queryKey = value.queryKey;
        const dataUpdatedAt = value.state?.dataUpdatedAt;
        const age = dataUpdatedAt ? Math.round((Date.now() - dataUpdatedAt) / 1000 / 60) : '?';
        console.log(`  - ${JSON.stringify(queryKey)} (${age} minutes old)`);
      });
    }
    
    return parsed;
  } catch (error) {
    console.error('❌ Error inspecting cache:', error);
    return null;
  }
}

/**
 * Clear press-related cache entries
 */
export function clearPressCache() {
  try {
    const cacheData = localStorage.getItem(CACHE_KEY);
    
    if (!cacheData) {
      console.log('❌ No cache to clear');
      return;
    }
    
    const parsed = JSON.parse(cacheData);
    
    if (parsed.clientState?.queries) {
      const keysToRemove: string[] = [];
      
      Object.entries(parsed.clientState.queries).forEach(([key, value]: [string, any]) => {
        const queryKey = JSON.stringify(value.queryKey);
        if (queryKey.includes('press')) {
          keysToRemove.push(key);
        }
      });
      
      keysToRemove.forEach(key => {
        delete parsed.clientState.queries[key];
      });
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
      console.log(`✅ Cleared ${keysToRemove.length} press-related cache entries`);
      console.log('🔄 Reload the page to see fresh data');
    }
  } catch (error) {
    console.error('❌ Error clearing press cache:', error);
  }
}

/**
 * Show press-specific cache data
 */
export function showPressCache() {
  try {
    const cacheData = localStorage.getItem(CACHE_KEY);
    
    if (!cacheData) {
      console.log('❌ No cache found');
      return;
    }
    
    const parsed = JSON.parse(cacheData);
    
    if (parsed.clientState?.queries) {
      console.log('📰 Press-related cache entries:');
      let found = false;
      
      Object.entries(parsed.clientState.queries).forEach(([key, value]: [string, any]) => {
        const queryKey = JSON.stringify(value.queryKey);
        if (queryKey.includes('press')) {
          found = true;
          const dataUpdatedAt = value.state?.dataUpdatedAt;
          const age = dataUpdatedAt ? Math.round((Date.now() - dataUpdatedAt) / 1000 / 60) : '?';
          const hasData = !!value.state?.data;
          
          console.log(`\n  🔑 Key: ${queryKey}`);
          console.log(`     Age: ${age} minutes`);
          console.log(`     Has Data: ${hasData ? '✅' : '❌'}`);
          console.log(`     Status: ${value.state?.status || 'unknown'}`);
          
          if (hasData && value.state.data.data) {
            const count = Array.isArray(value.state.data.data) 
              ? value.state.data.data.length 
              : 'N/A';
            console.log(`     Item Count: ${count}`);
          }
        }
      });
      
      if (!found) {
        console.log('  ❌ No press cache entries found');
      }
    }
  } catch (error) {
    console.error('❌ Error showing press cache:', error);
  }
}

/**
 * Show all localStorage keys (for debugging)
 */
export function showAllStorageKeys() {
  console.log('🗄️  All localStorage keys:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const size = localStorage.getItem(key)?.length || 0;
      console.log(`  - ${key} (${Math.round(size / 1024)}KB)`);
    }
  }
}

// Make these available globally in dev mode
if (import.meta.env.DEV) {
  (window as any).inspectCache = inspectLocalStorageCache;
  (window as any).clearPressCache = clearPressCache;
  (window as any).showPressCache = showPressCache;
  (window as any).showAllStorageKeys = showAllStorageKeys;
  
  console.log('🛠️  Cache debug tools loaded. Available commands:');
  console.log('   window.inspectCache() - View all cached data');
  console.log('   window.showPressCache() - View press-specific cache');
  console.log('   window.clearPressCache() - Clear press cache');
  console.log('   window.showAllStorageKeys() - List all storage keys');
}

