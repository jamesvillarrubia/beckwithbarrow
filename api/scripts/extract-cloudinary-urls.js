#!/usr/bin/env node

/**
 * Extract Cloudinary URLs Script
 * 
 * This script connects to your Cloudinary account and extracts all public URLs
 * for your uploaded images. It uses the Cloudinary Admin API to retrieve
 * all resources and generates their public URLs.
 * 
 * Features:
 * - Connects to Cloudinary using your credentials
 * - Retrieves all images from your account
 * - Generates public URLs for each image
 * - Supports different URL formats (original, optimized, etc.)
 * - Exports URLs to JSON and CSV formats
 * - Handles pagination for large accounts
 * 
 * Usage: node extract-cloudinary-urls.js [options]
 * Example: node extract-cloudinary-urls.js --format json --output urls.json
 */

const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Configuration from environment
const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME || 'dqeqavdd8';
const CLOUDINARY_KEY = process.env.CLOUDINARY_KEY || '865956219142244';
const CLOUDINARY_SECRET = process.env.CLOUDINARY_SECRET || '0ITZlUhPZFWIVZ7oUzuPM4ed5-k';

// Command line options
const OUTPUT_FORMAT = process.argv.includes('--format') ? 
  process.argv[process.argv.indexOf('--format') + 1] : 'json';
const OUTPUT_FILE = process.argv.includes('--output') ? 
  process.argv[process.argv.indexOf('--output') + 1] : 'cloudinary-urls.json';
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const INCLUDE_TRANSFORMATIONS = process.argv.includes('--transformations');

// Statistics tracking
let stats = {
  totalImages: 0,
  urlsGenerated: 0,
  errors: 0,
  startTime: Date.now()
};

/**
 * Configure Cloudinary SDK
 */
function configureCloudinary() {
  cloudinary.config({
    cloud_name: CLOUDINARY_NAME,
    api_key: CLOUDINARY_KEY,
    api_secret: CLOUDINARY_SECRET
  });
}

/**
 * Generate public URL for a Cloudinary resource
 */
function generatePublicUrl(publicId, format = 'auto', transformations = '') {
  const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_NAME}/image/upload`;
  
  if (transformations) {
    return `${baseUrl}/${transformations}/${publicId}.${format}`;
  } else {
    return `${baseUrl}/${publicId}.${format}`;
  }
}

/**
 * Generate multiple URL variants for a resource
 */
function generateUrlVariants(publicId, originalFormat) {
  const variants = {
    original: generatePublicUrl(publicId, originalFormat),
    auto: generatePublicUrl(publicId, 'auto'),
    webp: generatePublicUrl(publicId, 'webp'),
    optimized: generatePublicUrl(publicId, 'auto', 'f_auto,q_auto'),
    thumbnail: generatePublicUrl(publicId, 'auto', 'w_300,h_300,c_fill'),
    medium: generatePublicUrl(publicId, 'auto', 'w_800,h_600,c_fill'),
    large: generatePublicUrl(publicId, 'auto', 'w_1200,h_900,c_fill')
  };

  return variants;
}

/**
 * Retrieve all resources from Cloudinary
 */
async function getAllResources() {
  const allResources = [];
  let nextCursor = null;
  let page = 1;

  console.log('📡 Fetching resources from Cloudinary...');

  try {
    do {
      if (VERBOSE) {
        console.log(`📄 Fetching page ${page}...`);
      }

      const params = {
        max_results: 500, // Maximum allowed by Cloudinary
        type: 'upload'
      };

      if (nextCursor) {
        params.next_cursor = nextCursor;
      }

      const response = await cloudinary.api.resources(params);
      
      if (response.resources) {
        allResources.push(...response.resources);
        stats.totalImages += response.resources.length;
        
        if (VERBOSE) {
          console.log(`   Found ${response.resources.length} resources on page ${page}`);
        }
      }

      nextCursor = response.next_cursor;
      page++;

    } while (nextCursor);

    console.log(`✅ Retrieved ${allResources.length} total resources`);
    return allResources;

  } catch (error) {
    console.error('❌ Error fetching resources:', error.message);
    stats.errors++;
    throw error;
  }
}

/**
 * Process resources and generate URLs
 */
function processResources(resources) {
  console.log('🔗 Generating URLs...');
  
  const processedResources = resources.map((resource, index) => {
    if (VERBOSE && (index + 1) % 100 === 0) {
      console.log(`   Processed ${index + 1}/${resources.length} resources...`);
    }

    const publicId = resource.public_id;
    const format = resource.format;
    const width = resource.width;
    const height = resource.height;
    const bytes = resource.bytes;
    const createdAt = resource.created_at;

    const urls = INCLUDE_TRANSFORMATIONS ? 
      generateUrlVariants(publicId, format) : 
      { original: generatePublicUrl(publicId, format) };

    stats.urlsGenerated++;

    return {
      public_id: publicId,
      format: format,
      width: width,
      height: height,
      bytes: bytes,
      created_at: createdAt,
      urls: urls
    };
  });

  return processedResources;
}

/**
 * Save results to file
 */
function saveResults(data) {
  try {
    if (OUTPUT_FORMAT === 'json') {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
      console.log(`💾 Saved ${data.length} URLs to ${OUTPUT_FILE}`);
    } else if (OUTPUT_FORMAT === 'csv') {
      const csvContent = generateCSV(data);
      fs.writeFileSync(OUTPUT_FILE, csvContent);
      console.log(`💾 Saved ${data.length} URLs to ${OUTPUT_FILE}`);
    } else if (OUTPUT_FORMAT === 'txt') {
      const txtContent = generateTXT(data);
      fs.writeFileSync(OUTPUT_FILE, txtContent);
      console.log(`💾 Saved ${data.length} URLs to ${OUTPUT_FILE}`);
    } else {
      throw new Error(`Unsupported format: ${OUTPUT_FORMAT}`);
    }
  } catch (error) {
    console.error('❌ Error saving results:', error.message);
    stats.errors++;
  }
}

/**
 * Generate CSV content
 */
function generateCSV(data) {
  const headers = ['public_id', 'format', 'width', 'height', 'bytes', 'created_at', 'original_url'];
  const rows = data.map(item => [
    item.public_id,
    item.format,
    item.width,
    item.height,
    item.bytes,
    item.created_at,
    item.urls.original
  ]);

  return [headers, ...rows].map(row => 
    row.map(field => `"${field}"`).join(',')
  ).join('\n');
}

/**
 * Generate TXT content (just URLs)
 */
function generateTXT(data) {
  return data.map(item => item.urls.original).join('\n');
}

/**
 * Main execution function
 */
async function main() {
  console.log('☁️  Cloudinary URL Extractor');
  console.log('==========================');
  console.log(`📁 Cloud: ${CLOUDINARY_NAME}`);
  console.log(`📊 Format: ${OUTPUT_FORMAT}`);
  console.log(`💾 Output: ${OUTPUT_FILE}`);
  console.log(`🔧 Transformations: ${INCLUDE_TRANSFORMATIONS ? 'YES' : 'NO'}`);
  console.log(`📊 Verbose: ${VERBOSE ? 'ON' : 'OFF'}`);
  console.log('');

  try {
    // Configure Cloudinary
    configureCloudinary();
    
    // Fetch all resources
    const resources = await getAllResources();
    
    if (resources.length === 0) {
      console.log('ℹ️  No resources found in your Cloudinary account.');
      return;
    }

    // Process resources and generate URLs
    const processedResources = processResources(resources);

    // Save results
    saveResults(processedResources);

    // Print summary
    const endTime = Date.now();
    const duration = ((endTime - stats.startTime) / 1000).toFixed(2);

    console.log('\n📊 Extraction Complete!');
    console.log('======================');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`🖼️  Total images: ${stats.totalImages}`);
    console.log(`🔗 URLs generated: ${stats.urlsGenerated}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(`💾 Output file: ${OUTPUT_FILE}`);

    if (INCLUDE_TRANSFORMATIONS) {
      console.log('\n🔗 URL Variants included:');
      console.log('   - original: Original format and size');
      console.log('   - auto: Auto format optimization');
      console.log('   - webp: WebP format');
      console.log('   - optimized: Auto format + quality optimization');
      console.log('   - thumbnail: 300x300 thumbnail');
      console.log('   - medium: 800x600 medium size');
      console.log('   - large: 1200x900 large size');
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Cloudinary URL Extractor

Usage: node extract-cloudinary-urls.js [options]

Options:
  --format <format>     Output format: json, csv, txt (default: json)
  --output <file>       Output file path (default: cloudinary-urls.json)
  --transformations     Include URL variants with transformations
  --verbose, -v         Show detailed progress information
  --help, -h            Show this help message

Examples:
  node extract-cloudinary-urls.js
  node extract-cloudinary-urls.js --format csv --output urls.csv
  node extract-cloudinary-urls.js --transformations --verbose
  node extract-cloudinary-urls.js --format txt --output urls.txt

Environment Variables Required:
  CLOUDINARY_NAME       Your Cloudinary cloud name
  CLOUDINARY_KEY        Your Cloudinary API key
  CLOUDINARY_SECRET     Your Cloudinary API secret
  `);
  process.exit(0);
}

// Run the script
main();
