/**
 * UTILITIES FOR STEP-BY-STEP MIGRATION
 * 
 * Shared utilities and helper functions used across migration steps.
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

/**
 * Load environment variables from multiple .env files
 */
async function loadEnvironment() {
  // Load .env files in order of priority
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  dotenv.config({ path: path.join(__dirname, '../../strapi-cloud.env') });
  dotenv.config({ path: path.join(__dirname, '../../cloudinary.env') });
}

/**
 * Create API clients for Cloudinary and Strapi
 */
function createApiClients() {
  // Cloudinary API client
  const cloudinaryApi = axios.create({
    baseURL: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_NAME}`,
    auth: {
      username: process.env.CLOUDINARY_KEY,
      password: process.env.CLOUDINARY_SECRET
    }
  });

  // Strapi API client (using cloud API with custom endpoint)
  const strapiApi = axios.create({
    baseURL: process.env.STRAPI_CLOUD_BASE_URL,
    headers: {
      'Authorization': `Bearer ${process.env.STRAPI_CLOUD_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  return { cloudinaryApi, strapiApi };
}

/**
 * Log step header with consistent formatting
 */
function logStepHeader(stepNumber, title) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`STEP ${stepNumber}: ${title}`);
  console.log('='.repeat(50));
}

/**
 * Log result with consistent formatting
 */
function logResult(success, message, error = null) {
  if (success) {
    console.log(`✅ ${message}`);
  } else {
    console.log(`❌ ${message}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }
}

/**
 * Pause for user confirmation
 */
function pauseForConfirmation(message) {
  return new Promise((resolve) => {
    console.log(`\n⏸️  ${message}`);
    console.log('   Press Enter to continue or Ctrl+C to exit...');
    
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

/**
 * Generate Cloudinary format URLs for different sizes
 */
function generateCloudinaryFormats(image) {
  const formats = {};
  
  // Get Cloudinary name from environment or use default
  const cloudName = process.env.CLOUDINARY_NAME || 'dqeqavdd8';
  
  // Extract version from the original URL if available
  const versionMatch = image.url.match(/\/v(\d+)\//);
  const version = versionMatch ? versionMatch[1] : '';
  const versionParam = version ? `v${version}/` : '';
  
  // Generate different format sizes with proportional resizing
  const sizes = [
    { name: 'thumbnail', maxDimension: 245 },
    { name: 'small', maxDimension: 500 },
    { name: 'medium', maxDimension: 750 },
    { name: 'large', maxDimension: 1000 }
  ];
  
  sizes.forEach(size => {
    // Calculate proportional dimensions
    const aspectRatio = image.width / image.height;
    let targetWidth, targetHeight;
    
    // Calculate dimensions that fit within the maxDimension while maintaining aspect ratio
    if (image.width > image.height) {
      // Landscape: constrain by width
      targetWidth = Math.min(size.maxDimension, image.width);
      targetHeight = Math.round(targetWidth / aspectRatio);
    } else {
      // Portrait or square: constrain by height
      targetHeight = Math.min(size.maxDimension, image.height);
      targetWidth = Math.round(targetHeight * aspectRatio);
    }
    
    // Ensure we don't exceed the original dimensions
    targetWidth = Math.min(targetWidth, image.width);
    targetHeight = Math.min(targetHeight, image.height);
    
    // Build Cloudinary URL with proportional resizing
    const url = `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_${targetWidth},h_${targetHeight}/${versionParam}${image.publicId}.${image.format}`;
    
    // Calculate size in bytes for this format (proportional to area reduction)
    const originalArea = image.width * image.height;
    const targetArea = targetWidth * targetHeight;
    const formatSizeInBytes = Math.round(image.bytes * (targetArea / originalArea));
    const formatSizeInKB = Math.round(formatSizeInBytes / 1024 * 100) / 100; // Convert to KB with 2 decimal places
    
    // Fix MIME type and extension for JPEG files
    const mimeType = image.format === 'jpg' ? 'image/jpeg' : `image/${image.format}`;
    const extension = image.format === 'jpg' ? '.jpeg' : `.${image.format}`;
    
    formats[size.name] = {
      ext: extension,
      url: url,
      hash: `${image.publicId}_${size.name}`,
      mime: mimeType,
      name: `${image.displayName || image.publicId}_${size.name}`,
      path: null,
      size: formatSizeInKB,
      width: targetWidth,
      height: targetHeight,
      sizeInBytes: formatSizeInBytes
    };
  });
  
  return formats;
}

/**
 * Flatten Strapi folder structure for easier processing
 */
function flattenFolderStructure(folders, parent = null, parentId = null) {
  const result = [];
  
  folders.forEach(folder => {
    const flattened = {
      id: folder.id,
      name: folder.name,
      path: folder.path,
      parent: parent,
      parentId: parentId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt
    };
    
    result.push(flattened);
    
    if (folder.children && folder.children.length > 0) {
      const children = flattenFolderStructure(folder.children, folder.name, folder.id);
      result.push(...children);
    }
  });
  
  return result;
}

/**
 * Process images in parallel batches
 */
async function processInBatches(items, batchSize, processor) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  const results = [];
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\n🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`);
    
    const batchPromises = batch.map(processor);
    const batchResults = await Promise.allSettled(batchPromises);
    
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Save data to JSON file
 */
function saveToFile(filename, data) {
  const fs = require('fs');
  const filepath = path.join(__dirname, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`💾 Data saved to: ${filename}`);
}

/**
 * Load data from JSON file
 */
function loadFromFile(filename) {
  const fs = require('fs');
  const filepath = path.join(__dirname, filename);
  
  if (fs.existsSync(filepath)) {
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  }
  
  return null;
}

module.exports = {
  loadEnvironment,
  createApiClients,
  logStepHeader,
  logResult,
  pauseForConfirmation,
  generateCloudinaryFormats,
  flattenFolderStructure,
  processInBatches,
  saveToFile,
  loadFromFile
};
