/**
 * Press Page Component
 * 
 * Displays press coverage, media mentions, awards, and publications.
 * Features dynamic content from Strapi Press singleton.
 * 
 * Content Structure:
 * - Title and introduction
 * - List of press items (articles, awards, publications)
 * - Each item includes: title, source, date, description, link, optional image
 */

import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Breadcrumb from '../components/Breadcrumb';
import OptimizedImage from '../components/OptimizedImage';
import { apiService } from '../services/api';

/**
 * Type definition for a single press item
 */
interface PressItem {
  id: number;
  title: string;
  text?: string;
  color?: string;
  source?: string;
  date?: string;
  link?: string;
  image?: {
    url: string;
    alternativeText?: string;
    formats?: {
      small?: { url: string };
      medium?: { url: string };
    };
  };
}

/**
 * Type definition for the Press page content from Strapi
 */
interface PressData {
  title?: string;
  introduction?: string;
  pressItems?: PressItem[];
  [key: string]: unknown;
}

const PressPage = () => {
  // Fetch press data from Strapi
  const { data: pressData, isLoading, error } = useQuery({
    queryKey: ['press'],
    queryFn: async () => {
      console.log('Fetching press page data from API...');
      try {
        // Populate press items with images
        const result = await apiService.getSingleType('press', 'pressItems,pressItems.image');
        console.log('Press API Response:', result);
        return result;
      } catch (err) {
        console.error('Press API Error:', err);
        throw err;
      }
    },
    retry: 3, // Increase retries for cold starts
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const press = pressData?.data as PressData;

  /**
   * Helper function to format date strings
   * Converts ISO date to readable format (e.g., "January 15, 2024")
   */
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  /**
   * Helper function to get the image URL
   * Returns original URL - OptimizedImage component handles transformations
   */
  const getImageUrl = (image?: PressItem['image']) => {
    if (!image) return null;
    return image.url;
  };

  // Loading state - show spinner while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading press coverage...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state or placeholder - show when content doesn't exist yet
  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <Breadcrumb />

        {/* Placeholder Content */}
        <section className="py-16 px-6 md:px-12 lg:px-16">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-serif font-light text-gray-900 mb-6">
              Press & Media
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed mb-8">
              Content coming soon...
            </p>
            <p className="text-sm text-gray-400">
              (Press content type not yet configured in Strapi)
            </p>
          </div>
        </section>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation />

      {/* Breadcrumb Navigation */}
      <Breadcrumb />

      {/* Hero Section */}
      <section className="py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-light text-gray-900 mb-6">
            {press?.title || 'Press & Media'}
          </h1>
          
          {/* Introduction Text */}
          {press?.introduction && (
            <div className="prose prose-lg max-w-3xl mx-auto">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                      {children}
                    </p>
                  ),
                }}
              >
                {press.introduction}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </section>

      {/* Press Items Grid */}
      <section className="py-10 px-6 md:px-12 lg:px-16">
        <div className="max-w-6xl mx-auto">
          {press?.pressItems && press.pressItems.length > 0 ? (
            <div className="space-y-8">
              {press.pressItems.map((item) => (
                <article 
                  key={item.id}
                  className="border-b border-gray-200 pb-8 last:border-b-0 group"
                >
                  <div className="grid md:grid-cols-12 gap-6">
                    {/* Optional Image */}
                    {item.image && (
                      <div className="md:col-span-3">
                        <div 
                          className="aspect-[4/3] rounded-sm overflow-hidden"
                          style={{
                            borderLeft: item.color ? `4px solid ${item.color}` : undefined
                          }}
                        >
                          <OptimizedImage 
                            src={getImageUrl(item.image) || ''}
                            alt={item.image.alternativeText || item.title}
                            className="w-full h-full object-cover"
                            width={400}
                            quality="auto"
                            sizes="(max-width: 768px) 100vw, 25vw"
                          />
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className={item.image ? 'md:col-span-9' : 'md:col-span-12'}>
                      {/* Color Accent Bar (if no image) */}
                      {!item.image && item.color && (
                        <div 
                          className="h-1 w-20 mb-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      )}

                      {/* Meta Information */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                        {item.source && (
                          <span className="font-medium text-gray-700">{item.source}</span>
                        )}
                        {item.date && (
                          <>
                            {item.source && <span>•</span>}
                            <time>{formatDate(item.date)}</time>
                          </>
                        )}
                      </div>

                      {/* Title */}
                      <h2 
                        className="text-2xl md:text-3xl font-serif font-light text-gray-900 mb-3"
                        style={{
                          color: item.color || undefined
                        }}
                      >
                        {item.link ? (
                          <a 
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-70 transition-opacity"
                          >
                            {item.title}
                          </a>
                        ) : (
                          item.title
                        )}
                      </h2>

                      {/* Text Content */}
                      {item.text && (
                        <div className="prose prose-lg max-w-none">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => (
                                <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">
                                  {children}
                                </p>
                              ),
                              a: ({ href, children }) => (
                                <a 
                                  href={href}
                                  className="text-gray-900 underline hover:text-gray-600 transition-colors"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {item.text}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Read More Link */}
                      {item.link && (
                        <a 
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center font-medium transition-colors"
                          style={{
                            color: item.color || '#111827'
                          }}
                        >
                          Read more
                          <svg 
                            className="w-4 h-4 ml-2" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">No press coverage available yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PressPage;

