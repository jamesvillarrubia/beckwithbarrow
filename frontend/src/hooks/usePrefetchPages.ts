/**
 * usePrefetchPages Hook
 * 
 * Centralized page data prefetching system that can be called from anywhere
 * in the app to preload data for all major pages in the background.
 * 
 * This ensures instant navigation regardless of which page the user lands on first.
 * 
 * Usage:
 * ```tsx
 * import { usePrefetchPages } from './hooks/usePrefetchPages';
 * 
 * function MyComponent() {
 *   usePrefetchPages(); // That's it!
 *   // ...
 * }
 * ```
 */

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { apiService } from '../services/api';

interface PrefetchConfig {
  /** Query key for React Query cache */
  queryKey: string[];
  /** Function that fetches the data */
  queryFn: () => Promise<unknown>;
  /** Cache duration in milliseconds (default: 5 minutes) */
  staleTime?: number;
  /** Human-readable name for logging */
  name: string;
}

/**
 * Configuration for all pages that should be prefetched
 */
const PREFETCH_CONFIGS: PrefetchConfig[] = [
  {
    queryKey: ['global-settings'],
    queryFn: () => apiService.getSingleType('global', 'headerNavigation,footerNavigation'),
    staleTime: 10 * 60 * 1000, // 10 minutes - global settings change less frequently
    name: 'Global Settings',
  },
  {
    queryKey: ['home'],
    queryFn: () => apiService.getSingleType('home', 'leftImage,rightImage,projects.cover,quote'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    name: 'Home Page',
  },
  {
    queryKey: ['about'],
    queryFn: () => apiService.getSingleType('about'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    name: 'About Page',
  },
  {
    queryKey: ['connect'],
    queryFn: () => apiService.getSingleType('connect'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    name: 'Connect Page',
  },
  // Add more pages here as needed:
  // {
  //   queryKey: ['projects'],
  //   queryFn: () => apiService.getCollection('projects', 'cover'),
  //   staleTime: 5 * 60 * 1000,
  //   name: 'Projects List',
  // },
];

/**
 * Hook that prefetches all configured pages in the background
 * 
 * Features:
 * - Only runs once per app session
 * - Waits for current page to load before prefetching others (if waitForQuery specified)
 * - Skips prefetching if data is already in cache
 * - Runs prefetches in parallel for speed
 * - Gracefully handles errors without breaking the app
 * 
 * @param options Configuration options
 * @param options.skip Skip prefetching (useful for conditional execution)
 * @param options.delay Delay in ms before starting prefetch (default: 0)
 * @param options.waitForQuery Query key to wait for before prefetching (ensures current page loads first)
 */
export function usePrefetchPages(options?: { 
  skip?: boolean; 
  delay?: number;
  waitForQuery?: string[];
}) {
  const queryClient = useQueryClient();
  const hasRun = useRef(false);
  const { skip = false, delay = 0, waitForQuery } = options || {};

  useEffect(() => {
    // Only run once per app session
    if (hasRun.current || skip) {
      return;
    }

    hasRun.current = true;

    const prefetchAll = async () => {
      // If waitForQuery is specified, wait for that query to have data before prefetching
      if (waitForQuery) {
        console.log(`⏳ Waiting for ${JSON.stringify(waitForQuery)} to load before prefetching...`);
        
        // Poll until the query has data (max 10 seconds)
        const maxWaitTime = 10000;
        const pollInterval = 100;
        let elapsed = 0;
        
        while (elapsed < maxWaitTime) {
          const queryState = queryClient.getQueryState(waitForQuery);
          if (queryState?.data) {
            console.log(`✅ Query ${JSON.stringify(waitForQuery)} loaded, starting prefetch`);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          elapsed += pollInterval;
        }
        
        if (elapsed >= maxWaitTime) {
          console.warn(`⚠️  Timeout waiting for ${JSON.stringify(waitForQuery)}, prefetching anyway`);
        }
      }
      
      console.log('🚀 Starting background prefetch of other pages...');
      
      // Run all prefetches in parallel
      const prefetchPromises = PREFETCH_CONFIGS.map(async (config) => {
        // Check if data is already in cache
        const cachedData = queryClient.getQueryData(config.queryKey);
        
        if (cachedData) {
          console.log(`✅ ${config.name} already in cache, skipping prefetch`);
          return;
        }

        try {
          await queryClient.prefetchQuery({
            queryKey: config.queryKey,
            queryFn: config.queryFn,
            staleTime: config.staleTime,
          });
          console.log(`✅ ${config.name} prefetched successfully`);
        } catch (error) {
          console.error(`❌ Failed to prefetch ${config.name}:`, error);
          // Don't throw - we want other prefetches to continue
        }
      });

      await Promise.allSettled(prefetchPromises);
      console.log('🎉 All page prefetch attempts completed');
    };

    // Apply delay if specified
    if (delay > 0) {
      const timer = setTimeout(prefetchAll, delay);
      return () => clearTimeout(timer);
    } else {
      prefetchAll();
    }
  }, [queryClient, skip, delay, waitForQuery]);
}

/**
 * Smart wrapper that automatically waits for the current page to load
 * before prefetching other pages. Uses React Router location to determine
 * which query to wait for.
 * 
 * This is the recommended way to use the prefetch system as it ensures
 * the current page loads first, then other pages are fetched in the background.
 * 
 * Example console output when landing on home page:
 * ```
 * ⏳ Waiting for ["home"] to load before prefetching...
 * ✅ Query ["home"] loaded, starting prefetch
 * 🚀 Starting background prefetch of other pages...
 * ✅ Home Page already in cache, skipping prefetch
 * ✅ About Page prefetched successfully
 * ✅ Connect Page prefetched successfully
 * 🎉 All page prefetch attempts completed
 * ```
 * 
 * @param options Configuration options (optional)
 */
export function useSmartPrefetch(options?: { skip?: boolean; delay?: number }) {
  const location = useLocation();
  
  // Map routes to query keys that should be waited for
  const routeToQueryKey: Record<string, string[]> = {
    '/': ['home'],
    '/about': ['about'],
    '/connect': ['connect'],
    // Add more route mappings as needed
  };
  
  // Get the query key for the current route
  // For dynamic routes like /project/:slug, we don't wait (let them load naturally)
  const currentQueryKey = routeToQueryKey[location.pathname];
  
  // Use the prefetch hook with the detected query key
  usePrefetchPages({
    ...options,
    waitForQuery: currentQueryKey,
  });
}

/**
 * Export the configs if you need to add/modify them programmatically
 */
export { PREFETCH_CONFIGS };

