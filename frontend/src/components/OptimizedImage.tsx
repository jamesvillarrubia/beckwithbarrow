/**
 * OptimizedImage Component
 * 
 * A drop-in replacement for <img> tags that automatically optimizes Cloudinary images.
 * Provides:
 * - Automatic format selection (WebP/AVIF)
 * - Responsive image loading with srcset
 * - Quality optimization
 * - Lazy loading
 * - Proper aspect ratio preservation
 * - Optional fade-in effect with background
 * 
 * For non-Cloudinary images, falls back to standard <img> behavior.
 * 
 * @example
 * ```tsx
 * <OptimizedImage
 *   src={imageUrl}
 *   alt="Project image"
 *   width={800}
 *   sizes="(max-width: 768px) 100vw, 800px"
 *   quality="auto:good"
 *   className="rounded-lg"
 *   fadeIn={true}
 *   fadeInBg="bg-black"
 * />
 * ```
 */

import { ImgHTMLAttributes, useState } from 'react';
import { 
  getResponsiveImageProps, 
  isCloudinaryUrl 
} from '../utils/cloudinary';
import type { CloudinaryTransformOptions } from '../utils/cloudinary';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'srcSet'> {
  src: string;
  alt: string;
  width?: number;
  quality?: CloudinaryTransformOptions['quality'];
  crop?: CloudinaryTransformOptions['crop'];
  gravity?: CloudinaryTransformOptions['gravity'];
  // Standard sizes attribute for responsive images
  sizes?: string;
  // Whether to enable lazy loading (default: true)
  loading?: 'lazy' | 'eager';
  // fetchpriority hint for browser resource prioritization
  fetchpriority?: 'high' | 'low' | 'auto';
  // Enable fade-in effect (default: false)
  fadeIn?: boolean;
  // Background color while loading (default: 'bg-black')
  fadeInBg?: string;
  // Fade duration in ms (default: 500)
  fadeDuration?: number;
}

/**
 * OptimizedImage Component
 * 
 * Automatically optimizes Cloudinary images with:
 * - Modern formats (WebP/AVIF)
 * - Responsive srcset
 * - Quality optimization
 * - Lazy loading
 * - Optional fade-in effect
 */
const OptimizedImage = ({
  src,
  alt,
  width = 800,
  quality = 'auto',
  crop = 'limit',
  gravity,
  sizes = '100vw',
  loading = 'lazy',
  fetchpriority,
  fadeIn = false,
  fadeInBg = 'bg-black',
  fadeDuration = 500,
  className = '',
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Check if this is a Cloudinary URL
  const isCloudinary = isCloudinaryUrl(src);

  // Get optimized src and srcset for Cloudinary images
  const { src: optimizedSrc, srcset } = isCloudinary 
    ? getResponsiveImageProps(src, width, { quality, crop, gravity })
    : { src, srcset: '' };

  // If fade-in is enabled, wrap in a container with background
  if (fadeIn) {
    return (
      <div className={`relative overflow-hidden ${fadeInBg} ${className}`}>
        <img
          src={optimizedSrc}
          srcSet={isCloudinary ? srcset : undefined}
          sizes={isCloudinary ? sizes : undefined}
          alt={alt}
          loading={loading}
          fetchPriority={fetchpriority}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDuration: `${fadeDuration}ms` }}
          {...props}
        />
      </div>
    );
  }

  // Standard rendering without fade-in
  return (
    <img
      src={optimizedSrc}
      srcSet={isCloudinary ? srcset : undefined}
      sizes={isCloudinary ? sizes : undefined}
      alt={alt}
      className={className}
      loading={loading}
      fetchPriority={fetchpriority}
      {...props} // This includes onLoad and other event handlers
    />
  );
};

export default OptimizedImage;

