#!/usr/bin/env node

/**
 * Cloudinary to Strapi Media Library Sync
 * 
 * This script:
 * 1. Fetches folder structure from Cloudinary
 * 2. Creates matching folders in Strapi (using filename-based organization)
 * 3. Downloads and uploads assets from Cloudinary to Strapi
 * 4. Filters out generated variants (small, med, large, thumbnail)
 * 5. Organizes files into the correct Strapi folders
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../strapi-cloud.env') });

const STRAPI_URL = process.env.STRAPI_CLOUD_BASE_URL || 'https://striking-ball-b079f8c4b0.strapiapp.com';
const API_TOKEN = process.env.STRAPI_CLOUD_API_TOKEN;

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!API_TOKEN) {
  console.error('❌ STRAPI_CLOUD_API_TOKEN not found in environment variables');
  process.exit(1);
}

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary credentials not found in environment variables');
  console.error('   Required: CLOUDINARY_NAME, CLOUDINARY_KEY, CLOUDINARY_API_SECRET');
  process.exit(1);
}

// Configure axios for Strapi API
const strapiApi = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Configure axios for Cloudinary API
const cloudinaryApi = axios.create({
  baseURL: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`,
  auth: {
    username: CLOUDINARY_API_KEY,
    password: CLOUDINARY_API_SECRET
  }
});

/**
 * Fetch all assets from Cloudinary with folder information
 */
async function fetchCloudinaryAssets() {
  console.log('🔍 Fetching assets from Cloudinary...');
  
  try {
    const response = await cloudinaryApi.get('/resources', {
      params: {
        type: 'upload',
        prefix: '', // Get all assets
        max_results: 500, // Adjust based on your needs
        context: true // Include context/metadata
      }
    });
    
    console.log(`📊 Found ${response.data.resources.length} assets in Cloudinary`);
    return response.data.resources;
  } catch (error) {
    console.error('❌ Error fetching Cloudinary assets:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Filter out generated variants and organize by folder
 */
function organizeCloudinaryAssets(assets) {
  console.log('📁 Organizing Cloudinary assets by folder...');
  
  const organizedAssets = {};
  const generatedVariants = ['small', 'med', 'medium', 'large', 'thumbnail', 'thumb', 'sm', 'md', 'lg', 'xl'];
  
  assets.forEach(asset => {
    // Skip generated variants
    const isGenerated = generatedVariants.some(variant => 
      asset.public_id.includes(`_${variant}`) || 
      asset.public_id.includes(`/${variant}/`) ||
      asset.public_id.endsWith(`_${variant}`)
    );
    
    if (isGenerated) {
      console.log(`⏩ Skipping generated variant: ${asset.public_id}`);
      return;
    }
    
    // Extract folder from public_id
    const pathParts = asset.public_id.split('/');
    const folder = pathParts.length > 1 ? pathParts[0] : 'root';
    const filename = pathParts[pathParts.length - 1];
    
    if (!organizedAssets[folder]) {
      organizedAssets[folder] = [];
    }
    
    organizedAssets[folder].push({
      ...asset,
      folder,
      filename,
      originalName: filename
    });
  });
  
  console.log(`📁 Organized into ${Object.keys(organizedAssets).length} folders:`);
  Object.entries(organizedAssets).forEach(([folder, assets]) => {
    console.log(`   ${folder}: ${assets.length} assets`);
  });
  
  return organizedAssets;
}

/**
 * Create a folder structure in Strapi using filename-based organization
 */
async function createStrapiFolderStructure(organizedAssets) {
  console.log('🏗️  Creating Strapi folder structure...');
  
  const folderMap = {};
  
  for (const [cloudinaryFolder, assets] of Object.entries(organizedAssets)) {
    if (assets.length === 0) continue;
    
    // Create a folder name for Strapi
    const strapiFolderName = cloudinaryFolder === 'root' ? 'Main' : cloudinaryFolder;
    
    console.log(`📁 Creating folder: ${strapiFolderName} (${assets.length} assets)`);
    
    // For now, we'll use the filename-based approach
    // In a real implementation, you might want to create actual folder metadata
    folderMap[cloudinaryFolder] = {
      strapiName: strapiFolderName,
      assets: assets,
      description: `Imported from Cloudinary folder: ${cloudinaryFolder}`
    };
  }
  
  return folderMap;
}

/**
 * Download file from URL
 */
async function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(filename);
      });
    }).on('error', (err) => {
      fs.unlink(filename, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

/**
 * Upload file to Strapi
 */
async function uploadFileToStrapi(filePath, originalName, folderName) {
  try {
    const formData = new FormData();
    formData.append('files', fs.createReadStream(filePath), originalName);
    
    // Add folder information in the request
    if (folderName && folderName !== 'root') {
      formData.append('folder', folderName);
    }
    
    const response = await strapiApi.post('/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    return response.data[0]; // Return the uploaded file data
  } catch (error) {
    console.error(`❌ Error uploading ${originalName}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Sync assets from Cloudinary to Strapi
 */
async function syncAssetsToStrapi(folderMap) {
  console.log('🔄 Syncing assets from Cloudinary to Strapi...');
  
  const tempDir = path.join(__dirname, '../temp-cloudinary-sync');
  
  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  for (const [cloudinaryFolder, folderData] of Object.entries(folderMap)) {
    console.log(`\n📁 Processing folder: ${folderData.strapiName}`);
    
    for (const asset of folderData.assets) {
      try {
        console.log(`   📄 Processing: ${asset.filename}`);
        
        // Download file from Cloudinary
        const tempFilePath = path.join(tempDir, asset.filename);
        await downloadFile(asset.secure_url, tempFilePath);
        
        // Upload to Strapi
        const uploadedFile = await uploadFileToStrapi(
          tempFilePath, 
          asset.filename, 
          folderData.strapiName
        );
        
        if (uploadedFile) {
          console.log(`   ✅ Uploaded: ${uploadedFile.name} (ID: ${uploadedFile.id})`);
          results.successful++;
        } else {
          console.log(`   ❌ Failed to upload: ${asset.filename}`);
          results.failed++;
        }
        
        // Clean up temp file
        fs.unlinkSync(tempFilePath);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`   ❌ Error processing ${asset.filename}:`, error.message);
        results.failed++;
        results.errors.push({
          file: asset.filename,
          error: error.message
        });
      }
    }
  }
  
  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  return results;
}

/**
 * Create projects from synced assets
 */
async function createProjectsFromSyncedAssets(folderMap) {
  console.log('🚀 Creating projects from synced assets...');
  
  for (const [cloudinaryFolder, folderData] of Object.entries(folderMap)) {
    if (folderData.assets.length < 2) {
      console.log(`⏩ Skipping ${folderData.strapiName} (less than 2 assets)`);
      continue;
    }
    
    console.log(`📋 Creating project for: ${folderData.strapiName}`);
    
    // This would integrate with your existing create-projects-api.js
    // For now, just show what would be created
    console.log(`   → Project name: ${folderData.strapiName} Project`);
    console.log(`   → Assets: ${folderData.assets.length} files`);
    console.log(`   → Cover image: ${folderData.assets[0]?.filename || 'Unknown'}`);
    console.log(`   → Additional images: ${folderData.assets.slice(1, 6).length} files`);
  }
}

/**
 * Main sync function
 */
async function syncCloudinaryToStrapi() {
  console.log('🚀 Starting Cloudinary to Strapi sync...');
  console.log(`📡 Strapi: ${STRAPI_URL}`);
  console.log(`☁️  Cloudinary: ${CLOUDINARY_CLOUD_NAME}`);
  console.log('');
  
  try {
    // Step 1: Fetch assets from Cloudinary
    const cloudinaryAssets = await fetchCloudinaryAssets();
    if (cloudinaryAssets.length === 0) {
      console.log('📁 No assets found in Cloudinary');
      return;
    }
    
    // Step 2: Organize assets by folder
    const organizedAssets = organizeCloudinaryAssets(cloudinaryAssets);
    
    // Step 3: Create Strapi folder structure
    const folderMap = await createStrapiFolderStructure(organizedAssets);
    
    // Step 4: Sync assets to Strapi
    const syncResults = await syncAssetsToStrapi(folderMap);
    
    // Step 5: Create projects from synced assets
    await createProjectsFromSyncedAssets(folderMap);
    
    // Display results
    console.log('\n📊 Sync Results:');
    console.log(`✅ Successful: ${syncResults.successful}`);
    console.log(`❌ Failed: ${syncResults.failed}`);
    console.log(`⏩ Skipped: ${syncResults.skipped}`);
    
    if (syncResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      syncResults.errors.forEach(error => {
        console.log(`   ${error.file}: ${error.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

/**
 * Preview what would be synced (dry run)
 */
async function previewSync() {
  console.log('👀 Previewing Cloudinary to Strapi sync...');
  
  const cloudinaryAssets = await fetchCloudinaryAssets();
  if (cloudinaryAssets.length === 0) {
    console.log('📁 No assets found in Cloudinary');
    return;
  }
  
  const organizedAssets = organizeCloudinaryAssets(cloudinaryAssets);
  
  console.log('\n📋 What would be synced:');
  Object.entries(organizedAssets).forEach(([folder, assets]) => {
    console.log(`\n📁 ${folder}:`);
    assets.forEach(asset => {
      console.log(`   📄 ${asset.filename} (${asset.format}, ${Math.round(asset.bytes / 1024)}KB)`);
    });
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'preview':
      await previewSync();
      break;
      
    case 'sync':
      await syncCloudinaryToStrapi();
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node cloudinary-to-strapi-sync.js <command>');
      console.log('');
      console.log('📋 Commands:');
      console.log('  preview    - Preview what would be synced (dry run)');
      console.log('  sync       - Perform the actual sync');
      console.log('');
      console.log('💡 Examples:');
      console.log('  node cloudinary-to-strapi-sync.js preview');
      console.log('  node cloudinary-to-strapi-sync.js sync');
      break;
  }
}

// Export functions for use in other scripts
module.exports = {
  fetchCloudinaryAssets,
  organizeCloudinaryAssets,
  createStrapiFolderStructure,
  syncAssetsToStrapi,
  createProjectsFromSyncedAssets,
  syncCloudinaryToStrapi,
  previewSync
};

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}
