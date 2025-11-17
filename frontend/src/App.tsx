/**
 * App Component
 * 
 * Root application component that provides:
 * - React Query context for data fetching and caching
 * - React Router for client-side navigation
 * - Centralized page prefetching for instant navigation
 * - Local storage persistence for offline-first experience
 */

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useSmartPrefetch } from './hooks/usePrefetchPages';

// Lazy load pages for better code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ApproachPage = lazy(() => import('./pages/ApproachPage'));
const ConnectPage = lazy(() => import('./pages/ConnectPage'));
const PressPage = lazy(() => import('./pages/PressPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));

// Import cache utilities (dev only - makes them available in console)
if (import.meta.env.DEV) {
  import('./utils/cacheUtils');
}

/**
 * Create a QueryClient with optimized cache settings
 * - Longer stale times to reduce unnecessary refetches
 * - Automatic retries with exponential backoff
 * - Keeps data in cache even when unused
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24, // 24 hours - data stays fresh for a day
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep unused data for a week
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false, // Don't refetch when user tabs back
      refetchOnReconnect: true, // Refetch when connection is restored
      refetchOnMount: false, // Don't refetch on component mount if data exists
    },
  },
});

/**
 * Cache version control
 * Increment this version number whenever you make breaking changes to:
 * - API response structures
 * - Populate parameters
 * - Data schemas
 * 
 * This will automatically invalidate old caches and force fresh data fetch
 */
const CACHE_VERSION = 'v5'; // Fixed: Don't populate simple fields (colors), only relations/media

/**
 * Create a localStorage persister with version control
 * This saves the React Query cache to localStorage so it persists across page reloads
 * The version is included in the key so old caches are automatically ignored
 */
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: `beckwithbarrow-cache-${CACHE_VERSION}`, // Versioned key
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

/**
 * Clean up old cache versions on startup
 * This removes outdated cache entries to save space
 */
const cleanupOldCaches = () => {
  const allKeys = Object.keys(localStorage);
  const oldCacheKeys = allKeys.filter(
    key => key.startsWith('beckwithbarrow-cache-') && key !== `beckwithbarrow-cache-${CACHE_VERSION}`
  );
  
  oldCacheKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🧹 Cleaned up old cache: ${key}`);
  });
  
  if (oldCacheKeys.length > 0) {
    console.log(`✨ Cache updated to ${CACHE_VERSION}`);
  }
};

// Run cleanup on app initialization
cleanupOldCaches();

/**
 * AppContent - Internal component that has access to QueryClient context
 * This is where we call useSmartPrefetch which automatically waits for the
 * current page to load before prefetching others
 */
function AppContent() {
  // Smart prefetch: waits for current page to load, then prefetches others
  useSmartPrefetch();

  return (
    <div className="min-h-screen">
      <main>
        <Suspense fallback={
          <div className="h-screen flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-white">Loading...</p>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/approach" element={<ApproachPage />} />
            <Route path="/connect" element={<ConnectPage />} />
            <Route path="/press" element={<PressPage />} />
            <Route path="/project/:slug" element={<ProjectPage />} />
            {/* Catch-all route for 404s */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }} // 7 days max age
    >
      <Router>
        <AppContent />
      </Router>
    </PersistQueryClientProvider>
  );
}

export default App;