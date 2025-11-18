/**
 * Press Article Page Component
 * 
 * Displays a single press article with full content.
 * Only shown when showExternal = false.
 * Features similar to ProjectPage: cover image, content, gallery.
 * 
 * Content Structure:
 * - Hero with cover image
 * - Article metadata (source, date)
 * - Full article content (rich text)
 * - Image gallery (if available)
 * - External link button (if available)
 */

import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Breadcrumb from '../components/Breadcrumb';
import OptimizedImage from '../components/OptimizedImage';
import { apiService } from '../services/api';
import { useEffect, useState } from 'react';

/**
 * Type definition for a press article with full details
 */
interface PressArticle {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  source?: string;
  publicationDate?: string;
  excerpt?: string;
  articleContent?: string;
  externalLink?: string;
  showExternal: boolean;
  color?: string;
  cover?: {
    url: string;
    alternativeText?: string;
    width?: number;
    height?: number;
    formats?: {
      small?: { url: string };
      medium?: { url: string };
      large?: { url: string };
    };
  };
  images?: Array<{
    id: number;
    url: string;
    alternativeText?: string;
    width?: number;
    height?: number;
    formats?: {
      small?: { url: string };
      medium?: { url: string };
      large?: { url: string };
    };
  }>;
}

const PressArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [selectedImage, setSelectedImage] = useState<number>(0);

  // Fetch press article from Strapi
  // Uses global cache settings (24 hours) for instant subsequent loads
  const { data: articleData, isLoading, error } = useQuery({
    queryKey: ['press-article', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');
      console.log('Fetching press article from API:', slug);
      try {
        const result = await apiService.getBySlug('press-articles', slug, 'cover,images');
        console.log('Press Article API Response:', result);
        return result;
      } catch (err) {
        console.error('Press Article API Error:', err);
        throw err;
      }
    },
    // Removed staleTime override - uses global 24-hour cache
    enabled: !!slug,
  });

  const article = articleData?.data?.[0] as PressArticle | undefined;

  // If article has showExternal=true and an external link, redirect
  useEffect(() => {
    if (article?.showExternal && article?.externalLink) {
      window.location.href = article.externalLink;
    }
  }, [article]);

  /**
   * Helper function to format date strings
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
   */
  const getImageUrl = (image?: PressArticle['cover']) => {
    if (!image) return null;
    return image.url;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading article...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state or not found
  if (error || !article) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <Breadcrumb />
        <section className="py-16 px-6 md:px-12 lg:px-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-serif font-light text-gray-900 mb-6">
              Article Not Found
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              The press article you're looking for doesn't exist or has been removed.
            </p>
            <Link 
              to="/press" 
              className="inline-flex items-center px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
            >
              ← Back to Press
            </Link>
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

      {/* Hero Section with Cover Image */}
      {article.cover && (
        <section className="py-8 px-6 md:px-12 lg:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="aspect-[16/9] rounded-sm overflow-hidden">
              <OptimizedImage 
                src={getImageUrl(article.cover) || ''}
                alt={article.cover.alternativeText || article.title}
                className="w-full h-full object-cover"
                width={1200}
                quality="auto:best"
                sizes="(max-width: 768px) 100vw, 1200px"
              />
            </div>
          </div>
        </section>
      )}

      {/* Article Content */}
      <section className="py-8 px-6 md:px-12 lg:px-16">
        <div className="max-w-4xl mx-auto">
          {/* Color Accent Bar */}
          {article.color && (
            <div 
              className="h-1 w-20 mb-6 rounded-full"
              style={{ backgroundColor: article.color }}
            />
          )}

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-6">
            {article.source && (
              <span className="font-medium text-gray-700 text-base">{article.source}</span>
            )}
            {article.publicationDate && (
              <>
                {article.source && <span>•</span>}
                <time className="text-base">{formatDate(article.publicationDate)}</time>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light text-gray-900 mb-6">
            {article.title}
          </h1>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed mb-8">
              {article.excerpt}
            </p>
          )}

          {/* Article Content */}
          {article.articleContent && (
            <div className="prose prose-lg max-w-none mb-12">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-3xl font-serif font-light text-gray-900 mt-12 mb-6">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-2xl font-serif font-light text-gray-900 mt-8 mb-4">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-lg text-gray-700 leading-relaxed mb-6">
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
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-6 space-y-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-6 space-y-2">
                      {children}
                    </ol>
                  ),
                }}
              >
                {article.articleContent}
              </ReactMarkdown>
            </div>
          )}

          {/* External Link Button */}
          {article.externalLink && (
            <div className="mb-12">
              <a 
                href={article.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 border-2 transition-colors"
                style={{
                  borderColor: article.color || '#111827',
                  color: article.color || '#111827'
                }}
              >
                Read full article on {article.source || 'publication website'}
                <svg 
                  className="w-5 h-5 ml-2" 
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
            </div>
          )}
        </div>
      </section>

      {/* Image Gallery */}
      {article.images && article.images.length > 0 && (
        <section className="py-8 px-6 md:px-12 lg:px-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-serif font-light text-gray-900 mb-8">Gallery</h2>
            
            {/* Main Image */}
            <div className="mb-6">
              <div className="aspect-[16/9] rounded-sm overflow-hidden">
                <OptimizedImage 
                  src={article.images[selectedImage]?.url || ''}
                  alt={article.images[selectedImage]?.alternativeText || `Image ${selectedImage + 1}`}
                  className="w-full h-full object-cover"
                  width={1200}
                  quality="auto:best"
                  sizes="(max-width: 768px) 100vw, 1200px"
                />
              </div>
            </div>

            {/* Thumbnail Grid */}
            {article.images.length > 1 && (
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {article.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-sm overflow-hidden transition-all ${
                      selectedImage === index 
                        ? 'ring-2 ring-gray-900 opacity-100' 
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <OptimizedImage 
                      src={image.url}
                      alt={image.alternativeText || `Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      width={150}
                      quality="auto"
                      sizes="150px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Back to Press Link */}
      <section className="py-12 px-6 md:px-12 lg:px-16">
        <div className="max-w-4xl mx-auto">
          <Link 
            to="/press" 
            className="inline-flex items-center text-gray-900 hover:text-gray-600 transition-colors"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 19l-7-7 7-7" 
              />
            </svg>
            Back to Press
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PressArticlePage;

