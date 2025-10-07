/**
 * App Component
 * 
 * Root application component that provides:
 * - React Query context for data fetching and caching
 * - React Router for client-side navigation
 * - Centralized page prefetching for instant navigation
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ConnectPage from './pages/ConnectPage';
import ProjectPage from './pages/ProjectPage';
import { useSmartPrefetch } from './hooks/usePrefetchPages';

// Create a client
const queryClient = new QueryClient();

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} /> 
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/project/:slug" element={<ProjectPage />} />
          {/* Catch-all route for 404s */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;