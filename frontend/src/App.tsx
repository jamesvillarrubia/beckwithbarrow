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
import { usePrefetchPages } from './hooks/usePrefetchPages';

// Create a client
const queryClient = new QueryClient();

/**
 * AppContent - Internal component that has access to QueryClient context
 * This is where we call usePrefetchPages since it needs the QueryClient
 */
function AppContent() {
  // Prefetch all pages in the background on initial load
  usePrefetchPages();

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