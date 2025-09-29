#!/usr/bin/env node

/**
 * Cleanup Incorrect Migration
 * 
 * Deletes all incorrectly uploaded images from Strapi Cloud storage
 * that should have been references to Cloudinary URLs instead.
 */

const axios = require('axios');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../strapi-cloud.env') });

const STRAPI_URL = process.env.STRAPI_CLOUD_BASE_URL || 'https://striking-ball-b079f8c4b0.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_CLOUD_API_TOKEN;

if (!STRAPI_API_TOKEN) {
  console.error('❌ Missing STRAPI_CLOUD_API_TOKEN');
  process.exit(1);
}

// Configure axios for Strapi API
const strapiApi = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`
  }
});

/**
 * Get all media files uploaded after the migration started
 */
async function getIncorrectlyMigratedFiles() {
  try {
    console.log('🔍 Finding incorrectly migrated files...');
    
    // Get files uploaded today (migration day)
    const response = await strapiApi.get('/media/files?pagination[limit]=1000');
    const files = response.data || [];
    
    // Filter files that were part of the incorrect migration
    // These will have names matching our Cloudinary patterns and be uploaded to Strapi Cloud
    const incorrectFiles = files.filter(file => {
      const isFromCloudinary = file.name && (
        file.name.includes('haythorne_') ||
        file.name.includes('strauss_weinberg_') ||
        file.name.includes('hetherington_') ||
        file.name.includes('rowntree_') ||
        file.name.includes('buhn_') ||
        file.name.includes('gunther_') ||
        file.name.includes('holm_') ||
        file.name.includes('agricola_') ||
        file.name.includes('waller_') ||
        file.name.includes('butler_') ||
        file.name.includes('dineen_') ||
        file.name.includes('seidman_') ||
        file.name.includes('onota_') ||
        file.name.includes('turell_') ||
        file.name.includes('krant_') ||
        file.name.includes('jenks_') ||
        file.name.includes('logo_') ||
        file.name.includes('logos_')
      );
      
      const isInStrapiCloud = file.provider === 'strapi-provider-upload-strapi-cloud';
      
      return isFromCloudinary && isInStrapiCloud;
    });
    
    console.log(`📁 Found ${incorrectFiles.length} incorrectly migrated files`);
    return incorrectFiles;
    
  } catch (error) {
    console.error('❌ Error fetching files:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Delete a single media file
 */
async function deleteMediaFile(fileId, fileName) {
  try {
    await strapiApi.delete(`/media/files/${fileId}`);
    console.log(`   ✅ Deleted: ${fileName} (ID: ${fileId})`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to delete ${fileName}:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Main cleanup function
 */
async function cleanupIncorrectMigration() {
  console.log('🧹 CLEANUP: Removing incorrectly migrated files');
  console.log(`📡 Strapi: ${STRAPI_URL}`);
  console.log('━'.repeat(80));
  
  const incorrectFiles = await getIncorrectlyMigratedFiles();
  
  if (incorrectFiles.length === 0) {
    console.log('✅ No incorrectly migrated files found');
    return;
  }
  
  console.log(`\n🗑️  Deleting ${incorrectFiles.length} files...`);
  
  let deleted = 0;
  let failed = 0;
  
  for (const file of incorrectFiles) {
    const success = await deleteMediaFile(file.id, file.name);
    if (success) {
      deleted++;
    } else {
      failed++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n📊 Cleanup Results:');
  console.log('━'.repeat(50));
  console.log(`✅ Deleted: ${deleted}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('\n🎉 Cleanup complete!');
}

/**
 * Preview what would be deleted (dry run)
 */
async function previewCleanup() {
  console.log('👀 PREVIEW: Files that would be deleted');
  console.log('━'.repeat(80));
  
  const incorrectFiles = await getIncorrectlyMigratedFiles();
  
  if (incorrectFiles.length === 0) {
    console.log('✅ No incorrectly migrated files found');
    return;
  }
  
  console.log(`\n📋 ${incorrectFiles.length} files would be deleted:`);
  incorrectFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file.name} (ID: ${file.id})`);
  });
  
  console.log(`\nTo proceed with deletion, run:`);
  console.log(`node cleanup-incorrect-migration.js delete`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'delete':
      await cleanupIncorrectMigration();
      break;
      
    case 'preview':
    default:
      await previewCleanup();
      break;
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getIncorrectlyMigratedFiles,
  deleteMediaFile,
  cleanupIncorrectMigration
};
