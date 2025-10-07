/**
 * Approach Page Component
 * 
 * Displays the firm's approach to architecture and design.
 * Features dynamic content from Strapi Approach singleton.
 */

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { apiService } from '../services/api';

interface ApproachData {
  title?: string;
  content?: string;
  [key: string]: unknown;
}

const ApproachPage = () => {
  const navigate = useNavigate();

  // Fetch approach data from Strapi
  const { data: approachData, isLoading } = useQuery({
    queryKey: ['approach'],
    queryFn: async () => {
      try {
        const result = await apiService.getSingleType('approach');
        return result;
      } catch (err) {
        console.error('Approach API Error:', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const approach = approachData?.data as ApproachData;

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading approach...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation />
      
      {/* Breadcrumb Navigation */}
      <section className="py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="mb-8 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 mt-8 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>
        </div>
      </section>
      
      {/* Hero Section */}
      <section className="py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl text-gray-900 mb-6">
            {approach?.title || 'Our Approach'}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
            {approach?.content || 'Content coming soon...'}
          </p>
        </div>
      </section>

      {/* Content Section - Ready for future data */}
      <section className="py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-6xl mx-auto">
          {/* Add more content sections here as they're defined in Strapi */}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ApproachPage;

