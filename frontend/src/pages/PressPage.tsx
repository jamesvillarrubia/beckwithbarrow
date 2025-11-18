/**
 * Press Page Component
 * 
 * Displays press coverage, media mentions, awards, and publications.
 * Features dynamic content from Strapi Press Articles collection.
 * 
 * Content Structure:
 * - Title and introduction from Press singleton
 * - Grid of press articles from Press Article collection
 * - Each article: title, source, date, excerpt, cover image
 * - Click to view full article (internal) or link to external source
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Breadcrumb from '../components/Breadcrumb';
import OptimizedImage from '../components/OptimizedImage';
import { apiService } from '../services/api';

/**
 * Type definition for a press article
 */
interface PressArticle {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  source?: string;
  publicationDate?: string;
  excerpt?: string;
  externalLink?: string;
  showExternal: boolean;
  color?: string;
  cover?: {
    url: string;
    alternativeText?: string;
    formats?: {
      small?: { url: string };
      medium?: { url: string };
      large?: { url: string };
    };
  };
}

/**
 * Type definition for the Press page intro content from Strapi
 */
interface PressPageData {
  title?: string;
  introduction?: string;
  [key: string]: unknown;
}

const PressPage = () => {
  // Fetch press page intro content (optional - page works without it)
  // Uses global cache settings (24 hours) for fast subsequent loads
  const { data: pressPageData } = useQuery({
    queryKey: ['press-page'],
    queryFn: async () => {
      try {
        return await apiService.getSingleType('press');
      } catch {
        // Press intro is optional - return null if not configured
        return null;
      }
    },
    retry: false, // Don't retry if intro doesn't exist
  });

  // Fetch press articles collection
  // Uses global cache settings (24 hours) for fast subsequent loads
  const { 
    data: articlesData, 
    isLoading: isLoadingArticles, 
    error
  } = useQuery({
    queryKey: ['press-articles'],
    queryFn: () => apiService.getCollection('press-articles', 'cover'),
  });

  const pressPage = pressPageData?.data as PressPageData;
  const articles = (articlesData?.data || []) as PressArticle[];
  // Only show loading state while articles are loading (intro is optional)
  const isLoading = isLoadingArticles;

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
  const getImageUrl = (image?: PressArticle['cover']) => {
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
            {pressPage?.title || 'Press & Media'}
          </h1>
          
          {/* Introduction Text */}
          {pressPage?.introduction && (
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
                {pressPage.introduction}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </section>

      {/* Press Articles Grid */}
      <section className="py-10 px-6 md:px-12 lg:px-16">
        <div className="max-w-6xl mx-auto">
          {articles && articles.length > 0 ? (
            <div className="space-y-8">
              {articles.map((article) => {
                const articleLink = article.showExternal && article.externalLink 
                  ? article.externalLink 
                  : `/press/${article.slug}`;
                const isExternal = article.showExternal && article.externalLink;

                return (
                  <article 
                    key={article.id}
                    className="border-b border-gray-200 pb-8 last:border-b-0 group"
                  >
                    <div className="grid md:grid-cols-12 gap-6">
                      {/* Cover Image */}
                      {article.cover && (
                        <div className="md:col-span-3">
                          <Link to={articleLink}>
                            <div 
                              className="flex items-center justify-center"
                              style={{
                                borderLeft: article.color ? `4px solid ${article.color}` : undefined
                              }}
                            >
                              <OptimizedImage 
                                src={getImageUrl(article.cover) || ''}
                                alt={article.cover.alternativeText || article.title}
                                className="max-w-full max-h-full border border-gray-200 rounded-sm group-hover:opacity-90 transition-opacity"
                                width={400}
                                quality="auto"
                                sizes="(max-width: 768px) 100vw, 25vw"
                              />
                            </div>
                          </Link>
                        </div>
                      )}

                      {/* Content */}
                      <div className={article.cover ? 'md:col-span-9' : 'md:col-span-12'}>
                        {/* Color Accent Bar (if no cover image) */}
                        {!article.cover && article.color && (
                          <div 
                            className="h-1 w-20 mb-4 rounded-full"
                            style={{ backgroundColor: article.color }}
                          />
                        )}

                        {/* Meta Information */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                          {article.source && (
                            <span className="font-medium text-gray-700">{article.source}</span>
                          )}
                          {article.publicationDate && (
                            <>
                              {article.source && <span>•</span>}
                              <time>{formatDate(article.publicationDate)}</time>
                            </>
                          )}
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl md:text-3xl font-serif font-light text-gray-900 mb-3">
                          {isExternal ? (
                            <a 
                              href={articleLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-900 hover:opacity-70 transition-opacity"
                            >
                              {article.title}
                            </a>
                          ) : (
                            <Link 
                              to={articleLink}
                              className="text-gray-900 hover:opacity-70 transition-opacity"
                            >
                              {article.title}
                            </Link>
                          )}
                        </h2>

                        {/* Excerpt */}
                        {article.excerpt && (
                          <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">
                            {article.excerpt}
                          </p>
                        )}

                        {/* Read More Link */}
                        {isExternal ? (
                          <a 
                            href={articleLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center font-medium transition-colors"
                            style={{
                              color: article.color || '#111827'
                            }}
                          >
                            Read article
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
                        ) : (
                          <Link 
                            to={articleLink}
                            className="inline-flex items-center font-medium transition-colors"
                            style={{
                              color: article.color || '#111827'
                            }}
                          >
                            View article
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
                                d="M9 5l7 7-7 7" 
                              />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
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

