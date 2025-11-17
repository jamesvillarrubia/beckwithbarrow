/**
 * Cloudinary Image Optimization Utilities
 * 
 * This module provides utilities for optimizing Cloudinary image URLs with:
 * - Automatic format selection (WebP, AVIF)
 * - Quality optimization
 * - Responsive sizing
 * - DPR (Device Pixel Ratio) handling
 * - Progressive loading
 * 
 * Cloudinary URL Structure:
 * https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{version}/{public_id}.{format}
 * 
 * Key Transformations:
 * - f_auto: Automatic format selection (WebP/AVIF for supported browsers)
 * - q_auto: Automatic quality optimization
 * - w_auto: Automatic width based on container
 * - dpr_auto: Automatic DPR handling for retina displays
 * - c_limit: Limit sizing (prevents upscaling)
 * - c_scale: Scale to fit dimensions
 * 
 * References:
 * - https://cloudinary.com/documentation/image_transformations
 * - https://cloudinary.com/documentation/responsive_images
 */

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  crop?: 'limit' | 'scale' | 'fill' | 'fit' | 'pad' | 'crop' | 'thumb';
  dpr?: 'auto' | number;
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
  fetchFormat?: boolean; // Use fetch_format instead of f_auto (for Strapi uploads)
}

/**
 * Checks if a URL is a Cloudinary URL
 */
export const isCloudinaryUrl = (url: string): boolean => {
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
};

/**
 * Extracts the cloud name from a Cloudinary URL
 */
const extractCloudName = (url: string): string | null => {
  const match = url.match(/res\.cloudinary\.com\/([^/]+)/);
  return match ? match[1] : null;
};

/**
 * Parses a Cloudinary URL into its components
 */
const parseCloudinaryUrl = (url: string): {
  cloudName: string;
  publicId: string;
  version?: string;
  format?: string;
  existingTransforms?: string;
} | null => {
  if (!isCloudinaryUrl(url)) return null;

  const cloudName = extractCloudName(url);
  if (!cloudName) return null;

  // Match Cloudinary URL pattern:
  // https://res.cloudinary.com/{cloud_name}/image/upload/{transforms}/{version}/{public_id}.{format}
  // or
  // https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
  const urlPattern = /res\.cloudinary\.com\/[^/]+\/image\/upload\/(.+)$/;
  const match = url.match(urlPattern);
  
  if (!match) return null;

  const pathParts = match[1].split('/');
  
  // Last part contains public_id and format
  const lastPart = pathParts[pathParts.length - 1];
  const [publicIdWithFormat] = lastPart.split('.');
  const format = lastPart.split('.').pop();
  
  // Check if there's a version (starts with v followed by numbers)
  let version: string | undefined;
  let existingTransforms: string | undefined;
  let publicIdParts: string[] = [];

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (part.match(/^v\d+$/)) {
      version = part;
      // Everything before version is transforms
      if (i > 0) {
        existingTransforms = pathParts.slice(0, i).join('/');
      }
      // Everything after version (except last part) is part of public_id path
      publicIdParts = pathParts.slice(i + 1, -1);
      break;
    }
  }

  // If no version found, everything except last part might be transforms or public_id path
  if (!version) {
    // Check if first parts look like transforms (contain = or _)
    const firstPart = pathParts[0];
    if (firstPart && (firstPart.includes('_') || firstPart.includes(','))) {
      // Likely transforms
      existingTransforms = pathParts.slice(0, -1).join('/');
    } else {
      // Likely nested public_id path
      publicIdParts = pathParts.slice(0, -1);
    }
  }

  // Reconstruct public_id with path
  const publicIdPath = publicIdParts.length > 0 
    ? publicIdParts.join('/') + '/' + publicIdWithFormat
    : publicIdWithFormat;

  return {
    cloudName,
    publicId: publicIdPath,
    version,
    format,
    existingTransforms
  };
};

/**
 * Builds transformation string from options
 */
const buildTransformations = (options: CloudinaryTransformOptions): string => {
  const transforms: string[] = [];

  // Add crop mode (default to limit to prevent upscaling)
  const crop = options.crop || 'limit';
  transforms.push(`c_${crop}`);

  // Add dimensions
  if (options.width) {
    transforms.push(`w_${options.width}`);
  }
  if (options.height) {
    transforms.push(`h_${options.height}`);
  }

  // Add DPR (default to auto for retina support)
  const dpr = options.dpr !== undefined ? options.dpr : 'auto';
  transforms.push(`dpr_${dpr}`);

  // Add quality (default to auto for intelligent optimization)
  const quality = options.quality || 'auto';
  transforms.push(`q_${quality}`);

  // Add format (default to auto for WebP/AVIF support)
  const format = options.format || 'auto';
  transforms.push(`f_${format}`);

  // Add gravity if specified
  if (options.gravity) {
    transforms.push(`g_${options.gravity}`);
  }

  // Add progressive loading for JPEG
  transforms.push('fl_progressive');

  return transforms.join(',');
};

/**
 * Transforms a Cloudinary URL with optimization parameters
 * 
 * @param url - Original Cloudinary URL
 * @param options - Transformation options
 * @returns Optimized Cloudinary URL
 * 
 * @example
 * ```typescript
 * const optimizedUrl = transformCloudinaryUrl(
 *   'https://res.cloudinary.com/demo/image/upload/sample.jpg',
 *   { width: 800, quality: 'auto', format: 'auto' }
 * );
 * // Returns: https://res.cloudinary.com/demo/image/upload/c_limit,w_800,dpr_auto,q_auto,f_auto,fl_progressive/sample.jpg
 * ```
 */
export const transformCloudinaryUrl = (
  url: string, 
  options: CloudinaryTransformOptions = {}
): string => {
  if (!url || !isCloudinaryUrl(url)) {
    return url; // Return original URL if not Cloudinary
  }

  const parsed = parseCloudinaryUrl(url);
  if (!parsed) {
    return url; // Return original if parsing fails
  }

  const { cloudName, publicId, version, format } = parsed;
  const transformations = buildTransformations(options);

  // Build new URL with transformations
  // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{transforms}/{version}/{public_id}.{format}
  let newUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}`;
  
  if (version) {
    newUrl += `/${version}`;
  }
  
  newUrl += `/${publicId}`;
  
  // Add original format if it exists (f_auto will override for supported browsers)
  if (format) {
    newUrl += `.${format}`;
  }

  return newUrl;
};

/**
 * Generates responsive srcset for Cloudinary images
 * Creates multiple image sizes for responsive loading
 * 
 * @param url - Original Cloudinary URL
 * @param sizes - Array of widths to generate
 * @param options - Additional transformation options
 * @returns srcset string for responsive images
 * 
 * @example
 * ```typescript
 * const srcset = generateResponsiveSrcset(
 *   'https://res.cloudinary.com/demo/image/upload/sample.jpg',
 *   [400, 800, 1200, 1600],
 *   { quality: 'auto', format: 'auto' }
 * );
 * // Returns: "https://...w_400.../sample.jpg 400w, https://...w_800.../sample.jpg 800w, ..."
 * ```
 */
export const generateResponsiveSrcset = (
  url: string,
  sizes: number[] = [400, 800, 1200, 1600, 2400],
  options: Omit<CloudinaryTransformOptions, 'width'> = {}
): string => {
  if (!isCloudinaryUrl(url)) {
    return ''; // Only works with Cloudinary URLs
  }

  return sizes
    .map(width => {
      const transformedUrl = transformCloudinaryUrl(url, { ...options, width });
      return `${transformedUrl} ${width}w`;
    })
    .join(', ');
};

/**
 * Gets optimized image URL and srcset for responsive images
 * This is the primary function to use in React components
 * 
 * @param url - Original image URL
 * @param width - Target width in pixels (for default src)
 * @param options - Additional transformation options
 * @returns Object with src and srcset
 * 
 * @example
 * ```tsx
 * const { src, srcset } = getResponsiveImageProps(
 *   imageUrl,
 *   800,
 *   { quality: 'auto:good' }
 * );
 * 
 * <img 
 *   src={src} 
 *   srcSet={srcset}
 *   sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 800px"
 *   loading="lazy"
 *   alt="..."
 * />
 * ```
 */
export const getResponsiveImageProps = (
  url: string,
  width: number,
  options: Omit<CloudinaryTransformOptions, 'width'> = {}
): { src: string; srcset: string } => {
  if (!isCloudinaryUrl(url)) {
    // Return original URL if not Cloudinary
    return { src: url, srcset: '' };
  }

  // Generate sizes array based on target width
  const sizes = [
    Math.round(width * 0.5),  // 50% for mobile
    Math.round(width * 0.75), // 75% for small tablet
    width,                     // 100% target width
    Math.round(width * 1.5),  // 150% for retina
    Math.round(width * 2),    // 200% for high-DPI
  ].filter((size, index, arr) => arr.indexOf(size) === index); // Remove duplicates

  const src = transformCloudinaryUrl(url, { ...options, width });
  const srcset = generateResponsiveSrcset(url, sizes, options);

  return { src, srcset };
};

/**
 * Common presets for different use cases
 * Optimized for performance and quality balance
 */
export const CloudinaryPresets = {
  // Thumbnail images (small, highly optimized)
  thumbnail: {
    width: 200,
    quality: 'auto:eco' as const,
    format: 'auto' as const,
    crop: 'fill' as const,
  },
  
  // Card/Grid images (medium size, balanced quality)
  card: {
    width: 600,
    quality: 'auto:good' as const, // Upgraded from 'auto' for better visual quality
    format: 'auto' as const,
    crop: 'limit' as const,
  },
  
  // Hero images (large, high quality)
  hero: {
    width: 1200, // Reduced from 1920 - adequate for 50vw at 2x DPR
    quality: 'auto:good' as const,
    format: 'auto' as const,
    crop: 'limit' as const,
  },
  
  // Lightbox/Full size (very large, best quality)
  lightbox: {
    width: 1600, // Reduced from 2400 - still high quality, better performance
    quality: 'auto:best' as const,
    format: 'auto' as const,
    crop: 'limit' as const,
  },
} as const;

