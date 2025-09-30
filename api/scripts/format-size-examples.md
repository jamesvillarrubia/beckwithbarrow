# Cloudinary Format Size Examples

## Aspect Ratio Preservation Strategy

### 1. **Thumbnail (Max 156x156) - Full Image Preserved**
- **Crop Mode**: `limit`
- **Purpose**: Small thumbnails that show the full image
- **Behavior**: Scales down to fit within 156x156, maintains aspect ratio
- **Example**: `c_limit,w_156,h_156,q_auto:good`

### 2. **Small (Max 500x500) - Full Image Preserved**
- **Crop Mode**: `limit`
- **Purpose**: Small previews that maintain original proportions
- **Behavior**: Scales down to fit within 500x500, maintains aspect ratio
- **Example**: `c_limit,w_500,h_500,q_auto:good`

### 3. **Medium (Max 750x750) - Full Image Preserved**
- **Crop Mode**: `limit`
- **Purpose**: Medium-sized images for content
- **Behavior**: Scales down to fit within 750x750, maintains aspect ratio
- **Example**: `c_limit,w_750,h_750,q_auto:good`

### 4. **Large (Max 1000x1000) - Full Image Preserved**
- **Crop Mode**: `limit`
- **Purpose**: Large images for detailed viewing
- **Behavior**: Scales down to fit within 1000x1000, maintains aspect ratio
- **Example**: `c_limit,w_1000,h_1000,q_auto:good`

## Real-World Examples

### Portrait Image (800x1200)
- **Thumbnail**: 104x156 (scaled to fit 156x156 limit)
- **Small**: 333x500 (scaled to fit 500x500 limit)
- **Medium**: 500x750 (scaled to fit 750x750 limit)
- **Large**: 667x1000 (scaled to fit 1000x1000 limit)

### Landscape Image (1200x800)
- **Thumbnail**: 156x104 (scaled to fit 156x156 limit)
- **Small**: 500x333 (scaled to fit 500x500 limit)
- **Medium**: 750x500 (scaled to fit 750x750 limit)
- **Large**: 1000x667 (scaled to fit 1000x1000 limit)

### Square Image (800x800)
- **Thumbnail**: 156x156 (scaled to fit 156x156 limit)
- **Small**: 500x500 (scaled to fit 500x500 limit)
- **Medium**: 750x750 (scaled to fit 750x750 limit)
- **Large**: 800x800 (original size, under 1000x1000 limit)

## Quality Settings

- **`q_auto:good`**: Balances quality and file size
- **Smart optimization**: Cloudinary automatically chooses best format (WebP, AVIF, etc.)
- **Progressive JPEG**: For better loading experience

## Benefits of This Approach

1. **Full image visibility**: All formats show the complete image, no cropping
2. **Preserved aspect ratios**: All formats maintain original proportions
3. **No distortion**: Images never get stretched or squashed
4. **Optimal file sizes**: Quality settings ensure good compression
5. **Responsive ready**: Different sizes for different screen densities
6. **Consistent behavior**: All formats use the same `c_limit` approach
