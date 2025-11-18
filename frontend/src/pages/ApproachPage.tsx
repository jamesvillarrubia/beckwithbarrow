/**
 * Approach Page Component
 * 
 * Displays the firm's approach with two main sections styled per design spec:
 * 1. Top section - Image and content (using coverImage and introduction)
 * 2. Bottom section - Flowing timeline (using stages)
 * 
 * Design Features:
 * - Clean, minimal layout
 * - Image/content split for top section
 * - Flowing curved timeline for process stages
 * - Large numbered circles for stages
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
 * Type definition for a timeline stage
 */
interface TimelineStage {
  id: number;
  title: string;
  description?: string;
  image?: {
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
 * Type definition for a list item
 */
interface ListItem {
  id: number;
  text: string;
}

/**
 * Type definition for the Approach page data from Strapi
 */
interface ApproachData {
  title?: string;
  coverImage?: {
    url: string;
    alternativeText?: string;
    formats?: {
      small?: { url: string };
      medium?: { url: string };
      large?: { url: string };
    };
  };
  quote?: string;
  quoteBgColor?: string;
  servicesList?: ListItem[];
  stages?: TimelineStage[];
  [key: string]: unknown;
}

const ApproachPage = () => {
  // Fetch approach data from Strapi with all media populated
  const { data: approachData, isLoading } = useQuery({
    queryKey: ['approach'],
    queryFn: async () => {
      try {
        const result = await apiService.getSingleType('approach', 'coverImage,servicesList,stages.image');
        return result;
      } catch (err) {
        console.error('Approach API Error:', err);
        // Return empty data instead of throwing - allows graceful handling
        return { data: {} };
      }
    },
    retry: false, // Don't retry if content doesn't exist yet
    staleTime: 5 * 60 * 1000,
  });

  const approach = approachData?.data as ApproachData;
  const stages = approach?.stages || [];
  const servicesList = approach?.servicesList || [];

  /**
   * Helper function to format stage numbers with leading zeros
   */
  const formatStageNumber = (index: number): string => {
    return String(index + 1).padStart(2, '0');
  };

  /**
   * Helper function to get the image URL
   */
  const getImageUrl = (image?: TimelineStage['image'] | ApproachData['coverImage']) => {
    if (!image) return null;
    return image.url;
  };

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

  // If there's an error, show empty state but let the page render normally
  // (error handling is now done in the queryFn)

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation />
      
      {/* Breadcrumb Navigation */}
      <Breadcrumb />

      {/* SECTION 1: What We Do (using title, coverImage, services list) */}
      <section className="relative py-16 px-6 md:px-12 lg:px-16">

        <div className="relative grid md:grid-cols-2 gap-8 md:gap-12 mb-8 z-10">
          <div className="relative "></div>
              {/* Title */}
                <h1 className=" ml-7 text-4xl md:text-5xl font-serif text-gray-900 mb-12 font-light">
                  What We Do
                </h1>
              
          </div>

          {/* Light gray background panel behind image */}
          <div
            className="pointer-events-none hidden md:block absolute left-0 right-1/2 top-[220px] h-[590px] bg-gray-100"
            aria-hidden="true"
          />

          {/* Image and Content Grid */}
          <div className="max-w-7xl mx-auto">
            <div className="relative grid md:grid-cols-2 gap-8 md:gap-12 mb-8 z-10">
            {/* Left: Cover Image */}
            {approach?.coverImage && (
              <div className="relative md:w-[70%] md:ml-auto">
                <OptimizedImage
                  src={getImageUrl(approach.coverImage) || ''}
                  alt={approach.coverImage.alternativeText || approach.title || 'Our Approach'}
                  className="w-full h-auto"
                  width={420}
                  quality="auto"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            )}

            {/* Right: Services List with connected circular bullets (vertical spine) */}
            {servicesList.length > 0 && (
              <div className="flex flex-col justify-center">
                <div className="relative pl-8">
                  {/* Vertical spine behind bullets (solid line, centered under circles) */}
                  <div
                    className="absolute left-[43px] top-2 bottom-[9px] w-[2px] bg-[#333333]"
                    aria-hidden="true"
                  />

                  <div className="space-y-5">
                    {servicesList.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-start gap-4"
                      >
                        {/* Circle node centered on the vertical spine */}
                        <div className="mt-2 flex w-6 items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#333333] bg-white relative z-10" />
                        </div>

                        {/* Text aligned with node */}
                        <p className="text-gray-700 text-base leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>

      </section>

      {/* Optional Quote Section */}
      {approach?.quote && (
        <section 
          className="py-16 md:py-20"
          style={{ 
            backgroundColor: approach.quoteBgColor || '#F9FAFB'
          }}
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
            <blockquote className="text-2xl md:text-3xl lg:text-4xl font-serif font-extralight leading-tight text-gray-900 text-center">
              {approach.quote}
            </blockquote>
          </div>
        </section>
      )}

      {/* SECTION 2: How We Do It - Flowing Timeline (using stages) */}
      {stages && stages.length > 0 && (
        <section className="py-16 px-6 md:px-12 lg:px-16 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {/* Title for timeline section */}
            <h2 className="text-4xl md:text-5xl font-serif text-gray-900 mb-16 font-light">
              How We Do It
            </h2>

            {/* Flowing Timeline Stages */}
            <div className="space-y-16">
              {stages.map((stage, index) => {
                const isEven = index % 2 === 0;
                
                return (
                  <div 
                    key={stage.id || index}
                    className={`relative ${isEven ? 'md:pr-12' : 'md:pl-12'}`}
                  >
                    {/* Flowing Line - SVG curves between stages */}
                    {index < stages.length - 1 && (
                      <svg 
                        className="absolute left-0 right-0 top-full h-24 w-full pointer-events-none hidden md:block"
                        style={{ zIndex: 0 }}
                      >
                        <path
                          d={isEven 
                            ? "M 50 0 Q 50 60, 950 120"
                            : "M 950 0 Q 950 60, 50 120"
                          }
                          stroke="#D1D5DB"
                          strokeWidth="2"
                          fill="none"
                        />
                      </svg>
                    )}

                    {/* Stage Content */}
                    <div className="relative">
                      <div className="flex items-start gap-6">
                        {/* Large Number */}
                        <div className="flex-shrink-0">
                          <div className="w-20 flex items-center justify-start">
                            <span className="text-5xl font-light text-gray-900">
                              {formatStageNumber(index)}
                            </span>
                          </div>
                        </div>

                        {/* Stage Content */}
                        <div className="flex-1">
                          {/* Stage Title */}
                          <h3 className="text-2xl md:text-3xl font-serif text-gray-900 mb-4 font-light">
                            {stage.title}
                          </h3>

                          {/* Stage Description */}
                          {stage.description && (
                            <div className="prose prose-base max-w-none">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => (
                                    <p className="text-gray-700 text-base leading-relaxed mb-4">
                                      {children}
                                    </p>
                                  ),
                                }}
                              >
                                {stage.description}
                              </ReactMarkdown>
                            </div>
                          )}

                          {/* Stage Image (optional) */}
                          {stage.image && getImageUrl(stage.image) && (
                            <div className="mt-6">
                              <OptimizedImage 
                                src={getImageUrl(stage.image) || ''}
                                alt={stage.image.alternativeText || stage.title}
                                className="w-full rounded-sm shadow-sm"
                                width={800}
                                quality="auto"
                                sizes="(max-width: 768px) 100vw, 800px"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ApproachPage;
