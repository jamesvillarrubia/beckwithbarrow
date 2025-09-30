#!/usr/bin/env node

/**
 * Cloudinary Folder Organizer
 * 
 * This script reorganizes images that were incorrectly synced by CloudyDesktop.
 * It moves images from ROOT (with project prefixes) into proper folder structure.
 * 
 * Original intended structure: /cloudydesktop/beckwithbarrow/agricola/image.jpg
 * Current incorrect structure: agricola_image_hash.jpg (in ROOT)
 * Target structure: beckwithbarrow/agricola/image.jpg
 * 
 * Features:
 * - Creates proper folder structure in Cloudinary
 * - Moves images from ROOT to organized folders
 * - Handles format variants (thumbnail, small, medium, large)
 * - Removes duplicates from direct_uploads
 * - Uses correct Cloudinary folder APIs
 * - Safe with dry-run mode
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../strapi-cloud.env') });

const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME;
const CLOUDINARY_KEY = process.env.CLOUDINARY_KEY;
const CLOUDINARY_SECRET = process.env.CLOUDINARY_SECRET;

if (!CLOUDINARY_NAME || !CLOUDINARY_KEY || !CLOUDINARY_SECRET) {
  console.error('❌ Missing required environment variables');
  console.error('Required: CLOUDINARY_NAME, CLOUDINARY_KEY, CLOUDINARY_SECRET');
  process.exit(1);
}

// Create base64 auth header
const auth = Buffer.from(`${CLOUDINARY_KEY}:${CLOUDINARY_SECRET}`).toString('base64');

// Configure axios for Cloudinary API
const cloudinaryApi = axios.create({
  baseURL: `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}`,
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  }
});

// Project folder mapping
const PROJECT_FOLDERS = [
  'agricola', 'buhn', 'butler', 'dineen', 'gunther', 'haythorne', 
  'hetherington', 'holm', 'jenks', 'krant', 'onota', 'rowntree', 
  'seidman', 'strauss_weinberg', 'turell', 'waller', 'logos'
];

/**
 * Get all folders from Cloudinary
 */
async function getAllFolders() {
  try {
    console.log('🔍 Fetching all Cloudinary folders...');
    const response = await cloudinaryApi.get('/folders/');
    return response.data.folders || [];
  } catch (error) {
    console.error('❌ Error fetching folders:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get folder contents by path
 */
async function getFolderContents(folderPath) {
  try {
    console.log(`🔍 Checking folder: ${folderPath}`);
    const response = await cloudinaryApi.get(`/folders/${folderPath}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`   📁 Folder ${folderPath} does not exist`);
      return null;
    }
    console.error(`❌ Error checking folder ${folderPath}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Create folder in Cloudinary
 */
async function createFolder(folderPath) {
  try {
    console.log(`📁 Creating folder: ${folderPath}`);
    const response = await cloudinaryApi.post('/folders/', {
      name: folderPath
    });
    console.log(`✅ Created folder: ${folderPath}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error creating folder ${folderPath}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Get images in a specific asset folder
 */
async function getImagesInFolder(folderPath) {
  try {
    console.log(`🔍 Getting images in folder: ${folderPath}`);
    const response = await cloudinaryApi.get('/resources/by_asset_folder', {
      params: {
        asset_folder: folderPath,
        max_results: 500
      }
    });
    return response.data.resources || [];
  } catch (error) {
    console.error(`❌ Error getting images in folder ${folderPath}:`, error.response?.data || error.message);
    return [];
  }
}

/**
 * Move image to folder using asset_folder
 */
async function moveImageToFolder(publicId, targetFolder) {
  try {
    console.log(`   📦 Moving ${publicId} to ${targetFolder}`);
    
    // Use form data for the PUT request
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('asset_folder', targetFolder);
    
    const response = await axios.put(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/resources/${publicId}`,
      formData,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          ...formData.getHeaders()
        }
      }
    );
    
    console.log(`   ✅ Moved ${publicId} to ${targetFolder}`);
    return response.data;
  } catch (error) {
    console.error(`   ❌ Failed to move ${publicId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Get all images from ROOT and categorize by project
 */
async function categorizeRootImages() {
  try {
    console.log('🔍 Analyzing ROOT images...');
    
    // Get all images
    const response = await cloudinaryApi.get('/resources/image', {
      params: {
        type: 'upload',
        max_results: 500
      }
    });
    
    const allImages = response.data.resources || [];
    const categorized = {
      byProject: {},
      directUploads: [],
      unmatched: []
    };
    
    allImages.forEach(image => {
      const publicId = image.public_id;
      
      // Skip images already in folders
      if (publicId.includes('/')) {
        if (publicId.startsWith('direct_uploads/')) {
          categorized.directUploads.push(image);
        }
        return;
      }
      
      // Find which project this image belongs to
      let matched = false;
      for (const project of PROJECT_FOLDERS) {
        if (publicId.toLowerCase().startsWith(project.toLowerCase() + '_') || 
            publicId.toLowerCase().startsWith('thumbnail_' + project.toLowerCase() + '_') ||
            publicId.toLowerCase().startsWith('small_' + project.toLowerCase() + '_') ||
            publicId.toLowerCase().startsWith('medium_' + project.toLowerCase() + '_') ||
            publicId.toLowerCase().startsWith('large_' + project.toLowerCase() + '_')) {
          
          if (!categorized.byProject[project]) {
            categorized.byProject[project] = [];
          }
          categorized.byProject[project].push(image);
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        categorized.unmatched.push(image);
      }
    });
    
    return categorized;
  } catch (error) {
    console.error('❌ Error categorizing images:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Ensure folder structure exists
 */
async function ensureFolderStructure() {
  console.log('🏗️  Ensuring folder structure exists...');
  
  const results = {
    created: [],
    existing: [],
    failed: []
  };
  
  // Check/create beckwithbarrow root folder
  let beckwithbarrowExists = await getFolderContents('beckwithbarrow');
  if (!beckwithbarrowExists) {
    const created = await createFolder('beckwithbarrow');
    if (created) {
      results.created.push('beckwithbarrow');
    } else {
      results.failed.push('beckwithbarrow');
      return results;
    }
  } else {
    results.existing.push('beckwithbarrow');
  }
  
  // Check/create project folders
  for (const project of PROJECT_FOLDERS) {
    const folderPath = `beckwithbarrow/${project}`;
    const exists = await getFolderContents(folderPath);
    
    if (!exists) {
      const created = await createFolder(folderPath);
      if (created) {
        results.created.push(folderPath);
      } else {
        results.failed.push(folderPath);
      }
    } else {
      results.existing.push(folderPath);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

/**
 * Reorganize images into proper folder structure
 */
async function reorganizeImages(options = {}) {
  const { dryRun = true, projectFilter = null } = options;
  
  console.log(`🔄 ${dryRun ? 'DRY RUN - ' : ''}Reorganizing images into folder structure`);
  console.log('━'.repeat(80));
  
  const results = {
    moved: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  // Categorize images
  const categorized = await categorizeRootImages();
  if (!categorized) return results;
  
  console.log('📊 Image analysis:');
  console.log(`   📁 Projects found: ${Object.keys(categorized.byProject).length}`);
  console.log(`   🖼️  Direct uploads: ${categorized.directUploads.length}`);
  console.log(`   ❓ Unmatched: ${categorized.unmatched.length}`);
  
  Object.entries(categorized.byProject).forEach(([project, images]) => {
    console.log(`   ${project}: ${images.length} images`);
  });
  
  if (dryRun) {
    console.log('\n🔍 This is a dry run. Use --execute to actually move images.');
    return results;
  }
  
  // Ensure folder structure exists
  const folderResults = await ensureFolderStructure();
  console.log(`\n📁 Folder structure: ${folderResults.created.length} created, ${folderResults.existing.length} existing, ${folderResults.failed.length} failed`);
  
  if (folderResults.failed.length > 0) {
    console.error('❌ Cannot proceed - folder creation failed');
    return results;
  }
  
  // Move images to proper folders
  for (const [project, images] of Object.entries(categorized.byProject)) {
    if (projectFilter && project !== projectFilter) {
      continue;
    }
    
    console.log(`\n📦 Moving ${project} images (${images.length} total)...`);
    const targetFolder = `beckwithbarrow/${project}`;
    
    for (const image of images) {
      try {
        const moved = await moveImageToFolder(image.public_id, targetFolder);
        if (moved) {
          results.moved++;
        } else {
          results.failed++;
          results.errors.push({
            image: image.public_id,
            error: 'Move operation failed'
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`   ❌ Error moving ${image.public_id}:`, error.message);
        results.failed++;
        results.errors.push({
          image: image.public_id,
          error: error.message
        });
      }
    }
  }
  
  return results;
}

/**
 * Clean up duplicate images in direct_uploads
 */
async function cleanupDirectUploads(options = {}) {
  const { dryRun = true, confirm = false } = options;
  
  console.log(`🧹 ${dryRun ? 'DRY RUN - ' : ''}Cleaning up direct_uploads duplicates`);
  console.log('━'.repeat(80));
  
  const results = {
    deleted: 0,
    failed: 0,
    errors: []
  };
  
  try {
    // Get images in direct_uploads folder
    const images = await getImagesInFolder('direct_uploads');
    
    if (images.length === 0) {
      console.log('✅ No images found in direct_uploads folder');
      return results;
    }
    
    console.log(`📋 Found ${images.length} images in direct_uploads folder`);
    
    if (dryRun) {
      console.log('\n🔍 This is a dry run. Use --execute --confirm to actually delete.');
      images.slice(0, 10).forEach((img, i) => {
        console.log(`   ${i + 1}. ${img.public_id}`);
      });
      if (images.length > 10) {
        console.log(`   ... and ${images.length - 10} more`);
      }
      return results;
    }
    
    if (!confirm) {
      console.log('⚠️  Use --confirm to proceed with deletion');
      return results;
    }
    
    // Delete images
    for (const image of images) {
      try {
        await cloudinaryApi.delete(`/resources/image/upload/${encodeURIComponent(image.public_id)}`);
        console.log(`   ✅ Deleted: ${image.public_id}`);
        results.deleted++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`   ❌ Failed to delete ${image.public_id}:`, error.response?.data || error.message);
        results.failed++;
        results.errors.push({
          image: image.public_id,
          error: error.message
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    results.errors.push({ general: error.message });
  }
  
  return results;
}

/**
 * Validate current folder structure
 */
async function validateStructure() {
  console.log('🔍 VALIDATING: Current Cloudinary folder structure');
  console.log('━'.repeat(80));
  
  const validation = {
    folders: {},
    totalImages: 0,
    issues: []
  };
  
  // Check main folder
  const beckwithbarrowFolder = await getFolderContents('beckwithbarrow');
  if (!beckwithbarrowFolder) {
    validation.issues.push('Main beckwithbarrow folder does not exist');
  }
  
  // Check each project folder
  for (const project of PROJECT_FOLDERS) {
    const folderPath = `beckwithbarrow/${project}`;
    const folder = await getFolderContents(folderPath);
    const images = await getImagesInFolder(folderPath);
    
    validation.folders[project] = {
      exists: !!folder,
      imageCount: images.length,
      images: images.map(img => img.public_id)
    };
    
    validation.totalImages += images.length;
    
    console.log(`📁 ${project}: ${folder ? '✅' : '❌'} folder, ${images.length} images`);
  }
  
  // Check for remaining ROOT images
  const categorized = await categorizeRootImages();
  const rootProjectImages = Object.values(categorized.byProject).flat().length;
  const directUploadsCount = categorized.directUploads.length;
  
  console.log(`\n📊 Summary:`);
  console.log(`   📁 Organized images: ${validation.totalImages}`);
  console.log(`   🔄 Root images to organize: ${rootProjectImages}`);
  console.log(`   📦 Direct uploads to clean: ${directUploadsCount}`);
  console.log(`   ❓ Unmatched images: ${categorized.unmatched.length}`);
  
  return validation;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const options = {
    dryRun: !args.includes('--execute'),
    confirm: args.includes('--confirm'),
    project: args.find(arg => arg.startsWith('--project='))?.split('=')[1]
  };
  
  switch (command) {
    case 'validate':
      await validateStructure();
      break;
      
    case 'reorganize':
      const reorganizeResults = await reorganizeImages({
        dryRun: options.dryRun,
        projectFilter: options.project
      });
      
      console.log('\n📊 Reorganization Results:');
      console.log('━'.repeat(50));
      console.log(`✅ Moved: ${reorganizeResults.moved}`);
      console.log(`❌ Failed: ${reorganizeResults.failed}`);
      console.log(`⏩ Skipped: ${reorganizeResults.skipped}`);
      
      if (reorganizeResults.errors.length > 0) {
        console.log('\n❌ Errors:');
        reorganizeResults.errors.slice(0, 5).forEach(error => {
          console.log(`   ${error.image}: ${error.error}`);
        });
        if (reorganizeResults.errors.length > 5) {
          console.log(`   ... and ${reorganizeResults.errors.length - 5} more errors`);
        }
      }
      break;
      
    case 'cleanup':
      const cleanupResults = await cleanupDirectUploads({
        dryRun: options.dryRun,
        confirm: options.confirm
      });
      
      console.log('\n📊 Cleanup Results:');
      console.log('━'.repeat(50));
      console.log(`✅ Deleted: ${cleanupResults.deleted}`);
      console.log(`❌ Failed: ${cleanupResults.failed}`);
      break;
      
    default:
      console.log('📖 Cloudinary Folder Organizer');
      console.log('');
      console.log('Reorganizes images that were incorrectly synced by CloudyDesktop.');
      console.log('Moves images from ROOT into proper beckwithbarrow/project/ structure.');
      console.log('');
      console.log('Usage:');
      console.log('  node cloudinary-folder-organizer.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  validate           - Check current folder structure');
      console.log('  reorganize         - Move ROOT images to proper folders');
      console.log('  cleanup            - Remove duplicate images from direct_uploads');
      console.log('');
      console.log('Options:');
      console.log('  --execute          - Actually perform the actions (default is dry-run)');
      console.log('  --confirm          - Confirm destructive actions');
      console.log('  --project=NAME     - Only process specific project');
      console.log('');
      console.log('Examples:');
      console.log('  node cloudinary-folder-organizer.js validate');
      console.log('  node cloudinary-folder-organizer.js reorganize');
      console.log('  node cloudinary-folder-organizer.js reorganize --execute');
      console.log('  node cloudinary-folder-organizer.js reorganize --project=haythorne --execute');
      console.log('  node cloudinary-folder-organizer.js cleanup --execute --confirm');
      break;
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  reorganizeImages,
  cleanupDirectUploads,
  validateStructure,
  ensureFolderStructure
};
