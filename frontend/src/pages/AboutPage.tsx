/**
 * AboutPage Component
 * 
 * About page with 2x2 grid layout featuring:
 * - Title section ("Who we are")
 * - 2x2 grid layout:
 *   - Top left: Vertical image
 *   - Top right: Rich text content
 *   - Bottom left: Rich text content
 *   - Bottom right: Vertical image
 * - Responsive: Stacks vertically on mobile
 * - Rich text rendered with markdown support
 * - Images maintain tall (2:3) aspect ratio
 * 
 * Content managed through Strapi's About singleton with fixed fields.
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Breadcrumb from '../components/Breadcrumb';
import { apiService } from '../services/api';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

/**
 * Type definitions for Strapi media
 */
interface StrapiMedia {
  id: number;
  url: string;
  formats?: {
    large?: { url: string };
    medium?: { url: string };
    small?: { url: string };
  };
  alternativeText?: string;
}

/**
 * Type definition for the About page content from Strapi
 */
interface AboutContent {
  title?: string;
  topLeftImage?: StrapiMedia;
  topRightText?: string;
  bottomLeftText?: string;
  bottomRightImage?: StrapiMedia;
}

/**
 * Image with loading and error states
 * Shows placeholder while loading or if image fails to load
 */
const ImageWithPlaceholder = ({ 
  src, 
  alt 
}: { 
  src: string; 
  alt: string;
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className="aspect-[2/3] rounded-sm overflow-hidden bg-gray-100 relative">
      {/* Loading/Error Placeholder */}
      {(imageState === 'loading' || imageState === 'error') && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          {imageState === 'loading' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500">Loading image...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-4 text-center">
              <svg 
                className="w-16 h-16 text-gray-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
              <p className="text-sm text-gray-400">Image unavailable</p>
            </div>
          )}
        </div>
      )}
      
      {/* Actual Image */}
      <img 
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setImageState('loaded')}
        onError={() => setImageState('error')}
      />
    </div>
  );
};

const AboutPage = () => {
  const { lightThemeColor } = useGlobalSettings();
  
  // Fetch about page content from Strapi
  const { data: aboutData, isLoading, error } = useQuery({
    queryKey: ['about'],
    queryFn: async () => {
      console.log('Fetching about page data from API...');
      try {
        // Populate all fields with wildcard
        const result = await apiService.getSingleType('about', '*');
        console.log('About API Response:', result);
        return result;
      } catch (err) {
        console.error('About API Error:', err);
        throw err;
      }
    },
    retry: 3, // Increase retries for cold starts
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff: 1s, 2s, 4s
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const aboutContent = aboutData?.data as AboutContent;

  /**
   * Helper function to get the best image URL
   * Prefers large format, falls back to original
   */
  const getImageUrl = (media?: StrapiMedia) => {
    if (!media) {
      console.log('No media object provided');
      return null;
    }
    const url = media.formats?.large?.url || media.url;
    console.log('Image URL:', url, 'Media object:', media);
    return url;
  };

  // Debug: Log the about content structure
  if (aboutContent && import.meta.env.DEV) {
    console.log('About Content:', aboutContent);
    console.log('Top Left Image:', aboutContent.topLeftImage);
    console.log('Bottom Right Image:', aboutContent.bottomRightImage);
  }

  // Loading state - show spinner while fetching data
  if (isLoading) {
    return (
      <div className="bg-white text-black">
        <Navigation />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state - show user-friendly error message
  if (error) {
    return (
      <div className="bg-white text-black">
        <Navigation />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg">Unable to load about page content</p>
            <p className="text-gray-500 text-sm mt-2">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-black">
      {/* Navigation */}
      <Navigation />

      {/* Breadcrumb Navigation */}
      <Breadcrumb />

      {/* Title Section with Decorative Lines */}
      <section className="pt-0 relative">
        <div className="max-w-4xl mx-auto pl-6 text-center relative">
          <h1 className="text-5xl md:text-6xl text-left px-2 md:px-10 font-serif font-light leading-relaxed text-gray-900 relative z-10">
            {aboutContent?.title || 'Who we are'}
          </h1>
          
          {/* Decorative Cross Lines - SVG positioned absolutely */}
          <svg 
            className="hidden lg:block absolute top-0 w-full pointer-events-none z-20"
            style={{ height: 'calc(100% + 600px)', left: '-80px', top: '10px'}}
            viewBox="0 0 100 100"
            preserveAspectRatio="xMinYMin meet"
          >
          {/* Horizontal line - starts 5% left, extends to 80% */}
          <line
            x1="5"
            y1="12"
            x2="105"
            y2="12"
            stroke={lightThemeColor}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Vertical line - starts above title, goes down alongside content */}
          <line
            x1="15"
            y1="0"
            x2="15"
            y2="100"
            stroke={lightThemeColor}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Circle tangent to both lines - diameter is 70% of horizontal line width */}
          <circle
            cx="46"
            cy="43"
            r="31"
            stroke={lightThemeColor}
            strokeWidth="1.5"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
          </svg>
        </div>
      </section>

      {/* 2x2 Grid Layout */}
      <section className="pb-16 pt-8 relative">
        <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-16 relative">
          {/* Desktop: 2x2 Grid, Mobile: Stacked */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Top Left: Vertical Image */}
            {aboutContent?.topLeftImage ? (
              <div className="w-full">
                <ImageWithPlaceholder
                  src={getImageUrl(aboutContent.topLeftImage) || ''}
                  alt={aboutContent.topLeftImage.alternativeText || 'About image'}
                />
              </div>
            ) : (
              <div className="w-full">
                <div className="aspect-[2/3] rounded-sm overflow-hidden bg-gray-100 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 px-4 text-center">
                    <svg 
                      className="w-16 h-16 text-gray-300" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      />
                    </svg>
                    <p className="text-sm text-gray-400">No image added</p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Right: Rich Text */}
            <div className="pt-4">
              {aboutContent?.topRightText ? (
                <div className="prose prose-lg max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h2 className="text-3xl md:text-4xl font-serif font-light leading-relaxed text-gray-900 mb-6">
                          {children}
                        </h2>
                      ),
                      h2: ({ children }) => (
                        <h3 className="text-2xl md:text-3xl font-serif font-light leading-relaxed text-gray-900 mb-4">
                          {children}
                        </h3>
                      ),
                      h3: ({ children }) => (
                        <h4 className="text-xl md:text-2xl font-serif font-light leading-relaxed text-gray-900 mb-4">
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => (
                        <p className="text-base md:text-lg font-sans text-gray-700 leading-relaxed mb-6">
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
                      li: ({ children }) => (
                        <li className="text-base md:text-lg font-sans text-gray-700 leading-relaxed">
                          {children}
                        </li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-300 pl-6 italic my-6">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {aboutContent.topRightText}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-base md:text-lg font-sans text-gray-400 leading-relaxed">
                  No content added yet.
                </p>
              )}
            </div>

            {/* Bottom Left: Rich Text */}
            <div className="pt-4">
              {aboutContent?.bottomLeftText ? (
                <div className="prose prose-lg max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h2 className="text-3xl md:text-4xl font-serif font-light leading-relaxed text-gray-900 mb-6">
                          {children}
                        </h2>
                      ),
                      h2: ({ children }) => (
                        <h3 className="text-2xl md:text-3xl font-serif font-light leading-relaxed text-gray-900 mb-4">
                          {children}
                        </h3>
                      ),
                      h3: ({ children }) => (
                        <h4 className="text-xl md:text-2xl font-serif font-light leading-relaxed text-gray-900 mb-4">
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => (
                        <p className="text-base md:text-lg font-sans text-gray-700 leading-relaxed mb-6">
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
                      li: ({ children }) => (
                        <li className="text-base md:text-lg font-sans text-gray-700 leading-relaxed">
                          {children}
                        </li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-300 pl-6 italic my-6">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {aboutContent.bottomLeftText}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-base md:text-lg font-sans text-gray-400 leading-relaxed">
                  No content added yet.
                </p>
              )}
            </div>

            {/* Bottom Right: Vertical Image */}
            {aboutContent?.bottomRightImage ? (
              <div className="w-full">
                <ImageWithPlaceholder
                  src={getImageUrl(aboutContent.bottomRightImage) || ''}
                  alt={aboutContent.bottomRightImage.alternativeText || 'About image'}
                />
              </div>
            ) : (
              <div className="w-full">
                <div className="aspect-[2/3] rounded-sm overflow-hidden bg-gray-100 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 px-4 text-center">
                    <svg 
                      className="w-16 h-16 text-gray-300" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      />
                    </svg>
                    <p className="text-sm text-gray-400">No image added</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AboutPage;
