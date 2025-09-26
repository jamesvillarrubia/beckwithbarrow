#!/usr/bin/env node

/**
 * Proper SQLite Database Import Script
 * 
 * This script properly imports files into Strapi's SQLite database with correct:
 * - document_id format (26 char alphanumeric)
 * - Unix timestamps in milliseconds
 * - File sizes in KB
 * - Proper hash generation
 * - Image dimensions
 * - Folder linking
 * - Formats JSON generation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const imageSize = require('image-size').default;
const sharp = require('sharp');

const UPLOADS_PATH = './data/uploads';
const DB_PATH = './.tmp/data.db';

/**
 * Generate a 26-character document ID like Strapi uses
 */
function generateDocumentId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 26; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate MD5 hash for file content
 */
function generateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

/**
 * Get file MIME type
 */
function getFileMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff'
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Get file size in KB (Strapi format)
 */
function getFileSizeKB(filePath) {
  const stats = fs.statSync(filePath);
  return Math.round((stats.size / 1024) * 100) / 100; // Round to 2 decimal places
}

/**
 * Get current Unix timestamp in milliseconds (Strapi format)
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * Get image dimensions
 */
function getImageDimensions(filePath) {
  try {
    // Read file as buffer first
    const buffer = fs.readFileSync(filePath);
    const dimensions = imageSize(buffer);
    return {
      width: dimensions.width || null,
      height: dimensions.height || null
    };
  } catch (error) {
    console.warn(`⚠️  Could not read dimensions for ${filePath}:`, error.message);
    return { width: null, height: null };
  }
}

/**
 * Copy file from data/uploads to public/uploads with hash and generate thumbnails
 */
async function processImageFile(filePath, strapiHash, ext) {
  // Determine the relative path from data/uploads
  const relativePath = path.relative('./data/uploads', filePath);
  const relativeDir = path.dirname(relativePath);
  
  // Create target directory in public/uploads
  const publicDir = path.join('./public/uploads', relativeDir);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const newFileName = `${strapiHash}${ext}`;
  const newFilePath = path.join(publicDir, newFileName);
  
  // Copy original file to public/uploads with hash
  if (!fs.existsSync(newFilePath)) {
    fs.copyFileSync(filePath, newFilePath);
    console.log(`📄 Copied: ${path.basename(filePath)} → ${newFileName}`);
  }
  
  // Generate thumbnail files
  const formats = [
    { name: 'thumbnail', maxWidth: 245, maxHeight: 156 },
    { name: 'small', maxWidth: 500, maxHeight: 500 },
    { name: 'medium', maxWidth: 750, maxHeight: 750 },
    { name: 'large', maxWidth: 1000, maxHeight: 1000 }
  ];
  
  const generatedFormats = {};
  
  try {
    const image = sharp(newFilePath);
    const metadata = await image.metadata();
    const { width: originalWidth, height: originalHeight } = metadata;
    
    for (const format of formats) {
      // Only create format if original is larger
      if (originalWidth > format.maxWidth || originalHeight > format.maxHeight) {
        const formatFileName = `${format.name}_${strapiHash}${ext}`;
        const formatFilePath = path.join(publicDir, formatFileName);
        
        if (!fs.existsSync(formatFilePath)) {
          // Calculate scaled dimensions maintaining aspect ratio
          const aspectRatio = originalWidth / originalHeight;
          let newWidth, newHeight;
          
          if (aspectRatio > 1) {
            // Landscape
            newWidth = Math.min(format.maxWidth, originalWidth);
            newHeight = Math.round(newWidth / aspectRatio);
          } else {
            // Portrait or square
            newHeight = Math.min(format.maxHeight, originalHeight);
            newWidth = Math.round(newHeight * aspectRatio);
          }
          
          // Generate the thumbnail
          await image
            .resize(newWidth, newHeight, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .toFile(formatFilePath);
          
          // Get file size
          const stats = fs.statSync(formatFilePath);
          const sizeKB = Math.round((stats.size / 1024) * 100) / 100;
          
          generatedFormats[format.name] = {
            name: `${format.name}_${strapiHash.split('_')[0]}`,
            hash: `${format.name}_${strapiHash}`,
            ext: ext,
            mime: `image/${ext.slice(1)}`,
            path: null,
            width: newWidth,
            height: newHeight,
            size: sizeKB,
            sizeInBytes: stats.size,
            url: `/uploads/${relativeDir}/${formatFileName}`
          };
          
          console.log(`🖼️  Generated ${format.name}: ${formatFileName} (${newWidth}x${newHeight})`);
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not generate thumbnails for ${newFilePath}:`, error.message);
  }
  
  return {
    newFilePath,
    generatedFormats: Object.keys(generatedFormats).length > 0 ? JSON.stringify(generatedFormats) : null
  };
}

/**
 * Generate formats JSON like Strapi does
 */
function generateFormatsJSON(originalHash, ext, mime, originalWidth, originalHeight, originalSize) {
  if (!originalWidth || !originalHeight) {
    return null; // No formats for files without dimensions
  }
  
  const formats = {};
  
  // Define format sizes (Strapi defaults)
  const formatSizes = [
    { name: 'thumbnail', maxWidth: 245, maxHeight: 156 },
    { name: 'small', maxWidth: 500, maxHeight: 500 },
    { name: 'medium', maxWidth: 750, maxHeight: 750 },
    { name: 'large', maxWidth: 1000, maxHeight: 1000 }
  ];
  
  for (const format of formatSizes) {
    // Only create format if original is larger than format size
    if (originalWidth > format.maxWidth || originalHeight > format.maxHeight) {
      // Calculate scaled dimensions maintaining aspect ratio
      const aspectRatio = originalWidth / originalHeight;
      let newWidth, newHeight;
      
      if (aspectRatio > 1) {
        // Landscape
        newWidth = Math.min(format.maxWidth, originalWidth);
        newHeight = Math.round(newWidth / aspectRatio);
      } else {
        // Portrait or square
        newHeight = Math.min(format.maxHeight, originalHeight);
        newWidth = Math.round(newHeight * aspectRatio);
      }
      
      // Estimate size (rough calculation)
      const sizeRatio = (newWidth * newHeight) / (originalWidth * originalHeight);
      const estimatedSize = Math.round(originalSize * sizeRatio * 100) / 100;
      const estimatedSizeBytes = Math.round(estimatedSize * 1024);
      
      formats[format.name] = {
        name: `${format.name}_${originalHash.split('_')[0]}`,
        hash: `${format.name}_${originalHash}`,
        ext: ext,
        mime: mime,
        path: null,
        width: newWidth,
        height: newHeight,
        size: estimatedSize,
        sizeInBytes: estimatedSizeBytes,
        url: `/uploads/${format.name}_${originalHash}${ext}`
      };
    }
  }
  
  return Object.keys(formats).length > 0 ? JSON.stringify(formats) : null;
}

/**
 * Get folder information from database
 */
function getFolderMap() {
  try {
    const query = `SELECT id, name, path FROM upload_folders;`;
    const result = execSync(`sqlite3 -json "${DB_PATH}" "${query}"`, { stdio: 'pipe' }).toString();
    const folders = JSON.parse(result);
    
    const folderMap = {};
    folders.forEach(folder => {
      folderMap[folder.name] = {
        id: folder.id,
        path: folder.path
      };
    });
    
    return folderMap;
  } catch (error) {
    console.error('❌ Error reading folder map:', error.message);
    return {};
  }
}

/**
 * Scan files in uploads directory
 */
function scanFiles() {
  const files = [];
  
  function walkDirectory(dirPath, folderName = null) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        walkDirectory(itemPath, item);
      } else if (stat.isFile() && /\.(jpg|jpeg|png|gif|webp|svg|tiff|tif)$/i.test(item)) {
        files.push({
          filePath: itemPath,
          fileName: item,
          folderName: folderName,
          relativePath: path.relative(UPLOADS_PATH, itemPath)
        });
      }
    }
  }
  
  walkDirectory(UPLOADS_PATH);
  return files;
}

/**
 * Generate file metadata for database insertion
 */
function generateFileMetadata(fileInfo, folderMap) {
  const { filePath, fileName, folderName } = fileInfo;
  
  // Get folder information
  const folder = folderName ? folderMap[folderName] : null;
  
  // Generate basic metadata
  const documentId = generateDocumentId();
  const hash = generateFileHash(filePath);
  const ext = path.extname(fileName);
  const nameWithoutExt = path.basename(fileName, ext);
  const mime = getFileMimeType(filePath);
  const sizeKB = getFileSizeKB(filePath);
  const timestamp = getCurrentTimestamp();
  const dimensions = getImageDimensions(filePath);
  
  // Generate Strapi-style hash (filename + random hash)
  const strapiHash = `${nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_')}_${hash.substring(0, 10)}`;
  
  // Generate URL based on folder
  const url = folder 
    ? `/uploads/${folderName}/${strapiHash}${ext}`
    : `/uploads/${strapiHash}${ext}`;
  
  // Generate formats JSON
  const formats = generateFormatsJSON(strapiHash, ext, mime, dimensions.width, dimensions.height, sizeKB);
  
  const metadata = {
    document_id: documentId,
    name: nameWithoutExt,
    alternative_text: `An image uploaded to Strapi called ${nameWithoutExt}`,
    caption: nameWithoutExt,
    width: dimensions.width,
    height: dimensions.height,
    formats: formats,
    hash: strapiHash,
    ext: ext,
    mime: mime,
    size: sizeKB,
    url: url,
    preview_url: null,
    provider: 'local',
    provider_metadata: null,
    folder_path: folder ? folder.path : '/',
    created_at: timestamp,
    updated_at: timestamp,
    published_at: timestamp,
    created_by_id: 1,
    updated_by_id: 1,
    locale: null,
    // Additional info for linking
    folder_id: folder ? folder.id : null,
    original_path: filePath
  };
  
  return metadata;
}

/**
 * Insert file metadata into database
 */
function insertFileIntoDatabase(metadata) {
  try {
    // Escape single quotes in strings for SQL
    const escapeString = (str) => str ? str.replace(/'/g, "''") : '';
    
    const sql = `
      INSERT INTO files (
        document_id, name, alternative_text, caption, width, height, formats,
        hash, ext, mime, size, url, preview_url, provider, provider_metadata,
        folder_path, created_at, updated_at, published_at, created_by_id, updated_by_id, locale
      ) VALUES (
        '${escapeString(metadata.document_id)}',
        '${escapeString(metadata.name)}',
        '${escapeString(metadata.alternative_text)}',
        '${escapeString(metadata.caption)}',
        ${metadata.width || 'NULL'},
        ${metadata.height || 'NULL'},
        ${metadata.formats ? `'${escapeString(metadata.formats)}'` : 'NULL'},
        '${escapeString(metadata.hash)}',
        '${escapeString(metadata.ext)}',
        '${escapeString(metadata.mime)}',
        ${metadata.size},
        '${escapeString(metadata.url)}',
        ${metadata.preview_url ? `'${escapeString(metadata.preview_url)}'` : 'NULL'},
        '${escapeString(metadata.provider)}',
        ${metadata.provider_metadata ? `'${escapeString(metadata.provider_metadata)}'` : 'NULL'},
        '${escapeString(metadata.folder_path)}',
        ${metadata.created_at},
        ${metadata.updated_at},
        ${metadata.published_at},
        ${metadata.created_by_id},
        ${metadata.updated_by_id},
        ${metadata.locale ? `'${escapeString(metadata.locale)}'` : 'NULL'}
      );
    `;
    
    execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { stdio: 'pipe' });
    
    // Get the inserted file ID
    const getIdSql = `SELECT id FROM files WHERE document_id = '${escapeString(metadata.document_id)}';`;
    const fileId = execSync(`sqlite3 "${DB_PATH}" "${getIdSql}"`, { stdio: 'pipe' }).toString().trim();
    
    return parseInt(fileId, 10);
  } catch (error) {
    console.error(`❌ Error inserting file ${metadata.name}:`, error.message);
    return null;
  }
}

/**
 * Link file to folder in files_folder_lnk table
 */
function linkFileToFolder(fileId, folderId) {
  if (!fileId || !folderId) {
    return false;
  }
  
  try {
    const sql = `
      INSERT INTO files_folder_lnk (file_id, folder_id, file_ord)
      VALUES (${fileId}, ${folderId}, 1);
    `;
    
    execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`❌ Error linking file ${fileId} to folder ${folderId}:`, error.message);
    return false;
  }
}

/**
 * Check if file already exists in database
 */
function fileExistsInDatabase(hash) {
  try {
    const query = `SELECT COUNT(*) FROM files WHERE hash = '${hash.replace(/'/g, "''")}';`;
    const result = execSync(`sqlite3 "${DB_PATH}" "${query}"`, { stdio: 'pipe' }).toString().trim();
    return parseInt(result, 10) > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Import a single file into database
 */
async function importSingleFile(fileInfo, folderMap) {
  const metadata = generateFileMetadata(fileInfo, folderMap);
  
  // Check if file already exists
  if (fileExistsInDatabase(metadata.hash)) {
    console.log(`⚠️  File already exists: ${metadata.name}`);
    return { success: false, reason: 'exists' };
  }
  
  // Process the image file (rename and generate thumbnails)
  const { newFilePath, generatedFormats } = await processImageFile(
    fileInfo.filePath, 
    metadata.hash, 
    metadata.ext
  );
  
  // Update metadata with processed file info
  metadata.url = metadata.url; // Keep the same URL structure
  if (generatedFormats) {
    metadata.formats = generatedFormats;
  }
  
  // Insert file into database
  const fileId = insertFileIntoDatabase(metadata);
  if (!fileId) {
    return { success: false, reason: 'insert_failed' };
  }
  
  // Link to folder if applicable
  if (metadata.folder_id) {
    const linked = linkFileToFolder(fileId, metadata.folder_id);
    if (!linked) {
      console.log(`⚠️  Failed to link file to folder: ${metadata.name}`);
    }
  }
  
  return { 
    success: true, 
    fileId: fileId,
    metadata: metadata 
  };
}

/**
 * Filter files based on criteria
 */
function filterFiles(files, options = {}) {
  let filteredFiles = [...files];
  
  // Filter by path pattern
  if (options.pathPattern) {
    const pattern = new RegExp(options.pathPattern, 'i');
    filteredFiles = filteredFiles.filter(file => 
      pattern.test(file.relativePath) || pattern.test(file.folderName || '')
    );
    console.log(`📁 Path filter '${options.pathPattern}' matched ${filteredFiles.length} files`);
  }
  
  // Filter by specific folder
  if (options.folder) {
    filteredFiles = filteredFiles.filter(file => 
      file.folderName === options.folder
    );
    console.log(`📁 Folder filter '${options.folder}' matched ${filteredFiles.length} files`);
  }
  
  // Limit number of files
  if (options.limit && options.limit > 0) {
    filteredFiles = filteredFiles.slice(0, options.limit);
    console.log(`📊 Limited to first ${options.limit} files`);
  }
  
  return filteredFiles;
}

/**
 * Import all files into database
 */
async function importAllFiles(dryRun = false, options = {}) {
  console.log(`🔍 ${dryRun ? 'DRY RUN - ' : ''}Importing files into database...`);
  
  const folderMap = getFolderMap();
  const allFiles = scanFiles();
  
  // Apply filters
  const files = filterFiles(allFiles, options);
  
  console.log(`📄 Found ${allFiles.length} total files`);
  console.log(`📄 Processing ${files.length} files after filters`);
  console.log(`📁 Found ${Object.keys(folderMap).length} folders`);
  
  if (dryRun) {
    console.log('\n🧪 DRY RUN - No changes will be made to database');
  }
  
  // Show which files will be processed if limited
  if (options.limit || options.pathPattern || options.folder) {
    console.log('\n📋 Files to be processed:');
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.relativePath} ${file.folderName ? `(folder: ${file.folderName})` : ''}`);
    });
    console.log('');
  }
  
  let successCount = 0;
  let existsCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < files.length; i++) {
    const fileInfo = files[i];
    
    if (dryRun) {
      // Just generate metadata for dry run
      const metadata = generateFileMetadata(fileInfo, folderMap);
      console.log(`📄 [${i+1}/${files.length}] Would import: ${fileInfo.relativePath} -> ${metadata.url}`);
      successCount++;
    } else {
      // Actually import
      const result = await importSingleFile(fileInfo, folderMap);
      
      if (result.success) {
        console.log(`✅ [${i+1}/${files.length}] Imported: ${fileInfo.relativePath} (ID: ${result.fileId})`);
        successCount++;
      } else if (result.reason === 'exists') {
        existsCount++;
      } else {
        console.log(`❌ [${i+1}/${files.length}] Failed: ${fileInfo.relativePath}`);
        errorCount++;
      }
    }
  }
  
  console.log('\n📋 Import Summary:');
  console.log(`   Successful: ${successCount}`);
  console.log(`   Already exists: ${existsCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Total: ${files.length}`);
  
  if (!dryRun && successCount > 0) {
    console.log('\n🎯 Next steps:');
    console.log('   1. Restart your Strapi server');
    console.log('   2. Check Media Library in Strapi admin');
    console.log('   3. Files should be organized in their folders');
  }
}

/**
 * Main function to test our metadata generation
 */
function testMetadataGeneration() {
  console.log('🔍 Scanning files in uploads directory...');
  
  const folderMap = getFolderMap();
  console.log(`📁 Found ${Object.keys(folderMap).length} folders:`, Object.keys(folderMap).join(', '));
  
  const files = scanFiles();
  console.log(`📄 Found ${files.length} files to process`);
  
  // Test with first 3 files
  const testFiles = files.slice(0, 3);
  
  console.log('\n🧪 Testing metadata generation:');
  for (const fileInfo of testFiles) {
    const metadata = generateFileMetadata(fileInfo, folderMap);
    console.log(`\n📄 File: ${fileInfo.relativePath}`);
    console.log(`   - Document ID: ${metadata.document_id}`);
    console.log(`   - Name: ${metadata.name}`);
    console.log(`   - Hash: ${metadata.hash}`);
    console.log(`   - URL: ${metadata.url}`);
    console.log(`   - Size: ${metadata.size} KB`);
    console.log(`   - Dimensions: ${metadata.width}x${metadata.height}`);
    console.log(`   - MIME: ${metadata.mime}`);
    console.log(`   - Formats: ${metadata.formats ? 'Generated' : 'None'}`);
    console.log(`   - Folder: ${fileInfo.folderName || 'root'}`);
    console.log(`   - Folder Path: ${metadata.folder_path}`);
    console.log(`   - Timestamp: ${metadata.created_at}`);
  }
  
  console.log('\n✅ Metadata generation test complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. ✅ Image dimensions - DONE');
  console.log('   2. ✅ Formats JSON - DONE');
  console.log('   3. Insert into database');
  console.log('   4. Create folder links');
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {};
  let command = args[0];
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[i + 1], 10);
      i++; // Skip next arg
    } else if (arg === '--folder' && i + 1 < args.length) {
      options.folder = args[i + 1];
      i++; // Skip next arg
    } else if (arg === '--path' && i + 1 < args.length) {
      options.pathPattern = args[i + 1];
      i++; // Skip next arg
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--folder=')) {
      options.folder = arg.split('=')[1];
    } else if (arg.startsWith('--path=')) {
      options.pathPattern = arg.split('=')[1];
    }
  }
  
  return { command, options };
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const { command, options } = parseArgs(args);
  
  (async () => {
    switch (command) {
      case 'test':
        testMetadataGeneration();
        break;
      case 'dry-run':
        await importAllFiles(true, options);
        break;
      case 'import':
        await importAllFiles(false, options);
        break;
    case 'list':
      // List files that would be processed
      const folderMap = getFolderMap();
      const allFiles = scanFiles();
      const filteredFiles = filterFiles(allFiles, options);
      
      console.log('📋 Files that would be processed:');
      filteredFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.relativePath} ${file.folderName ? `(folder: ${file.folderName})` : '(root)'}`);
      });
      console.log(`\n📊 Total: ${filteredFiles.length} files`);
      break;
    default:
      console.log('📋 Proper SQLite Database Import Script');
      console.log('');
      console.log('Usage:');
      console.log('  node proper-db-import.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  test      - Test metadata generation');
      console.log('  dry-run   - Dry run (no changes)');
      console.log('  import    - Actually import files');
      console.log('  list      - List files that would be processed');
      console.log('');
      console.log('Options:');
      console.log('  --limit <number>    - Limit number of files to process');
      console.log('  --folder <name>     - Only process files from specific folder');
      console.log('  --path <pattern>    - Filter files by path pattern (regex)');
      console.log('');
      console.log('Examples:');
      console.log('  node proper-db-import.js list --limit 10');
      console.log('  node proper-db-import.js dry-run --folder agricola');
      console.log('  node proper-db-import.js import --path "jenks.*jpg" --limit 5');
      console.log('  node proper-db-import.js import --limit 50');
      console.log('');
      console.log('⚠️  Make sure to backup your database before running import!');
        break;
    }
  })().catch(console.error);
}

module.exports = {
  generateDocumentId,
  generateFileHash,
  getFileMimeType,
  getFileSizeKB,
  getCurrentTimestamp,
  getFolderMap,
  scanFiles,
  generateFileMetadata
};
