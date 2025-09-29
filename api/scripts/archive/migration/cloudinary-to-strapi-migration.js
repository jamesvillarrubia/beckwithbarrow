#!/usr/bin/env node

/**
 * Cloudinary to Strapi Migration Script
 * 
 * This script migrates images from Cloudinary to Strapi media folders
 * using the strapi-plugin-media-library-handler API endpoints.
 */

const axios = require('axios');
const FormData = require('form-data');
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
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`
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

/**
 * Download file from URL to local temporary file
 */
async function downloadFile(url, tempFilePath) {
  const writer = fs.createWriteStream(tempFilePath);
  
  const response = await axios({
    method: 'get',
    url: url,
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

/**
 * Upload file to Strapi using the media-library-handler plugin API
 */
async function uploadFileToStrapi(filePath, originalName, folderId, alternativeText = '', caption = '') {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('folderId', folderId.toString());
    
    if (alternativeText) {
      formData.append('alternativeText', alternativeText);
    }
    
    if (caption) {
      formData.append('caption', caption);
    }

    console.log(`   📤 Uploading to Strapi folder ${folderId}...`);
    
    const response = await strapiApi.post('/media/files', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      const uploadedFile = response.data.data[0];
      console.log(`   ✅ Uploaded: ${uploadedFile.name} (ID: ${uploadedFile.id})`);
      return uploadedFile;
    } else {
      console.error(`   ❌ Unexpected response format:`, response.data);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Upload failed:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Get Cloudinary images by folder
 */
async function getCloudinaryImagesByFolder(folderPath) {
  try {
    console.log(`🔍 Fetching Cloudinary images from folder: ${folderPath}`);
    
    const response = await cloudinaryApi.get('/resources/image', {
      params: {
        type: 'upload',
        max_results: 500
      }
    });

    const images = response.data.resources.filter(resource => 
      resource.asset_folder && resource.asset_folder.includes(folderPath)
    );

    console.log(`📁 Found ${images.length} images in ${folderPath}`);
    return images;
  } catch (error) {
    console.error('❌ Error fetching Cloudinary images:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Migrate images from a specific Cloudinary folder to a Strapi folder
 */
async function migrateFolder(cloudinaryFolderName, strapiFolderId, strapifolderName) {
  console.log(`\n🚀 Starting migration: ${cloudinaryFolderName} → ${strapifolderName} (ID: ${strapiFolderId})`);
  console.log('━'.repeat(80));

  // Create temp directory
  const tempDir = path.join(__dirname, '../temp-migration');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Get images from Cloudinary
    const images = await getCloudinaryImagesByFolder(cloudinaryFolderName);
    
    if (images.length === 0) {
      console.log('📁 No images found in this folder');
      return results;
    }

    for (const [index, image] of images.entries()) {
      console.log(`\n📄 Processing ${index + 1}/${images.length}: ${image.display_name || image.public_id}`);
      console.log(`   🔗 URL: ${image.secure_url}`);
      console.log(`   📊 Size: ${Math.round(image.bytes / 1024)}KB (${image.width}×${image.height})`);

      try {
        // Create temp file path
        const fileName = `${image.display_name || image.public_id}.${image.format}`;
        const tempFilePath = path.join(tempDir, fileName);

        // Download from Cloudinary
        console.log(`   ⬇️  Downloading...`);
        await downloadFile(image.secure_url, tempFilePath);

        // Upload to Strapi
        const uploadedFile = await uploadFileToStrapi(
          tempFilePath,
          fileName,
          strapiFolderId,
          `${strapifolderName} - ${image.display_name || image.public_id}`,
          '' // Leave caption blank - no descriptive content available
        );

        if (uploadedFile) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({
            file: fileName,
            error: 'Upload failed'
          });
        }

        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

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

  // Clean up temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return results;
}

/**
 * Test migration with Haythorne House
 */
async function testMigration() {
  console.log('🧪 TEST MIGRATION: Haythorne House');
  console.log(`📡 Strapi: ${STRAPI_URL}`);
  console.log(`☁️  Cloudinary: ${CLOUDINARY_NAME}`);
  console.log('');

  const results = await migrateFolder('haythorne', 163, 'Haythorne House');

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

  console.log('\n🎉 Test migration complete!');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'test':
      await testMigration();
      break;

    case 'migrate':
      const cloudinaryFolder = args[1];
      const strapiFolderId = args[2];
      const strapifolderName = args[3];
      
      if (!cloudinaryFolder || !strapiFolderId || !strapifolderName) {
        console.error('❌ Usage: node cloudinary-to-strapi-migration.js migrate <cloudinary_folder> <strapi_folder_id> <strapi_folder_name>');
        process.exit(1);
      }
      
      await migrateFolder(cloudinaryFolder, parseInt(strapiFolderId), strapifolderName);
      break;

    default:
      console.log('📖 Cloudinary to Strapi Migration Tool');
      console.log('');
      console.log('Usage:');
      console.log('  node cloudinary-to-strapi-migration.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  test                                           - Test migration with Haythorne House (4 images)');
      console.log('  migrate <cloudinary_folder> <folder_id> <name> - Migrate specific folder');
      console.log('');
      console.log('Examples:');
      console.log('  node cloudinary-to-strapi-migration.js test');
      console.log('  node cloudinary-to-strapi-migration.js migrate haythorne 163 "Haythorne House"');
      break;
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  migrateFolder,
  getCloudinaryImagesByFolder,
  uploadFileToStrapi
};
