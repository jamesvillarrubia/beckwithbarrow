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
import { transformCloudinaryUrl, CloudinaryPresets } from '../utils/cloudinary';

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

  // Convert images to react-photo-album format (using optimized URLs for grid display)
  const photos = images.map((image) => ({
    src: transformCloudinaryUrl(image.url, CloudinaryPresets.card),
    alt: image.alternativeText || `${projectTitle} - Image`,
    title: image.caption || image.alternativeText,
    width: image.width || 800, // Use original width to preserve aspect ratio
    height: image.height || 600, // Use original height to preserve aspect ratio
  }));

  // Convert to Yet Another React Lightbox format (using high-quality optimized URLs for lightbox)
  const slides = images.map((image) => ({
    src: transformCloudinaryUrl(image.url, CloudinaryPresets.lightbox),
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
