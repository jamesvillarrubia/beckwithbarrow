#!/usr/bin/env node

/**
 * Cloudinary Cleanup Script
 * 
 * This script safely removes unused files from Cloudinary root after successful
 * migration to Strapi Cloud storage. It verifies that files exist in Strapi
 * before removing them from Cloudinary.
 * 
 * Features:
 * - Compares Cloudinary files with Strapi files to ensure safety
 * - Creates backups before deletion
 * - Batch deletion with proper error handling
 * - Dry-run mode for testing
 * - Detailed logging and reporting
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
 * Get all files from Cloudinary root
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
      
    } while (nextCursor);
    
    console.log(`📁 Found ${allFiles.length} files at Cloudinary root`);
    return allFiles;
  } catch (error) {
    console.error('❌ Error fetching Cloudinary root files:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get all Strapi files
 */
async function getStrapiFiles() {
  try {
    console.log('🔍 Fetching Strapi files...');
    
    const response = await strapiApi.get('/upload/files?pagination[pageSize]=1000');
    const files = response.data;
    
    console.log(`📄 Found ${files.length} files in Strapi`);
    return files;
  } catch (error) {
    console.error('❌ Error fetching Strapi files:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Find safe-to-delete files by comparing with Strapi
 */
function findSafeToDeleteFiles(cloudinaryFiles, strapiFiles) {
  console.log('🔍 Analyzing files for safe deletion...');
  
  const safeToDelete = [];
  const keepFiles = [];
  const strapiBasenames = new Set();
  
  // Create a set of basenames from Strapi files
  strapiFiles.forEach(file => {
    const basename = file.name.replace(/\.[^.]+$/, ''); // Remove extension
    strapiBasenames.add(basename);
  });
  
  cloudinaryFiles.forEach(cloudinaryFile => {
    const cloudinaryName = cloudinaryFile.display_name || cloudinaryFile.public_id;
    
    // Remove format prefixes to get base name
    const basename = cloudinaryName.replace(/^(thumbnail_|medium_|small_|large_)/, '');
    
    // Check if this file has a corresponding file in Strapi
    let hasMatch = false;
    for (const strapiBasename of strapiBasenames) {
      if (strapiBasename.includes(basename) || basename.includes(strapiBasename)) {
        hasMatch = true;
        break;
      }
    }
    
    if (hasMatch) {
      safeToDelete.push({
        ...cloudinaryFile,
        reason: 'Migrated to Strapi Cloud'
      });
    } else {
      keepFiles.push({
        ...cloudinaryFile,
        reason: 'No corresponding Strapi file found'
      });
    }
  });
  
  console.log(`✅ Safe to delete: ${safeToDelete.length} files`);
  console.log(`⚠️  Keep in Cloudinary: ${keepFiles.length} files`);
  
  return { safeToDelete, keepFiles };
}

/**
 * Delete file from Cloudinary
 */
async function deleteCloudinaryFile(publicId) {
  try {
    console.log(`   🗑️  Deleting ${publicId}...`);
    
    const response = await cloudinaryApi.delete(`/resources/image/upload/${publicId}`);
    
    if (response.data.result === 'ok') {
      console.log(`   ✅ Deleted: ${publicId}`);
      return { success: true, publicId };
    } else {
      console.log(`   ⚠️  Unexpected result for ${publicId}:`, response.data);
      return { success: false, publicId, error: 'Unexpected result' };
    }
  } catch (error) {
    console.error(`   ❌ Failed to delete ${publicId}:`, error.response?.data || error.message);
    return { success: false, publicId, error: error.response?.data || error.message };
  }
}

/**
 * Create backup of files before deletion
 */
function createBackup(files) {
  const backupData = {
    timestamp: new Date().toISOString(),
    cloudinaryName: CLOUDINARY_NAME,
    totalFiles: files.length,
    files: files.map(file => ({
      public_id: file.public_id,
      display_name: file.display_name,
      secure_url: file.secure_url,
      format: file.format,
      width: file.width,
      height: file.height,
      bytes: file.bytes,
      created_at: file.created_at
    }))
  };
  
  const backupDir = path.join(__dirname, '../backups/cloudinary-cleanup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupFile = path.join(backupDir, `cloudinary-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  
  console.log(`💾 Backup created: ${backupFile}`);
  return backupFile;
}

/**
 * Main cleanup function
 */
async function cleanupCloudinaryFiles(options = {}) {
  const { 
    dryRun = false, 
    limit = null,
    skipBackup = false,
    force = false
  } = options;
  
  console.log('🧹 Starting Cloudinary cleanup...');
  console.log(`📡 Strapi: ${STRAPI_URL}`);
  console.log(`☁️  Cloudinary: ${CLOUDINARY_NAME}`);
  console.log(`🧪 Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log(`🚀 Force mode: ${force ? 'YES' : 'NO'}`);
  console.log('━'.repeat(80));
  
  const results = {
    analyzed: 0,
    deleted: 0,
    kept: 0,
    failed: 0,
    errors: []
  };
  
  try {
    // Get files from both sources
    const [cloudinaryFiles, strapiFiles] = await Promise.all([
      getCloudinaryRootFiles(),
      getStrapiFiles()
    ]);
    
    if (cloudinaryFiles.length === 0) {
      console.log('📁 No files found at Cloudinary root');
      return results;
    }
    
    results.analyzed = cloudinaryFiles.length;
    
    // Find safe-to-delete files
    const { safeToDelete, keepFiles } = findSafeToDeleteFiles(cloudinaryFiles, strapiFiles);
    
    if (keepFiles.length > 0 && !force) {
      console.log('\n⚠️  Files to keep in Cloudinary:');
      keepFiles.slice(0, 5).forEach(file => {
        console.log(`   ${file.display_name || file.public_id} - ${file.reason}`);
      });
      if (keepFiles.length > 5) {
        console.log(`   ... and ${keepFiles.length - 5} more files`);
      }
      results.kept = keepFiles.length;
    }
    
    if (safeToDelete.length === 0) {
      console.log('\n✅ No files are safe to delete at this time');
      return results;
    }
    
    console.log(`\n🗑️  Files marked for deletion: ${safeToDelete.length}`);
    
    if (!dryRun && !skipBackup) {
      createBackup(safeToDelete);
    }
    
    // Process deletions (limit if specified)
    const filesToDelete = limit ? safeToDelete.slice(0, limit) : safeToDelete;
    
    if (dryRun) {
      console.log('\n🧪 DRY RUN - Would delete:');
      filesToDelete.forEach((file, i) => {
        console.log(`${i + 1}. ${file.display_name || file.public_id} (${file.reason})`);
      });
      results.deleted = filesToDelete.length;
    } else {
      console.log('\n🗑️  Starting deletion process...');
      
      for (const [index, file] of filesToDelete.entries()) {
        console.log(`\n📄 Deleting ${index + 1}/${filesToDelete.length}:`);
        
        const deleteResult = await deleteCloudinaryFile(file.public_id);
        
        if (deleteResult.success) {
          results.deleted++;
        } else {
          results.failed++;
          results.errors.push({
            file: file.public_id,
            error: deleteResult.error
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    results.errors.push({
      file: 'general',
      error: error.message
    });
  }
  
  return results;
}

/**
 * Print results summary
 */
function printResults(results) {
  console.log('\n📊 Cleanup Results:');
  console.log('━'.repeat(50));
  console.log(`📄 Analyzed: ${results.analyzed}`);
  console.log(`🗑️  Deleted: ${results.deleted}`);
  console.log(`📁 Kept: ${results.kept}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => {
      console.log(`   ${error.file}: ${error.error}`);
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
    case 'analyze':
      console.log('🔍 Analyzing Cloudinary files for cleanup...');
      const analysisResults = await cleanupCloudinaryFiles({ dryRun: true });
      printResults(analysisResults);
      break;
      
    case 'dry-run':
      const limit = args[1] ? parseInt(args[1]) : null;
      console.log('🧪 Dry run cleanup...');
      const dryRunResults = await cleanupCloudinaryFiles({ dryRun: true, limit });
      printResults(dryRunResults);
      break;
      
    case 'cleanup':
      const cleanupLimit = args[1] ? parseInt(args[1]) : null;
      const force = args.includes('--force');
      
      if (!force) {
        console.log('⚠️  This will permanently delete files from Cloudinary!');
        console.log('   Make sure you have verified that files exist in Strapi.');
        console.log('   Use --force flag to proceed without this warning.');
        console.log('');
        console.log('   Run with: node cloudinary-cleanup.js cleanup [limit] --force');
        return;
      }
      
      const cleanupResults = await cleanupCloudinaryFiles({ 
        limit: cleanupLimit,
        force: true
      });
      printResults(cleanupResults);
      break;
      
    default:
      console.log('📖 Cloudinary Cleanup Tool');
      console.log('');
      console.log('This tool safely removes unused files from Cloudinary root after');
      console.log('successful migration to Strapi Cloud storage.');
      console.log('');
      console.log('Usage:');
      console.log('  node cloudinary-cleanup.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  analyze                    - Analyze files without making changes');
      console.log('  dry-run [limit]            - Preview what would be deleted');
      console.log('  cleanup [limit] --force    - Actually delete files (requires --force)');
      console.log('');
      console.log('Examples:');
      console.log('  node cloudinary-cleanup.js analyze');
      console.log('  node cloudinary-cleanup.js dry-run 5');
      console.log('  node cloudinary-cleanup.js cleanup 10 --force');
      console.log('');
      console.log('⚠️  IMPORTANT: Always run analyze/dry-run first!');
      console.log('⚠️  Verify your Strapi files are working before cleanup!');
      break;
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  cleanupCloudinaryFiles,
  getCloudinaryRootFiles,
  getStrapiFiles,
  findSafeToDeleteFiles,
  deleteCloudinaryFile
};
