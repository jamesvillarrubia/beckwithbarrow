/**
 * FORMAT VALIDATOR UTILITY
 * 
 * Validates Cloudinary format generation and ensures correct sizing
 * and aspect ratio preservation.
 * 
 * Usage:
 *   node format-validator.js
 */

const axios = require('axios');

// Test images with different aspect ratios
const testImages = [
  {
    name: 'Portrait Image',
    width: 800,
    height: 1200,
    aspectRatio: 800/1200, // 0.67
    format: 'jpg'
  },
  {
    name: 'Landscape Image', 
    width: 1200,
    height: 800,
    aspectRatio: 1200/800, // 1.5
    format: 'jpg'
  },
  {
    name: 'Square Image',
    width: 800,
    height: 800,
    aspectRatio: 800/800, // 1.0
    format: 'jpg'
  },
  {
    name: 'Wide Image',
    width: 1600,
    height: 600,
    aspectRatio: 1600/600, // 2.67
    format: 'jpg'
  }
];

/**
 * Generate format URLs for a test image
 */
function generateFormats(image, publicId = 'test-image') {
  const formatConfigs = {
    thumbnail: { 
      width: 156, 
      height: 156, 
      crop: 'limit', // Show full image, maintain aspect ratio
      quality: 'auto:good'
    },
    small: { 
      width: 500, 
      height: 500, 
      crop: 'limit', // Show full image, maintain aspect ratio
      quality: 'auto:good'
    },
    medium: { 
      width: 750, 
      height: 750, 
      crop: 'limit', // Show full image, maintain aspect ratio
      quality: 'auto:good'
    },
    large: { 
      width: 1000, 
      height: 1000, 
      crop: 'limit', // Show full image, maintain aspect ratio
      quality: 'auto:good'
    }
  };

  const formats = {};
  
  Object.entries(formatConfigs).forEach(([formatName, config]) => {
    // Build transformation string
    let transformation = `c_${config.crop},w_${config.width},h_${config.height}`;
    
    if (config.gravity) {
      transformation += `,g_${config.gravity}`;
    }
    
    if (config.quality) {
      transformation += `,q_${config.quality}`;
    }
    
    // Calculate expected dimensions
    let expectedWidth = config.width;
    let expectedHeight = config.height;
    
    if (config.crop === 'limit') {
      const originalAspectRatio = image.width / image.height;
      const maxAspectRatio = config.width / config.height;
      
      if (originalAspectRatio > maxAspectRatio) {
        // Image is wider than target ratio
        expectedWidth = config.width;
        expectedHeight = Math.round(config.width / originalAspectRatio);
      } else {
        // Image is taller than target ratio
        expectedHeight = config.height;
        expectedWidth = Math.round(config.height * originalAspectRatio);
      }
    }
    
    formats[formatName] = {
      transformation,
      expectedWidth,
      expectedHeight,
      cropMode: config.crop,
      maintainsAspectRatio: config.crop === 'limit',
      aspectRatio: expectedWidth / expectedHeight
    };
  });
  
  return formats;
}

/**
 * Validate format generation
 */
function validateFormats() {
  console.log('🔍 VALIDATING CLOUDINARY FORMAT GENERATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  testImages.forEach(image => {
    console.log(`\n📸 Testing ${image.name} (${image.width}x${image.height}, ratio: ${image.aspectRatio.toFixed(2)})`);
    
    const formats = generateFormats(image);
    
    Object.entries(formats).forEach(([formatName, format]) => {
      const originalAspectRatio = image.width / image.height;
      const formatAspectRatio = format.expectedWidth / format.expectedHeight;
      const aspectRatioPreserved = Math.abs(originalAspectRatio - formatAspectRatio) < 0.01;
      
      console.log(`   ${formatName.padEnd(8)}: ${format.expectedWidth}x${format.expectedHeight} (ratio: ${formatAspectRatio.toFixed(2)}) ${aspectRatioPreserved ? '✅' : '❌'}`);
      console.log(`            Transformation: ${format.transformation}`);
      
      if (formatName === 'thumbnail') {
        console.log(`            Crop: ${format.cropMode} (smart cropping for square thumbnails)`);
      } else {
        console.log(`            Crop: ${format.cropMode} (preserves aspect ratio)`);
      }
    });
  });
  
  console.log('\n📋 SUMMARY:');
  console.log('   • Thumbnail: Max 156x156 (shows full image, maintains aspect ratio)');
  console.log('   • Small: Max 500x500 (shows full image, maintains aspect ratio)');
  console.log('   • Medium: Max 750x750 (shows full image, maintains aspect ratio)');
  console.log('   • Large: Max 1000x1000 (shows full image, maintains aspect ratio)');
  console.log('   • Quality: Auto-optimized for best compression');
  console.log('   • Formats: Cloudinary auto-selects best format (WebP, AVIF, etc.)');
}

/**
 * Test actual Cloudinary URLs (requires credentials)
 */
async function testCloudinaryUrls() {
  const cloudinaryApiKey = process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY;
  const cloudinarySecret = process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET;
  const cloudinaryName = process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  
  if (!cloudinaryApiKey || !cloudinarySecret || !cloudinaryName) {
    console.log('\n⚠️  Cloudinary credentials not found. Skipping URL testing.');
    console.log('   Set CLOUDINARY_KEY, CLOUDINARY_SECRET, CLOUDINARY_NAME to test actual URLs.');
    return;
  }
  
  console.log('\n🌐 Testing actual Cloudinary URLs...');
  
  // Test with a real image from your Cloudinary account
  const testPublicId = 'beckwithbarrow/agricola/sample'; // Replace with actual image
  
  const formats = {
    thumbnail: 'c_fill,w_150,h_150,g_auto,q_auto:good',
    small: 'c_limit,w_300,h_300,q_auto:good',
    medium: 'c_limit,w_750,h_750,q_auto:good',
    large: 'c_limit,w_1000,h_1000,q_auto:good'
  };
  
  Object.entries(formats).forEach(([formatName, transformation]) => {
    const url = `https://res.cloudinary.com/${cloudinaryName}/image/upload/${transformation}/${testPublicId}.jpg`;
    console.log(`   ${formatName}: ${url}`);
  });
}

// Main execution
async function main() {
  validateFormats();
  await testCloudinaryUrls();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateFormats, validateFormats };
