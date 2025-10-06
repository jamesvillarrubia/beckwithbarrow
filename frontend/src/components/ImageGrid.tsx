/**
 * ImageGrid Component
 * 
 * A masonry-style grid layout for displaying project images with:
 * - Responsive masonry layout
 * - Click-to-open lightbox functionality using Yet Another React Lightbox
 * - Lazy loading for performance
 * - Hover effects and smooth transitions
 * 
 * Features:
 * - Dynamic column layout based on screen size
 * - Optimized image loading
 * - Accessibility support
 * - Mobile-friendly touch interactions
 * - Professional lightbox with photo gallery features
 */

import { useState, useEffect } from 'react';
import { ColumnsPhotoAlbum } from 'react-photo-album';
import 'react-photo-album/columns.css';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

interface ProjectImage {
  id: number;
  url: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: {
    small?: { url: string; width: number; height: number; };
    medium?: { url: string; width: number; height: number; };
    large?: { url: string; width: number; height: number; };
    thumbnail?: { url: string; width: number; height: number; };
  };
}

interface ImageGridProps {
  images: ProjectImage[];
  projectTitle: string;
  className?: string;
}

// Animated image wrapper component
const AnimatedImage = ({ children }: { children: React.ReactNode }) => {
  const { elementRef, animationStyle } = useScrollAnimation({
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
    delay: 0, // No artificial delay - trigger when in view
    duration: 400
  });

  return (
    <div ref={elementRef} style={animationStyle}>
      {children}
    </div>
  );
};

const ImageGrid = ({ images, projectTitle, className = '' }: ImageGridProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setSelectedImageIndex(null);
  };

  // Preload large images in the background
  useEffect(() => {
    const preloadImage = (src: string, index: number) => {
      const img = new Image();
      img.onload = () => {
        setPreloadedImages(prev => new Set([...prev, index]));
      };
      img.src = src;
    };

    // Start preloading large images after a short delay
    const timer = setTimeout(() => {
      images.forEach((image, index) => {
        if (!preloadedImages.has(index)) {
          preloadImage(image.url, index);
        }
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [images, preloadedImages]);

  // Convert images to react-photo-album format (using small format with original dimensions)
  const photos = images.map((image) => ({
    src: image.formats?.small?.url || image.url,
    alt: image.alternativeText || `${projectTitle} - Image`,
    title: image.caption || image.alternativeText,
    width: image.width || 800, // Use original width to preserve aspect ratio
    height: image.height || 600, // Use original height to preserve aspect ratio
  }));

  // Convert to Yet Another React Lightbox format (using large format for lightbox)
  const slides = images.map((image) => ({
    src: image.formats?.large?.url || image.url, // Use large format if available, fallback to original
    alt: image.alternativeText || `${projectTitle} - Image`,
    title: image.caption || image.alternativeText,
    width: image.width, // Use original width to preserve aspect ratio
    height: image.height, // Use original height to preserve aspect ratio
  }));

  // No images to display
  if (!images || images.length === 0) {
    return (
      <section className={`py-16 px-6 md:px-12 lg:px-16 ${className}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No images available for this project</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={`py-16 px-6 md:px-12 lg:px-16 ${className}`}>
        <div className="max-w-6xl mx-auto">
          {/* React Photo Album - Responsive Columns Layout */}
          <ColumnsPhotoAlbum
            photos={photos}
            columns={(containerWidth) => {
              if (containerWidth < 640) return 2; // Mobile: 2 columns
              if (containerWidth < 1024) return 3; // Tablet: 3 columns
              return 4; // Desktop: 4 columns
            }}
            onClick={({ index }) => openLightbox(index)}
            renderPhoto={({ photo, wrapperStyle, renderDefaultPhoto }) => (
              <AnimatedImage>
                <div
                  style={{
                    ...wrapperStyle,
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                  className="group"
                >
                  {renderDefaultPhoto({ wrapped: true })}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white bg-opacity-90 rounded-full p-3">
                        <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedImage>
            )}
          />
        </div>
      </section>

      {/* Yet Another React Lightbox - Simple Navigation Only */}
      <Lightbox
        index={selectedImageIndex || 0}
        slides={slides}
        open={isLightboxOpen}
        close={closeLightbox}
      />
    </>
  );
};

export default ImageGrid;
