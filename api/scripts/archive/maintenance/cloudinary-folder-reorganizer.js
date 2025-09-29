#!/usr/bin/env node

/**
 * Cloudinary Folder Reorganizer & Strapi Database Updater
 * 
 * This script moves files from Cloudinary root to organized folders and updates
 * all corresponding references in the Strapi database.
 * 
 * Features:
 * - Moves files in Cloudinary from root to organized folders
 * - Updates Strapi database with new Cloudinary URLs
 * - Updates both main file URLs and format URLs (thumbnails, etc.)
 * - Handles batch operations with proper error handling
 * - Creates backup of database changes for rollback
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
 * Get all files from Cloudinary root (no folder)
 */
async function getCloudinaryRootFiles() {
  try {
    console.log('🔍 Fetching Cloudinary files from root...');
    
    let allFiles = [];
    let nextCursor = null;
    
    do {
      const params = {
        type: 'upload',
        max_results: 500,
        resource_type: 'image'
      };
      
      if (nextCursor) {
        params.next_cursor = nextCursor;
      }
      
      const response = await cloudinaryApi.get('/resources/image', { params });
      
      // Filter files that are at root (no asset_folder or empty asset_folder)
      const rootFiles = response.data.resources.filter(resource => 
        !resource.asset_folder || resource.asset_folder === ''
      );
      
      allFiles = allFiles.concat(rootFiles);
      nextCursor = response.data.next_cursor;
      
      console.log(`📄 Found ${rootFiles.length} root files in this batch (${allFiles.length} total so far)`);
      
    } while (nextCursor);
    
    console.log(`📁 Total root files found: ${allFiles.length}`);
    return allFiles;
  } catch (error) {
    console.error('❌ Error fetching Cloudinary root files:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Move file in Cloudinary to a specific folder
 */
async function moveCloudinaryFile(publicId, targetFolder) {
  try {
    console.log(`   📁 Moving ${publicId} to folder: ${targetFolder}`);
    
    const response = await cloudinaryApi.post('/resources/rename', {
      from_public_id: publicId,
      to_public_id: `${targetFolder}/${path.basename(publicId)}`,
      resource_type: 'image',
      type: 'upload'
    });
    
    const newPublicId = response.data.public_id;
    console.log(`   ✅ Moved to: ${newPublicId}`);
    
    return {
      success: true,
      oldPublicId: publicId,
      newPublicId: newPublicId,
      newUrl: response.data.secure_url
    };
  } catch (error) {
    console.error(`   ❌ Failed to move ${publicId}:`, error.response?.data || error.message);
    return {
      success: false,
      oldPublicId: publicId,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Get all Strapi media files that reference Cloudinary URLs
 */
async function getStrapiMediaFiles() {
  try {
    console.log('🔍 Fetching Strapi media files...');
    
    const response = await strapiApi.get('/upload/files?pagination[pageSize]=1000');
    const files = response.data;
    
    // Filter files that use Cloudinary and are at root
    const cloudinaryFiles = files.filter(file => 
      file.provider === 'cloudinary' && 
      file.url && 
      file.url.includes('cloudinary.com') &&
      !file.url.includes('/direct_uploads/') && // Skip files already in organized folders
      !file.provider_metadata?.folder // Files at root level
    );
    
    console.log(`📄 Found ${cloudinaryFiles.length} Cloudinary files at root in Strapi`);
    return cloudinaryFiles;
  } catch (error) {
    console.error('❌ Error fetching Strapi media files:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Update Strapi file record with new Cloudinary URLs
 */
async function updateStrapiFileRecord(fileId, oldUrl, newUrl, newPublicId, targetFolder) {
  try {
    console.log(`   🔄 Updating Strapi file ${fileId}...`);
    
    // Get current file data
    const currentFile = await strapiApi.get(`/upload/files/${fileId}`);
    const fileData = currentFile.data;
    
    // Update main URL
    const updatedData = {
      url: newUrl,
      provider_metadata: {
        ...fileData.provider_metadata,
        public_id: newPublicId,
        folder: targetFolder
      }
    };
    
    // Update formats if they exist
    if (fileData.formats) {
      const updatedFormats = {};
      
      for (const [formatName, formatData] of Object.entries(fileData.formats)) {
        if (formatData.url && formatData.url.includes(oldUrl.split('/').pop().split('.')[0])) {
          // Update format URL to point to new location
          const oldBasename = oldUrl.split('/').pop().split('.')[0];
          const newFormatUrl = formatData.url.replace(
            new RegExp(`/image/upload/([^/]*/)?(${oldBasename})`),
            `/image/upload/$1${targetFolder}/${oldBasename}`
          );
          
          updatedFormats[formatName] = {
            ...formatData,
            url: newFormatUrl
          };
        } else {
          updatedFormats[formatName] = formatData;
        }
      }
      
      updatedData.formats = updatedFormats;
    }
    
    // Update the file record
    const response = await strapiApi.put(`/upload/files/${fileId}`, updatedData);
    
    console.log(`   ✅ Updated Strapi file ${fileId}`);
    return {
      success: true,
      fileId: fileId,
      oldUrl: oldUrl,
      newUrl: newUrl
    };
  } catch (error) {
    console.error(`   ❌ Failed to update Strapi file ${fileId}:`, error.response?.data || error.message);
    return {
      success: false,
      fileId: fileId,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Determine target folder for a file based on various criteria
 */
function determineTargetFolder(file, strapiFile = null) {
  // Priority 1: If Strapi file exists, check its current folder assignment
  if (strapiFile && strapiFile.folder && strapiFile.folder.name) {
    return strapiFile.folder.name.toLowerCase().replace(/\s+/g, '-');
  }
  
  // Priority 2: Check file name patterns
  const fileName = file.display_name || file.public_id;
  const lowerName = fileName.toLowerCase();
  
  // Common project/property patterns
  if (lowerName.includes('haythorne')) return 'haythorne-house';
  if (lowerName.includes('beckwith') || lowerName.includes('barrow')) return 'beckwith-barrow';
  if (lowerName.includes('residential')) return 'residential-projects';
  if (lowerName.includes('commercial')) return 'commercial-projects';
  if (lowerName.includes('interior')) return 'interior-design';
  if (lowerName.includes('exterior')) return 'exterior-design';
  if (lowerName.includes('landscape')) return 'landscape-design';
  
  // Priority 3: Check file metadata/tags if available
  if (file.context && file.context.custom) {
    const tags = Object.values(file.context.custom).join(' ').toLowerCase();
    if (tags.includes('project')) return 'projects';
    if (tags.includes('portfolio')) return 'portfolio';
  }
  
  // Priority 4: Default based on file type/characteristics
  if (file.width && file.height) {
    const aspectRatio = file.width / file.height;
    if (aspectRatio > 1.5) return 'wide-images'; // Landscape/wide images
    if (aspectRatio < 0.7) return 'tall-images'; // Portrait/tall images
  }
  
  // Default fallback
  return 'organized-media';
}

/**
 * Create backup of current file states before making changes
 */
async function createBackup(files) {
  const backupData = {
    timestamp: new Date().toISOString(),
    files: files.map(file => ({
      id: file.id,
      name: file.name,
      url: file.url,
      formats: file.formats,
      provider_metadata: file.provider_metadata
    }))
  };
  
  const backupDir = path.join(__dirname, '../backups/reorganizer');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupFile = path.join(backupDir, `backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  
  console.log(`💾 Backup created: ${backupFile}`);
  return backupFile;
}

/**
 * Main reorganization function
 */
async function reorganizeFiles(options = {}) {
  const { 
    dryRun = false, 
    targetFolder = null, 
    limit = null,
    skipBackup = false 
  } = options;
  
  console.log('🚀 Starting Cloudinary folder reorganization...');
  console.log(`📡 Strapi: ${STRAPI_URL}`);
  console.log(`☁️  Cloudinary: ${CLOUDINARY_NAME}`);
  console.log(`🧪 Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('━'.repeat(80));
  
  const results = {
    processed: 0,
    moved: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  try {
    // Get files from both sources
    const [cloudinaryFiles, strapiFiles] = await Promise.all([
      getCloudinaryRootFiles(),
      getStrapiMediaFiles()
    ]);
    
    if (cloudinaryFiles.length === 0) {
      console.log('📁 No files found at Cloudinary root');
      return results;
    }
    
    // Create a map of Strapi files by URL for quick lookup
    const strapiFileMap = new Map();
    strapiFiles.forEach(file => {
      // Extract public_id from URL for matching
      const urlParts = file.url.split('/');
      const publicIdWithExt = urlParts[urlParts.length - 1];
      const publicId = publicIdWithExt.split('.')[0];
      strapiFileMap.set(publicId, file);
    });
    
    // Create backup before making changes
    if (!skipBackup && !dryRun) {
      await createBackup(strapiFiles);
    }
    
    // Process files (limit if specified)
    const filesToProcess = limit ? cloudinaryFiles.slice(0, limit) : cloudinaryFiles;
    
    for (const [index, cloudinaryFile] of filesToProcess.entries()) {
      console.log(`\n📄 Processing ${index + 1}/${filesToProcess.length}: ${cloudinaryFile.display_name || cloudinaryFile.public_id}`);
      results.processed++;
      
      try {
        // Find corresponding Strapi file
        const strapiFile = strapiFileMap.get(cloudinaryFile.public_id);
        
        // Determine target folder
        const folder = targetFolder || determineTargetFolder(cloudinaryFile, strapiFile);
        console.log(`   📁 Target folder: ${folder}`);
        
        if (dryRun) {
          console.log(`   🧪 DRY RUN: Would move to ${folder}`);
          results.skipped++;
          continue;
        }
        
        // Move file in Cloudinary
        const moveResult = await moveCloudinaryFile(cloudinaryFile.public_id, folder);
        
        if (!moveResult.success) {
          results.failed++;
          results.errors.push({
            file: cloudinaryFile.public_id,
            stage: 'cloudinary_move',
            error: moveResult.error
          });
          continue;
        }
        
        results.moved++;
        
        // Update Strapi database if file exists there
        if (strapiFile) {
          const updateResult = await updateStrapiFileRecord(
            strapiFile.id,
            strapiFile.url,
            moveResult.newUrl,
            moveResult.newPublicId,
            folder
          );
          
          if (updateResult.success) {
            results.updated++;
          } else {
            results.failed++;
            results.errors.push({
              file: cloudinaryFile.public_id,
              stage: 'strapi_update',
              error: updateResult.error
            });
          }
        } else {
          console.log(`   ⚠️  No corresponding Strapi file found for ${cloudinaryFile.public_id}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error(`   ❌ Error processing ${cloudinaryFile.public_id}:`, error.message);
        results.failed++;
        results.errors.push({
          file: cloudinaryFile.public_id,
          stage: 'general',
          error: error.message
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Reorganization failed:', error.message);
    results.errors.push({
      file: 'general',
      stage: 'general',
      error: error.message
    });
  }
  
  return results;
}

/**
 * Print results summary
 */
function printResults(results) {
  console.log('\n📊 Reorganization Results:');
  console.log('━'.repeat(50));
  console.log(`📄 Processed: ${results.processed}`);
  console.log(`📁 Moved in Cloudinary: ${results.moved}`);
  console.log(`🔄 Updated in Strapi: ${results.updated}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏩ Skipped: ${results.skipped}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => {
      console.log(`   ${error.file} (${error.stage}): ${error.error}`);
    });
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'dry-run':
      const dryRunResults = await reorganizeFiles({ 
        dryRun: true,
        limit: args[1] ? parseInt(args[1]) : 10
      });
      printResults(dryRunResults);
      break;
      
    case 'reorganize':
      const folder = args[1];
      const limit = args[2] ? parseInt(args[2]) : null;
      
      console.log('⚠️  This will make permanent changes to Cloudinary and Strapi!');
      console.log('   Make sure you have backups before proceeding.');
      console.log('');
      
      const results = await reorganizeFiles({ 
        targetFolder: folder,
        limit: limit
      });
      printResults(results);
      break;
      
    case 'list-root':
      const rootFiles = await getCloudinaryRootFiles();
      console.log('\n📁 Files at Cloudinary root:');
      rootFiles.slice(0, 20).forEach((file, i) => {
        console.log(`${i + 1}. ${file.display_name || file.public_id} (${file.format})`);
      });
      if (rootFiles.length > 20) {
        console.log(`... and ${rootFiles.length - 20} more files`);
      }
      break;
      
    default:
      console.log('📖 Cloudinary Folder Reorganizer & Strapi Database Updater');
      console.log('');
      console.log('This tool moves files from Cloudinary root to organized folders');
      console.log('and updates all corresponding references in Strapi database.');
      console.log('');
      console.log('Usage:');
      console.log('  node cloudinary-folder-reorganizer.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  list-root                    - List files currently at Cloudinary root');
      console.log('  dry-run [limit]              - Preview what would be moved (default: 10 files)');
      console.log('  reorganize [folder] [limit]  - Actually reorganize files');
      console.log('');
      console.log('Examples:');
      console.log('  node cloudinary-folder-reorganizer.js list-root');
      console.log('  node cloudinary-folder-reorganizer.js dry-run 5');
      console.log('  node cloudinary-folder-reorganizer.js reorganize projects 20');
      console.log('  node cloudinary-folder-reorganizer.js reorganize');
      console.log('');
      console.log('⚠️  IMPORTANT: Always run dry-run first to preview changes!');
      break;
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  reorganizeFiles,
  getCloudinaryRootFiles,
  getStrapiMediaFiles,
  moveCloudinaryFile,
  updateStrapiFileRecord,
  determineTargetFolder
};
