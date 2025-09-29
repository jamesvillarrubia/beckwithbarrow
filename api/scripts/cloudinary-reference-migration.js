#!/usr/bin/env node

/**
 * Cloudinary Reference Migration Script
 * 
 * CORRECT APPROACH: Creates Strapi media entries that REFERENCE Cloudinary URLs
 * without downloading or re-uploading images. Images stay in Cloudinary as CDN.
 * 
 * Features:
 * - Creates Strapi media entries via direct database insertion
 * - References Cloudinary URLs without file transfer
 * - Maintains folder organization in Strapi
 * - Handles multiple image formats (thumbnails, small, etc.)
 * - Idempotent - can be run multiple times safely
 * - Test mode for single image/folder validation
 * - Comprehensive validation of Cloudinary and Strapi state
 * 
 * Usage:
 *   node cloudinary-reference-migration.js test haythorne    # Test with 1 folder
 *   node cloudinary-reference-migration.js validate         # Check current state
 *   node cloudinary-reference-migration.js migrate all      # Migrate all folders
 *   node cloudinary-reference-migration.js migrate agricola # Migrate specific folder
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../strapi-cloud.env') });

const STRAPI_URL = process.env.STRAPI_CLOUD_BASE_URL || 'https://striking-ball-b079f8c4b0.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_CLOUD_API_TOKEN;

const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME;
const CLOUDINARY_KEY = process.env.CLOUDINARY_KEY;
const CLOUDINARY_SECRET = process.env.CLOUDINARY_SECRET;

if (!STRAPI_API_TOKEN || !CLOUDINARY_NAME || !CLOUDINARY_KEY || !CLOUDINARY_SECRET) {
  console.error('❌ Missing required environment variables');
  console.error('Required: STRAPI_CLOUD_API_TOKEN, CLOUDINARY_NAME, CLOUDINARY_KEY, CLOUDINARY_SECRET');
  process.exit(1);
}

// Configure axios for Strapi API
const strapiApi = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Configure axios for Cloudinary API
const cloudinaryApi = axios.create({
  baseURL: `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}`,
  auth: {
    username: CLOUDINARY_KEY,
    password: CLOUDINARY_SECRET
  }
});

// Folder mapping from MIGRATION-PLAN.md
const FOLDER_MAPPING = {
  'agricola': { id: 160, name: 'Agricola Modern House' },
  'buhn': { id: 176, name: 'Buhn Residence' },
  'butler': { id: 171, name: 'Butler House' },
  'dineen': { id: 170, name: 'Dineen Family Home' },
  'gunther': { id: 164, name: 'Gunther Residence' },
  'haythorne': { id: 163, name: 'Haythorne House' },
  'hetherington': { id: 174, name: 'Hetherington Estate' },
  'holm': { id: 162, name: 'Holm Residence' },
  'jenks': { id: 161, name: 'Jenks Family Residence' },
  'krant': { id: 168, name: 'Krant House' },
  'onota': { id: 175, name: 'Onota Lake House' },
  'rowntree': { id: 167, name: 'Rowntree Residence' },
  'seidman': { id: 166, name: 'Seidman House' },
  'strauss_weinberg': { id: 165, name: 'Strauss Weinberg Project' },
  'turell': { id: 172, name: 'Turell Residence' },
  'waller': { id: 169, name: 'Waller House' },
  'logos': { id: 177, name: 'Branding' }
};

/**
 * Get Cloudinary images from a specific folder
 */
async function getCloudinaryImagesByFolder(folderPath) {
  try {
    console.log(`🔍 Fetching Cloudinary images from folder: ${folderPath}`);
    
    const response = await cloudinaryApi.get('/resources/image', {
      params: {
        type: 'upload',
        prefix: `beckwithbarrow/${folderPath}/`,
        max_results: 500
      }
    });

    const images = response.data.resources || [];
    console.log(`📁 Found ${images.length} images in ${folderPath}`);
    return images;
  } catch (error) {
    console.error('❌ Error fetching Cloudinary images:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Check if a Strapi media entry already exists for a Cloudinary URL
 */
async function checkExistingMediaEntry(cloudinaryUrl) {
  try {
    const response = await strapiApi.get('/upload/files', {
      params: {
        filters: {
          url: {
            $eq: cloudinaryUrl
          }
        }
      }
    });
    
    return response.data && response.data.length > 0 ? response.data[0] : null;
  } catch (error) {
    console.error('❌ Error checking existing media:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Create Strapi media entry that references Cloudinary URL
 */
async function createStrapiMediaReference(cloudinaryImage, folderId, folderName) {
  try {
    const fileName = cloudinaryImage.public_id.split('/').pop();
    const fileExtension = cloudinaryImage.format;
    const fullFileName = `${fileName}.${fileExtension}`;
    
    // Check if entry already exists (idempotent)
    const existing = await checkExistingMediaEntry(cloudinaryImage.secure_url);
    if (existing) {
      console.log(`   ⏩ Already exists: ${fullFileName} (ID: ${existing.id})`);
      return existing;
    }

    // Prepare formats object for different sizes
    const formats = {};
    
    // Add thumbnail format if it exists
    const thumbnailUrl = cloudinaryImage.secure_url.replace('/beckwithbarrow/', '/beckwithbarrow/thumbnails/thumbnail_');
    formats.thumbnail = {
      ext: `.${fileExtension}`,
      url: thumbnailUrl,
      hash: `thumbnail_${fileName}`,
      mime: `image/${fileExtension}`,
      name: `thumbnail_${fullFileName}`,
      path: null,
      size: Math.round(cloudinaryImage.bytes * 0.1 / 1024), // Estimate smaller size
      width: Math.round(cloudinaryImage.width * 0.3),
      height: Math.round(cloudinaryImage.height * 0.3)
    };

    // Add small format if it exists
    const smallUrl = cloudinaryImage.secure_url.replace('/beckwithbarrow/', '/beckwithbarrow/small/small_');
    formats.small = {
      ext: `.${fileExtension}`,
      url: smallUrl,
      hash: `small_${fileName}`,
      mime: `image/${fileExtension}`,
      name: `small_${fullFileName}`,
      path: null,
      size: Math.round(cloudinaryImage.bytes * 0.3 / 1024), // Estimate smaller size
      width: Math.round(cloudinaryImage.width * 0.6),
      height: Math.round(cloudinaryImage.height * 0.6)
    };

    // Create media entry data
    const mediaData = {
      name: fullFileName,
      alternativeText: `${folderName} - ${fileName}`,
      caption: '',
      width: cloudinaryImage.width,
      height: cloudinaryImage.height,
      formats: formats,
      hash: fileName,
      ext: `.${fileExtension}`,
      mime: `image/${fileExtension}`,
      size: Math.round(cloudinaryImage.bytes / 1024), // Convert to KB
      url: cloudinaryImage.secure_url,
      previewUrl: null,
      provider: 'cloudinary-reference', // Custom provider name
      provider_metadata: {
        public_id: cloudinaryImage.public_id,
        resource_type: cloudinaryImage.resource_type,
        created_at: cloudinaryImage.created_at,
        cloudinary_folder: cloudinaryImage.folder || `beckwithbarrow/${cloudinaryImage.public_id.split('/')[1]}`
      },
      folder: folderId,
      folderPath: `/${folderId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log(`   📤 Creating Strapi reference for: ${fullFileName}`);
    
    const response = await strapiApi.post('/upload/files', mediaData);

    if (response.data) {
      console.log(`   ✅ Created: ${fullFileName} (ID: ${response.data.id})`);
      return response.data;
    } else {
      console.error(`   ❌ Unexpected response format:`, response.data);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Failed to create reference:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Validate Cloudinary folder structure
 */
async function validateCloudinaryStructure(folderName) {
  try {
    const images = await getCloudinaryImagesByFolder(folderName);
    
    if (images.length === 0) {
      return { valid: false, message: `No images found in ${folderName}` };
    }

    // Check if images follow expected structure
    const hasMainImages = images.some(img => img.public_id.includes(`beckwithbarrow/${folderName}/`));
    if (!hasMainImages) {
      return { valid: false, message: `Images don't follow expected folder structure: beckwithbarrow/${folderName}/` };
    }

    return { 
      valid: true, 
      message: `${images.length} images found with correct structure`,
      count: images.length 
    };
  } catch (error) {
    return { valid: false, message: error.message };
  }
}

/**
 * Validate Strapi folder exists
 */
async function validateStrapiFolder(folderId) {
  try {
    const response = await strapiApi.get(`/upload/folders/${folderId}`);
    return { 
      valid: true, 
      message: `Folder exists: ${response.data.name}`,
      folder: response.data 
    };
  } catch (error) {
    return { 
      valid: false, 
      message: `Folder ${folderId} not found: ${error.response?.data?.error?.message || error.message}` 
    };
  }
}

/**
 * Migrate a single folder
 */
async function migrateFolder(cloudinaryFolderName, options = {}) {
  const { testMode = false, maxImages = null } = options;
  
  if (!FOLDER_MAPPING[cloudinaryFolderName]) {
    console.error(`❌ Unknown folder: ${cloudinaryFolderName}`);
    console.log('Available folders:', Object.keys(FOLDER_MAPPING).join(', '));
    return { successful: 0, failed: 0, skipped: 0, errors: [] };
  }

  const { id: folderId, name: folderName } = FOLDER_MAPPING[cloudinaryFolderName];
  
  console.log(`\n🚀 ${testMode ? 'TEST MODE: ' : ''}Migrating: ${cloudinaryFolderName} → ${folderName} (ID: ${folderId})`);
  console.log('━'.repeat(80));

  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Validate folder exists in Strapi
    const folderValidation = await validateStrapiFolder(folderId);
    if (!folderValidation.valid) {
      console.error(`❌ ${folderValidation.message}`);
      results.errors.push({ file: 'folder_validation', error: folderValidation.message });
      return results;
    }

    console.log(`✅ ${folderValidation.message}`);

    // Get images from Cloudinary
    const images = await getCloudinaryImagesByFolder(cloudinaryFolderName);
    
    if (images.length === 0) {
      console.log('📁 No images found in this folder');
      return results;
    }

    // Limit images for testing
    const imagesToProcess = maxImages ? images.slice(0, maxImages) : images;
    
    if (testMode && maxImages) {
      console.log(`🧪 Test mode: Processing first ${imagesToProcess.length} of ${images.length} images`);
    }

    for (const [index, image] of imagesToProcess.entries()) {
      console.log(`\n📄 Processing ${index + 1}/${imagesToProcess.length}: ${image.public_id}`);
      console.log(`   🔗 URL: ${image.secure_url}`);
      console.log(`   📊 Size: ${Math.round(image.bytes / 1024)}KB (${image.width}×${image.height})`);

      try {
        const mediaEntry = await createStrapiMediaReference(image, folderId, folderName);

        if (mediaEntry) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({
            file: image.public_id,
            error: 'Failed to create media reference'
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ Error processing ${image.public_id}:`, error.message);
        results.failed++;
        results.errors.push({
          file: image.public_id,
          error: error.message
        });
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    results.errors.push({
      file: 'general',
      error: error.message
    });
  }

  return results;
}

/**
 * Validate current state of Cloudinary and Strapi
 */
async function validateCurrentState() {
  console.log('🔍 VALIDATION: Checking Cloudinary and Strapi state');
  console.log(`📡 Strapi: ${STRAPI_URL}`);
  console.log(`☁️  Cloudinary: ${CLOUDINARY_NAME}`);
  console.log('━'.repeat(80));

  const results = {
    cloudinary: {},
    strapi: {},
    summary: { totalImages: 0, validFolders: 0, invalidFolders: 0 }
  };

  // Validate each mapped folder
  for (const [folderName, folderInfo] of Object.entries(FOLDER_MAPPING)) {
    console.log(`\n📁 Validating: ${folderName} → ${folderInfo.name}`);
    
    // Check Cloudinary
    const cloudinaryCheck = await validateCloudinaryStructure(folderName);
    results.cloudinary[folderName] = cloudinaryCheck;
    
    if (cloudinaryCheck.valid) {
      console.log(`   ✅ Cloudinary: ${cloudinaryCheck.message}`);
      results.summary.totalImages += cloudinaryCheck.count;
    } else {
      console.log(`   ❌ Cloudinary: ${cloudinaryCheck.message}`);
    }

    // Check Strapi folder
    const strapiCheck = await validateStrapiFolder(folderInfo.id);
    results.strapi[folderName] = strapiCheck;
    
    if (strapiCheck.valid) {
      console.log(`   ✅ Strapi: ${strapiCheck.message}`);
      results.summary.validFolders++;
    } else {
      console.log(`   ❌ Strapi: ${strapiCheck.message}`);
      results.summary.invalidFolders++;
    }
  }

  console.log('\n📊 Validation Summary:');
  console.log('━'.repeat(50));
  console.log(`📁 Valid folders: ${results.summary.validFolders}`);
  console.log(`❌ Invalid folders: ${results.summary.invalidFolders}`);
  console.log(`🖼️  Total images found: ${results.summary.totalImages}`);

  return results;
}

/**
 * Test migration with a single folder
 */
async function testMigration(folderName = 'haythorne') {
  console.log(`🧪 TEST MIGRATION: ${folderName}`);
  console.log('This will process only 1 image to verify the approach works correctly.');
  console.log('━'.repeat(80));

  const results = await migrateFolder(folderName, { testMode: true, maxImages: 1 });

  console.log('\n📊 Test Results:');
  console.log('━'.repeat(50));
  console.log(`✅ Successful: ${results.successful}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏩ Skipped: ${results.skipped}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => {
      console.log(`   ${error.file}: ${error.error}`);
    });
  }

  if (results.successful > 0) {
    console.log('\n🎉 Test successful! The approach is working correctly.');
    console.log('You can now run a full migration with:');
    console.log(`   node cloudinary-reference-migration.js migrate ${folderName}`);
    console.log('   node cloudinary-reference-migration.js migrate all');
  }

  return results;
}

/**
 * Migrate all folders
 */
async function migrateAllFolders() {
  console.log('🚀 FULL MIGRATION: All folders');
  console.log('━'.repeat(80));

  const totalResults = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    folderResults: {}
  };

  for (const folderName of Object.keys(FOLDER_MAPPING)) {
    const results = await migrateFolder(folderName);
    
    totalResults.successful += results.successful;
    totalResults.failed += results.failed;
    totalResults.skipped += results.skipped;
    totalResults.errors.push(...results.errors);
    totalResults.folderResults[folderName] = results;

    // Brief pause between folders
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n📊 Final Migration Results:');
  console.log('━'.repeat(50));
  console.log(`✅ Total successful: ${totalResults.successful}`);
  console.log(`❌ Total failed: ${totalResults.failed}`);
  console.log(`⏩ Total skipped: ${totalResults.skipped}`);

  if (totalResults.errors.length > 0) {
    console.log('\n❌ Errors by folder:');
    Object.entries(totalResults.folderResults).forEach(([folder, results]) => {
      if (results.errors.length > 0) {
        console.log(`\n   📁 ${folder}:`);
        results.errors.forEach(error => {
          console.log(`      ${error.file}: ${error.error}`);
        });
      }
    });
  }

  return totalResults;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const target = args[1];

  switch (command) {
    case 'test':
      await testMigration(target);
      break;

    case 'validate':
      await validateCurrentState();
      break;

    case 'migrate':
      if (target === 'all') {
        await migrateAllFolders();
      } else if (target && FOLDER_MAPPING[target]) {
        const results = await migrateFolder(target);
        
        console.log('\n📊 Migration Results:');
        console.log('━'.repeat(50));
        console.log(`✅ Successful: ${results.successful}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`⏩ Skipped: ${results.skipped}`);
        
        if (results.errors.length > 0) {
          console.log('\n❌ Errors:');
          results.errors.forEach(error => {
            console.log(`   ${error.file}: ${error.error}`);
          });
        }
      } else {
        console.error('❌ Usage: migrate <folder_name|all>');
        console.log('Available folders:', Object.keys(FOLDER_MAPPING).join(', '));
      }
      break;

    default:
      console.log('📖 Cloudinary Reference Migration Tool');
      console.log('');
      console.log('This script creates Strapi media entries that REFERENCE Cloudinary URLs');
      console.log('without downloading or re-uploading images.');
      console.log('');
      console.log('Usage:');
      console.log('  node cloudinary-reference-migration.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  test [folder]     - Test with 1 image (default: haythorne)');
      console.log('  validate          - Check current Cloudinary and Strapi state');
      console.log('  migrate <folder>  - Migrate specific folder');
      console.log('  migrate all       - Migrate all mapped folders');
      console.log('');
      console.log('Examples:');
      console.log('  node cloudinary-reference-migration.js test haythorne');
      console.log('  node cloudinary-reference-migration.js validate');
      console.log('  node cloudinary-reference-migration.js migrate agricola');
      console.log('  node cloudinary-reference-migration.js migrate all');
      console.log('');
      console.log('Available folders:');
      Object.entries(FOLDER_MAPPING).forEach(([key, value]) => {
        console.log(`  ${key.padEnd(20)} → ${value.name} (ID: ${value.id})`);
      });
      break;
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  migrateFolder,
  validateCurrentState,
  testMigration,
  getCloudinaryImagesByFolder,
  createStrapiMediaReference,
  FOLDER_MAPPING
};
