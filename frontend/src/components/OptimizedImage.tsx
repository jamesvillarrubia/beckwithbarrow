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
 * />
 * ```
 */

import { ImgHTMLAttributes } from 'react';
import { 
  getResponsiveImageProps, 
  CloudinaryTransformOptions,
  isCloudinaryUrl 
} from '../utils/cloudinary';

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
}

/**
 * OptimizedImage Component
 * 
 * Automatically optimizes Cloudinary images with:
 * - Modern formats (WebP/AVIF)
 * - Responsive srcset
 * - Quality optimization
 * - Lazy loading
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
  className = '',
  ...props
}: OptimizedImageProps) => {
  // Check if this is a Cloudinary URL
  const isCloudinary = isCloudinaryUrl(src);

  if (!isCloudinary) {
    // For non-Cloudinary images, render standard img tag
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        fetchPriority={fetchpriority}
        {...props}
      />
    );
  }

  // Get optimized src and srcset for Cloudinary images
  const { src: optimizedSrc, srcset } = getResponsiveImageProps(
    src,
    width,
    { quality, crop, gravity }
  );

  return (
    <img
      src={optimizedSrc}
      srcSet={srcset}
      sizes={sizes}
      alt={alt}
      className={className}
      loading={loading}
      fetchPriority={fetchpriority}
      {...props}
    />
  );
};

export default OptimizedImage;

