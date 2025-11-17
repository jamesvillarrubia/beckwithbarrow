/**
 * Cache Utility Functions
 * 
 * Helper functions for managing and debugging the React Query cache
 * and localStorage persistence.
 */

/**
 * Clear all cached data from localStorage
 * Useful for debugging or forcing a fresh data fetch
 */
export const clearCache = (): void => {
  try {
    localStorage.removeItem('beckwithbarrow-cache');
    console.log('✅ Cache cleared successfully');
    // Reload page to refetch all data
    window.location.reload();
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
  }
};

/**
 * Get cache size in bytes and human-readable format
 */
export const getCacheSize = (): { bytes: number; readable: string } => {
  try {
    const cache = localStorage.getItem('beckwithbarrow-cache');
    if (!cache) {
      return { bytes: 0, readable: '0 KB' };
    }
    
    const bytes = new Blob([cache]).size;
    const kb = bytes / 1024;
    const mb = kb / 1024;
    
    let readable: string;
    if (mb >= 1) {
      readable = `${mb.toFixed(2)} MB`;
    } else {
      readable = `${kb.toFixed(2)} KB`;
    }
    
    return { bytes, readable };
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return { bytes: 0, readable: 'Error' };
  }
};

/**
 * Get information about cached queries
 */
export const getCacheInfo = (): {
  exists: boolean;
  queryCount: number;
  timestamp: number | null;
  age: string | null;
} => {
  try {
    const cache = localStorage.getItem('beckwithbarrow-cache');
    if (!cache) {
      return { exists: false, queryCount: 0, timestamp: null, age: null };
    }
    
    const parsed = JSON.parse(cache);
    const queries = parsed.clientState?.queries || [];
    const timestamp = parsed.timestamp || null;
    
    let age: string | null = null;
    if (timestamp) {
      const ageMs = Date.now() - timestamp;
      const ageMinutes = Math.floor(ageMs / 1000 / 60);
      const ageHours = Math.floor(ageMinutes / 60);
      const ageDays = Math.floor(ageHours / 24);
      
      if (ageDays > 0) {
        age = `${ageDays}d ${ageHours % 24}h`;
      } else if (ageHours > 0) {
        age = `${ageHours}h ${ageMinutes % 60}m`;
      } else {
        age = `${ageMinutes}m`;
      }
    }
    
    return {
      exists: true,
      queryCount: queries.length,
      timestamp,
      age,
    };
  } catch (error) {
    console.error('Failed to get cache info:', error);
    return { exists: false, queryCount: 0, timestamp: null, age: null };
  }
};

/**
 * List all cached query keys
 */
export const getCachedQueries = (): string[] => {
  try {
    const cache = localStorage.getItem('beckwithbarrow-cache');
    if (!cache) return [];
    
    const parsed = JSON.parse(cache);
    const queries = parsed.clientState?.queries || [];
    
    return queries.map((q: { queryKey: string[] }) => 
      JSON.stringify(q.queryKey)
    );
  } catch (error) {
    console.error('Failed to get cached queries:', error);
    return [];
  }
};

/**
 * Export cache data (useful for debugging)
 */
export const exportCache = (): void => {
  try {
    const cache = localStorage.getItem('beckwithbarrow-cache');
    if (!cache) {
      console.log('No cache to export');
      return;
    }
    
    const parsed = JSON.parse(cache);
    const blob = new Blob([JSON.stringify(parsed, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beckwithbarrow-cache-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ Cache exported successfully');
  } catch (error) {
    console.error('❌ Failed to export cache:', error);
  }
};

/**
 * Check if localStorage is available and working
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get localStorage usage statistics
 */
export const getStorageStats = (): {
  used: string;
  available: boolean;
  totalItems: number;
} => {
  let totalSize = 0;
  let itemCount = 0;
  
  try {
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
          itemCount++;
        }
      }
    }
    
    const mb = totalSize / 1024 / 1024;
    const used = mb >= 1 ? `${mb.toFixed(2)} MB` : `${(totalSize / 1024).toFixed(2)} KB`;
    
    return {
      used,
      available: isLocalStorageAvailable(),
      totalItems: itemCount,
    };
  } catch {
    return {
      used: 'Error',
      available: false,
      totalItems: 0,
    };
  }
};

/**
 * Console logging helper for cache debugging
 */
export const logCacheInfo = (): void => {
  console.group('🗄️ Cache Information');
  
  const info = getCacheInfo();
  console.log('Cache exists:', info.exists);
  console.log('Cached queries:', info.queryCount);
  console.log('Cache age:', info.age || 'N/A');
  
  const size = getCacheSize();
  console.log('Cache size:', size.readable);
  
  const queries = getCachedQueries();
  console.log('Query keys:', queries);
  
  const storage = getStorageStats();
  console.log('Total localStorage used:', storage.used);
  console.log('Total localStorage items:', storage.totalItems);
  
  console.groupEnd();
};

// Make functions available in browser console for debugging
if (import.meta.env.DEV) {
  (window as { cacheUtils?: unknown }).cacheUtils = {
    clearCache,
    getCacheSize,
    getCacheInfo,
    getCachedQueries,
    exportCache,
    logCacheInfo,
    getStorageStats,
  };
  
  console.log(
    '%c💡 Cache Utils Available',
    'background: #3B82F6; color: white; padding: 4px 8px; border-radius: 4px;',
    '\nUse window.cacheUtils to access cache utilities:\n' +
    '- clearCache() - Clear all cached data\n' +
    '- logCacheInfo() - Display cache information\n' +
    '- exportCache() - Download cache as JSON\n' +
    '- getCacheSize() - Get cache size\n' +
    '- getCachedQueries() - List cached queries'
  );
}

