#!/usr/bin/env node

/**
 * Compress Large Images Script
 * 
 * This script compresses images that are over 10MB to get them under Cloudinary's
 * 10MB upload limit. It uses ImageMagick to compress images while maintaining
 * reasonable quality.
 * 
 * Features:
 * - Identifies images over 10MB
 * - Compresses JPG/JPEG files with quality optimization
 * - Converts TIF files to JPG with compression
 * - Maintains original aspect ratio
 * - Creates backups before compression
 * - Supports dry-run mode for testing
 * 
 * Usage: node compress-large-images.js [directory_path] [options]
 * Example: node compress-large-images.js /Users/james/Sites/uploads
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TARGET_DIRECTORY = process.argv[2] || '/Users/james/Sites/uploads';
const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n');
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Image file extensions to process
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];

// Statistics tracking
let stats = {
  totalFiles: 0,
  largeFiles: 0,
  compressedFiles: 0,
  errors: 0,
  directoriesScanned: 0
};

/**
 * Check if ImageMagick is available
 */
function checkImageMagick() {
  try {
    execSync('which convert', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if a file is an image
 */
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Create a backup of the original file
 */
function createBackup(filePath) {
  const backupPath = filePath + '.backup';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    if (VERBOSE) {
      console.log(`📦 Created backup: ${backupPath}`);
    }
  }
}

/**
 * Compress a JPG/JPEG file
 */
function compressJpeg(filePath) {
  const tempPath = filePath + '.tmp';
  
  try {
    // Start with high quality and reduce if needed
    let quality = 85;
    let compressed = false;
    
    while (quality > 10 && !compressed) {
      const command = `convert "${filePath}" -quality ${quality} -strip "${tempPath}"`;
      
      if (VERBOSE) {
        console.log(`🔄 Compressing with quality ${quality}...`);
      }
      
      execSync(command, { stdio: 'pipe' });
      
      const newSize = getFileSize(tempPath);
      if (newSize <= MAX_SIZE_BYTES) {
        // Success! Replace original with compressed version
        fs.renameSync(tempPath, filePath);
        compressed = true;
        
        if (VERBOSE) {
          console.log(`✅ Compressed to ${formatFileSize(newSize)} with quality ${quality}`);
        }
      } else {
        // Still too large, reduce quality
        quality -= 10;
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    }
    
    if (!compressed) {
      throw new Error(`Could not compress below ${MAX_SIZE_MB}MB even at quality 10`);
    }
    
    return true;
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}

/**
 * Convert and compress a TIF file to JPG
 */
function convertTifToJpg(filePath) {
  const jpgPath = filePath.replace(/\.tif(f)?$/i, '.jpg');
  const tempPath = jpgPath + '.tmp';
  
  try {
    let quality = 85;
    let scale = 100; // Start with original size
    let compressed = false;
    
    // First try with original size and different qualities
    while (quality > 10 && !compressed) {
      const command = `convert "${filePath}" -quality ${quality} -strip "${tempPath}"`;
      
      if (VERBOSE) {
        console.log(`🔄 Converting TIF to JPG with quality ${quality}...`);
      }
      
      execSync(command, { stdio: 'pipe' });
      
      const newSize = getFileSize(tempPath);
      if (newSize <= MAX_SIZE_BYTES) {
        // Success! Replace original with converted version
        fs.renameSync(tempPath, jpgPath);
        fs.unlinkSync(filePath); // Remove original TIF
        compressed = true;
        
        if (VERBOSE) {
          console.log(`✅ Converted to JPG: ${formatFileSize(newSize)} with quality ${quality}`);
        }
      } else {
        // Still too large, reduce quality
        quality -= 10;
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    }
    
    // If still not compressed, try reducing image size
    if (!compressed) {
      quality = 85; // Reset quality
      scale = 80; // Start reducing size
      
      while (scale >= 20 && !compressed) {
        const command = `convert "${filePath}" -resize ${scale}% -quality ${quality} -strip "${tempPath}"`;
        
        if (VERBOSE) {
          console.log(`🔄 Converting TIF to JPG with ${scale}% size and quality ${quality}...`);
        }
        
        execSync(command, { stdio: 'pipe' });
        
        const newSize = getFileSize(tempPath);
        if (newSize <= MAX_SIZE_BYTES) {
          // Success! Replace original with converted version
          fs.renameSync(tempPath, jpgPath);
          fs.unlinkSync(filePath); // Remove original TIF
          compressed = true;
          
          if (VERBOSE) {
            console.log(`✅ Converted to JPG: ${formatFileSize(newSize)} with ${scale}% size and quality ${quality}`);
          }
        } else {
          // Still too large, reduce size further
          scale -= 10;
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        }
      }
    }
    
    if (!compressed) {
      throw new Error(`Could not convert below ${MAX_SIZE_MB}MB even with size reduction`);
    }
    
    return true;
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}

/**
 * Process a single file
 */
function processFile(filePath) {
  const fileSize = getFileSize(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  if (fileSize <= MAX_SIZE_BYTES) {
    return; // File is already small enough
  }
  
  stats.largeFiles++;
  
  if (VERBOSE) {
    console.log(`\n📸 Processing: ${path.basename(filePath)}`);
    console.log(`   Size: ${formatFileSize(fileSize)}`);
    console.log(`   Type: ${ext}`);
  }
  
  if (DRY_RUN) {
    console.log(`🔍 [DRY RUN] Would compress: ${filePath}`);
    return;
  }
  
  try {
    // Create backup
    createBackup(filePath);
    
    // Process based on file type
    if (ext === '.jpg' || ext === '.jpeg') {
      compressJpeg(filePath);
    } else if (ext === '.tif' || ext === '.tiff') {
      convertTifToJpg(filePath);
    } else if (ext === '.png') {
      // For PNG, convert to JPG with compression
      convertTifToJpg(filePath); // This function works for any format conversion
    } else {
      console.log(`⚠️  Unsupported format: ${ext}`);
      return;
    }
    
    stats.compressedFiles++;
    console.log(`✅ Compressed: ${path.basename(filePath)}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    stats.errors++;
  }
}

/**
 * Recursively scan directory for large images
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
        processFile(itemPath);
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
  console.log('🗜️  Large Images Compression Script');
  console.log('====================================');
  console.log(`📁 Target directory: ${TARGET_DIRECTORY}`);
  console.log(`📏 Max size limit: ${MAX_SIZE_MB}MB`);
  console.log(`🔧 Mode: ${DRY_RUN ? 'DRY RUN (no files will be compressed)' : 'LIVE (files will be compressed)'}`);
  console.log(`📊 Verbose: ${VERBOSE ? 'ON' : 'OFF'}`);
  console.log('');

  // Check if ImageMagick is available
  if (!checkImageMagick()) {
    console.error('❌ ImageMagick is not installed or not in PATH.');
    console.error('   Please install ImageMagick: brew install imagemagick');
    process.exit(1);
  }

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
  
  console.log('\n📊 Compression Complete!');
  console.log('========================');
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📁 Directories scanned: ${stats.directoriesScanned}`);
  console.log(`🖼️  Total image files: ${stats.totalFiles}`);
  console.log(`📏 Large files found: ${stats.largeFiles}`);
  console.log(`🗜️  Files ${DRY_RUN ? 'would be' : ''} compressed: ${stats.compressedFiles}`);
  console.log(`❌ Errors: ${stats.errors}`);
  
  if (DRY_RUN && stats.largeFiles > 0) {
    console.log('\n💡 To actually compress the files, run without --dry-run flag:');
    console.log(`   node ${path.basename(__filename)} ${TARGET_DIRECTORY}`);
  }
  
  if (stats.errors > 0) {
    console.log('\n⚠️  Some errors occurred during compression. Check the output above for details.');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Large Images Compression Script

Usage: node compress-large-images.js [directory] [options]

Arguments:
  directory    Path to directory to scan (default: /Users/james/Sites/uploads)

Options:
  --dry-run, -n    Show what would be compressed without actually compressing
  --verbose, -v    Show detailed information about each file processed
  --help, -h       Show this help message

Examples:
  node compress-large-images.js /path/to/images
  node compress-large-images.js /path/to/images --dry-run
  node compress-large-images.js /path/to/images --verbose

Requirements:
  - ImageMagick must be installed (brew install imagemagick)
  `);
  process.exit(0);
}

// Run the script
main();
