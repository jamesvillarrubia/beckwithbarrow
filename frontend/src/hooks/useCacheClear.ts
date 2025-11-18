/**
 * useCacheClear Hook
 * 
 * Provides a keyboard shortcut (Ctrl + Shift + K) to clear the cache
 * and force a fresh data fetch from Strapi.
 * 
 * This is useful for:
 * - Content editors who want to see updates immediately
 * - Users experiencing stale data issues
 * - Testing and debugging
 * 
 * Usage:
 * ```tsx
 * import { useCacheClear } from './hooks/useCacheClear';
 * 
 * function App() {
 *   useCacheClear(); // Enables Ctrl + Shift + K to clear cache
 *   // ...
 * }
 * ```
 */

import { useEffect } from 'react';
import { clearCache } from '../utils/cacheUtils';

export function useCacheClear() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl + Shift + K (works on all platforms)
      // Note: Cmd + Shift + K conflicts with browser DevTools
      if (event.ctrlKey && event.shiftKey && event.key === 'K') {
        event.preventDefault();
        console.log('🗑️  Cache clear shortcut detected (Ctrl + Shift + K)');
        clearCache();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Log the shortcut availability in development mode
    if (import.meta.env.DEV) {
      console.log(
        '%c🗑️  Cache Clear Shortcut Available',
        'background: #EF4444; color: white; padding: 4px 8px; border-radius: 4px;',
        '\nPress Ctrl + Shift + K to clear cache and reload'
      );
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}

