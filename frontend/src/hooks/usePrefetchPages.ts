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
    queryKey: ['home'],
    queryFn: () => apiService.getSingleType('home', 'leftImage,rightImage,projects.cover,quote'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    name: 'Home Page',
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
 * - Skips prefetching if data is already in cache
 * - Runs prefetches in parallel for speed
 * - Gracefully handles errors without breaking the app
 * 
 * @param options Configuration options
 * @param options.skip Skip prefetching (useful for conditional execution)
 * @param options.delay Delay in ms before starting prefetch (default: 0)
 */
export function usePrefetchPages(options?: { skip?: boolean; delay?: number }) {
  const queryClient = useQueryClient();
  const hasRun = useRef(false);
  const { skip = false, delay = 0 } = options || {};

  useEffect(() => {
    // Only run once per app session
    if (hasRun.current || skip) {
      return;
    }

    hasRun.current = true;

    const prefetchAll = async () => {
      console.log('🚀 Starting background prefetch of all pages...');
      
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
  }, [queryClient, skip, delay]);
}

/**
 * Export the configs if you need to add/modify them programmatically
 */
export { PREFETCH_CONFIGS };

