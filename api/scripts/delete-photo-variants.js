#!/usr/bin/env node

/**
 * Delete Photo Variants Script
 * 
 * This script recursively scans a directory and deletes all variants of original photos.
 * It identifies common image variant patterns like thumbnails, small, medium, large versions,
 * and other common naming conventions used by image processing libraries.
 * 
 * Common variant patterns detected:
 * - _thumb, _thumbnail, _small, _medium, _large, _xl
 * - -thumb, -thumbnail, -small, -medium, -large, -xl
 * - .thumb, .thumbnail, .small, .medium, .large, .xl
 * - _t, _s, _m, _l, _xl (abbreviated versions)
 * - Size suffixes like _100x100, _200x200, _300x300, etc.
 * - WebP, AVIF, and other format variants
 * 
 * Usage: node delete-photo-variants.js [directory_path]
 * Example: node delete-photo-variants.js /Users/james/Sites/uploads
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TARGET_DIRECTORY = process.argv[2] || '/Users/james/Sites/uploads';
const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n');
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');

// Common variant patterns to identify and delete
const VARIANT_PATTERNS = [
  // Prefix patterns (most common in this dataset)
  /^large_/i,
  /^medium_/i,
  /^small_/i,
  /^thumbnail_/i,
  
  // Size-based patterns
  /_thumb(?:nail)?(?:s)?$/i,
  /_small$/i,
  /_medium$/i,
  /_large$/i,
  /_xl$/i,
  /_xxl$/i,
  
  // Abbreviated size patterns
  /_t$/i,
  /_s$/i,
  /_m$/i,
  /_l$/i,
  
  // Size dimensions (common sizes)
  /_\d+x\d+$/,
  /_\d+px$/,
  
  // Alternative separators
  /-thumb(?:nail)?(?:s)?$/i,
  /-small$/i,
  /-medium$/i,
  /-large$/i,
  /-xl$/i,
  /-xxl$/i,
  
  // Dot separators
  /\.thumb(?:nail)?(?:s)?$/i,
  /\.small$/i,
  /\.medium$/i,
  /\.large$/i,
  /\.xl$/i,
  /\.xxl$/i,
  
  // Format variants (keep original, delete variants)
  /\.webp$/i,
  /\.avif$/i,
  /\.jpeg$/i, // Often variants of .jpg originals
];

// File extensions to consider as images
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.avif', '.svg'];

// Statistics tracking
let stats = {
  totalFiles: 0,
  variantsFound: 0,
  variantsDeleted: 0,
  errors: 0,
  directoriesScanned: 0
};

/**
 * Check if a file is an image based on its extension
 */
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Check if a filename matches any variant pattern
 */
function isVariant(filename) {
  const basename = path.basename(filename, path.extname(filename));
  return VARIANT_PATTERNS.some(pattern => pattern.test(basename));
}

/**
 * Get the potential original filename for a variant
 */
function getOriginalFilename(variantPath) {
  const dir = path.dirname(variantPath);
  const filename = path.basename(variantPath);
  const ext = path.extname(filename);
  const basename = path.basename(filename, ext);
  
  // Try to find the original by removing variant patterns
  for (const pattern of VARIANT_PATTERNS) {
    let originalBasename;
    
    if (pattern.source.startsWith('^')) {
      // Handle prefix patterns (like ^large_, ^medium_, etc.)
      originalBasename = basename.replace(pattern, '');
    } else {
      // Handle suffix patterns
      originalBasename = basename.replace(pattern, '');
    }
    
    // Only proceed if the basename actually changed (pattern matched)
    if (originalBasename !== basename) {
      const originalFilename = originalBasename + ext;
      const originalPath = path.join(dir, originalFilename);
      
      // Check if the original file exists
      if (fs.existsSync(originalPath)) {
        return originalPath;
      }
    }
  }
  
  return null;
}

/**
 * Recursively scan directory for image variants
 */
function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    stats.directoriesScanned++;
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(itemPath);
      } else if (stat.isFile() && isImageFile(item)) {
        stats.totalFiles++;
        
        if (isVariant(item)) {
          stats.variantsFound++;
          
          // Check if original exists
          const originalPath = getOriginalFilename(itemPath);
          if (originalPath) {
            if (VERBOSE) {
              console.log(`📸 Found variant: ${itemPath}`);
              console.log(`   Original: ${originalPath}`);
            }
            
            if (!DRY_RUN) {
              try {
                fs.unlinkSync(itemPath);
                stats.variantsDeleted++;
                console.log(`🗑️  Deleted: ${itemPath}`);
              } catch (error) {
                console.error(`❌ Error deleting ${itemPath}:`, error.message);
                stats.errors++;
              }
            } else {
              console.log(`🔍 [DRY RUN] Would delete: ${itemPath}`);
            }
          } else {
            if (VERBOSE) {
              console.log(`⚠️  Variant without original: ${itemPath}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error scanning directory ${dirPath}:`, error.message);
    stats.errors++;
  }
}

/**
 * Main execution function
 */
function main() {
  console.log('🔍 Photo Variants Cleanup Script');
  console.log('================================');
  console.log(`📁 Target directory: ${TARGET_DIRECTORY}`);
  console.log(`🔧 Mode: ${DRY_RUN ? 'DRY RUN (no files will be deleted)' : 'LIVE (files will be deleted)'}`);
  console.log(`📊 Verbose: ${VERBOSE ? 'ON' : 'OFF'}`);
  console.log('');

  // Check if target directory exists
  if (!fs.existsSync(TARGET_DIRECTORY)) {
    console.error(`❌ Error: Directory does not exist: ${TARGET_DIRECTORY}`);
    process.exit(1);
  }

  if (!fs.statSync(TARGET_DIRECTORY).isDirectory()) {
    console.error(`❌ Error: Path is not a directory: ${TARGET_DIRECTORY}`);
    process.exit(1);
  }

  console.log('🚀 Starting scan...');
  const startTime = Date.now();
  
  scanDirectory(TARGET_DIRECTORY);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n📊 Scan Complete!');
  console.log('================');
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📁 Directories scanned: ${stats.directoriesScanned}`);
  console.log(`🖼️  Total image files: ${stats.totalFiles}`);
  console.log(`🔍 Variants found: ${stats.variantsFound}`);
  console.log(`🗑️  Variants ${DRY_RUN ? 'would be' : ''} deleted: ${stats.variantsDeleted}`);
  console.log(`❌ Errors: ${stats.errors}`);
  
  if (DRY_RUN && stats.variantsFound > 0) {
    console.log('\n💡 To actually delete the files, run without --dry-run flag:');
    console.log(`   node ${path.basename(__filename)} ${TARGET_DIRECTORY}`);
  }
  
  if (stats.errors > 0) {
    console.log('\n⚠️  Some errors occurred during the scan. Check the output above for details.');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Photo Variants Cleanup Script

Usage: node delete-photo-variants.js [directory] [options]

Arguments:
  directory    Path to directory to scan (default: /Users/james/Sites/uploads)

Options:
  --dry-run, -n    Show what would be deleted without actually deleting
  --verbose, -v    Show detailed information about each file processed
  --help, -h       Show this help message

Examples:
  node delete-photo-variants.js /path/to/images
  node delete-photo-variants.js /path/to/images --dry-run
  node delete-photo-variants.js /path/to/images --verbose
  `);
  process.exit(0);
}

// Run the script
main();
