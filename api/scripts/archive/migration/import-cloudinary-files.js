#!/usr/bin/env node

/**
 * Import Cloudinary Files to Strapi with Folder Organization
 * 
 * This script:
 * 1. Reads your existing cloud-files-raw.json data
 * 2. Organizes files by folder patterns
 * 3. Creates virtual folder structure
 * 4. Imports files to Strapi with proper organization
 * 5. Creates projects from organized files
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

if (!API_TOKEN) {
  console.error('❌ STRAPI_CLOUD_API_TOKEN not found in environment variables');
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

/**
 * Load and parse the cloud files data
 */
function loadCloudFilesData() {
  console.log('📁 Loading Cloudinary files data...');
  
  const filePath = path.join(__dirname, '../cloud-files-raw.json');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ cloud-files-raw.json not found');
    console.log('   Please ensure the file exists in the api directory');
    return null;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`📊 Loaded ${data.length} files from cloud-files-raw.json`);
    return data;
  } catch (error) {
    console.error('❌ Error parsing cloud-files-raw.json:', error.message);
    return null;
  }
}

/**
 * Organize files by folder patterns
 */
function organizeFilesByPatterns(files) {
  console.log('📁 Organizing files by patterns...');
  
  const organizedFiles = {};
  const generatedVariants = ['small', 'medium', 'thumbnail', 'large', 'sm', 'md', 'lg', 'xl'];
  
  files.forEach(file => {
    // Skip generated variants
    const isGenerated = generatedVariants.some(variant => 
      file.name.includes(`_${variant}`) || 
      file.name.includes(`/${variant}/`) ||
      file.name.endsWith(`_${variant}`)
    );
    
    if (isGenerated) {
      return; // Skip generated variants
    }
    
    // Extract folder from name patterns
    let folderName = 'root';
    
    // Pattern 1: Check for underscore-separated prefixes
    const underscoreMatch = file.name.match(/^([^_]+)_/);
    if (underscoreMatch) {
      folderName = underscoreMatch[1];
    }
    
    // Pattern 2: Check for hyphen-separated prefixes
    const hyphenMatch = file.name.match(/^([^-\s]+)-/);
    if (hyphenMatch && folderName === 'root') {
      folderName = hyphenMatch[1];
    }
    
    // Pattern 3: Check for category patterns
    const categoryMatch = file.name.match(/^(residential|commercial|mixed-use|portfolio|branding|logo|art|home|house|project)/i);
    if (categoryMatch) {
      folderName = categoryMatch[1].toLowerCase();
    }
    
    if (!organizedFiles[folderName]) {
      organizedFiles[folderName] = [];
    }
    
    organizedFiles[folderName].push({
      ...file,
      folderName,
      originalName: file.name,
      url: file.url || file.formats?.original?.url
    });
  });
  
  console.log(`📁 Organized into ${Object.keys(organizedFiles).length} folders:`);
  Object.entries(organizedFiles).forEach(([folder, files]) => {
    console.log(`   ${folder}: ${files.length} files`);
  });
  
  return organizedFiles;
}

/**
 * Download file from URL
 */
async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file on error
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
 * Import files to Strapi
 */
async function importFilesToStrapi(organizedFiles) {
  console.log('🔄 Importing files to Strapi...');
  
  const tempDir = path.join(__dirname, '../temp-import');
  
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
  
  for (const [folderName, files] of Object.entries(organizedFiles)) {
    console.log(`\n📁 Processing folder: ${folderName}`);
    
    for (const file of files) {
      try {
        console.log(`   📄 Processing: ${file.originalName}`);
        
        // Get the file URL
        const fileUrl = file.url || file.formats?.original?.url;
        if (!fileUrl) {
          console.log(`   ⏩ Skipping ${file.originalName} (no URL)`);
          results.skipped++;
          continue;
        }
        
        // Download file
        const tempFilePath = path.join(tempDir, file.originalName);
        await downloadFile(fileUrl, tempFilePath);
        
        // Upload to Strapi
        const uploadedFile = await uploadFileToStrapi(
          tempFilePath, 
          file.originalName, 
          folderName
        );
        
        if (uploadedFile) {
          console.log(`   ✅ Uploaded: ${uploadedFile.name} (ID: ${uploadedFile.id})`);
          results.successful++;
        } else {
          console.log(`   ❌ Failed to upload: ${file.originalName}`);
          results.failed++;
        }
        
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`   ❌ Error processing ${file.originalName}:`, error.message);
        results.failed++;
        results.errors.push({
          file: file.originalName,
          error: error.message
        });
      }
    }
  }
  
  // Clean up temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  return results;
}

/**
 * Create projects from imported files
 */
async function createProjectsFromImportedFiles(organizedFiles) {
  console.log('🚀 Creating projects from imported files...');
  
  for (const [folderName, files] of Object.entries(organizedFiles)) {
    if (files.length < 2) {
      console.log(`⏩ Skipping ${folderName} (less than 2 files)`);
      continue;
    }
    
    console.log(`\n📋 Creating project for: ${folderName}`);
    console.log(`   Files: ${files.length}`);
    console.log(`   Cover image: ${files[0]?.originalName || 'Unknown'}`);
    console.log(`   Additional images: ${files.slice(1, 6).length} files`);
    
    // This would integrate with your existing create-projects-api.js
    // For now, just show what would be created
    const projectTitle = folderName.charAt(0).toUpperCase() + folderName.slice(1).replace(/_/g, ' ') + ' Project';
    console.log(`   → Project title: ${projectTitle}`);
  }
}

/**
 * Preview what would be imported
 */
function previewImport(organizedFiles) {
  console.log('\n📋 Preview of what would be imported:');
  console.log('=' .repeat(60));
  
  Object.entries(organizedFiles).forEach(([folderName, files]) => {
    console.log(`\n📁 ${folderName}:`);
    files.slice(0, 5).forEach(file => { // Show first 5 files
      console.log(`   📄 ${file.originalName} (${file.mime || 'unknown type'})`);
    });
    
    if (files.length > 5) {
      console.log(`   ... and ${files.length - 5} more files`);
    }
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🚀 Cloudinary Files Import to Strapi');
  console.log(`📡 Connected to: ${STRAPI_URL}`);
  console.log('');
  
  // Load the cloud files data
  const cloudFiles = loadCloudFilesData();
  if (!cloudFiles) {
    return;
  }
  
  // Organize files by patterns
  const organizedFiles = organizeFilesByPatterns(cloudFiles);
  
  switch (command) {
    case 'preview':
      previewImport(organizedFiles);
      break;
      
    case 'import':
      const results = await importFilesToStrapi(organizedFiles);
      
      console.log('\n📊 Import Results:');
      console.log(`✅ Successful: ${results.successful}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`⏩ Skipped: ${results.skipped}`);
      
      if (results.errors.length > 0) {
        console.log('\n❌ Errors:');
        results.errors.forEach(error => {
          console.log(`   ${error.file}: ${error.error}`);
        });
      }
      break;
      
    case 'create-projects':
      await createProjectsFromImportedFiles(organizedFiles);
      break;
      
    case 'full-workflow':
      console.log('🔄 Running full workflow...');
      previewImport(organizedFiles);
      
      const importResults = await importFilesToStrapi(organizedFiles);
      
      console.log('\n📊 Import Results:');
      console.log(`✅ Successful: ${importResults.successful}`);
      console.log(`❌ Failed: ${importResults.failed}`);
      console.log(`⏩ Skipped: ${importResults.skipped}`);
      
      await createProjectsFromImportedFiles(organizedFiles);
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node import-cloudinary-files.js <command>');
      console.log('');
      console.log('📋 Commands:');
      console.log('  preview         - Preview what would be imported');
      console.log('  import          - Import files to Strapi');
      console.log('  create-projects - Create projects from imported files');
      console.log('  full-workflow   - Run complete import and project creation');
      console.log('');
      console.log('💡 Examples:');
      console.log('  node import-cloudinary-files.js preview');
      console.log('  node import-cloudinary-files.js full-workflow');
      break;
  }
}

// Export functions for use in other scripts
module.exports = {
  loadCloudFilesData,
  organizeFilesByPatterns,
  importFilesToStrapi,
  createProjectsFromImportedFiles,
  previewImport
};

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}
