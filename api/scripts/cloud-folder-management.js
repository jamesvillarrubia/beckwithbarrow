#!/usr/bin/env node

/**
 * Cloud-Compatible Folder Management
 * 
 * Since the Media Library Handler plugin isn't available on Strapi Cloud,
 * this script provides alternative folder management approaches:
 * 1. Filename-based organization (your existing approach)
 * 2. Custom folder metadata via content types
 * 3. File organization by patterns
 * 4. Project creation from organized files
 */

const axios = require('axios');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../strapi-cloud.env') });

const STRAPI_URL = process.env.STRAPI_CLOUD_BASE_URL || 'https://striking-ball-b079f8c4b0.strapiapp.com';
const API_TOKEN = process.env.STRAPI_CLOUD_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ STRAPI_CLOUD_API_TOKEN not found in environment variables');
  process.exit(1);
}

// Configure axios with default headers
const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Get all media files
 */
async function getAllMediaFiles() {
  try {
    const response = await api.get('/upload/files?pagination[limit]=500');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching media files:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Analyze files and group by patterns
 */
async function analyzeFilePatterns() {
  console.log('🔍 Analyzing file patterns...');
  
  const files = await getAllMediaFiles();
  
  if (files.length === 0) {
    console.log('📁 No media files found');
    return {};
  }
  
  console.log(`📊 Found ${files.length} media files`);
  
  // Group files by various patterns
  const patterns = {
    byPrefix: {},      // agricola_01.jpg -> agricola
    byCategory: {},    // residential_house_01.jpg -> residential
    byProject: {},     // project-name_01.jpg -> project-name
    byDate: {},        // 2024-01-15_photo.jpg -> 2024-01-15
    byType: {}         // photo_01.jpg, video_01.mp4 -> photo, video
  };
  
  files.forEach(file => {
    if (!file.name) return;
    
    const name = file.name.toLowerCase();
    
    // Pattern 1: Prefix before first underscore
    const prefixMatch = name.match(/^([^_]+)_/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      if (!patterns.byPrefix[prefix]) patterns.byPrefix[prefix] = [];
      patterns.byPrefix[prefix].push(file);
    }
    
    // Pattern 2: Category-based (residential, commercial, etc.)
    const categoryMatch = name.match(/^(residential|commercial|mixed-use|portfolio|branding)_/);
    if (categoryMatch) {
      const category = categoryMatch[1];
      if (!patterns.byCategory[category]) patterns.byCategory[category] = [];
      patterns.byCategory[category].push(file);
    }
    
    // Pattern 3: Project-based (hyphenated names)
    const projectMatch = name.match(/^([a-z-]+)_/);
    if (projectMatch) {
      const project = projectMatch[1];
      if (!patterns.byProject[project]) patterns.byProject[project] = [];
      patterns.byProject[project].push(file);
    }
    
    // Pattern 4: Date-based
    const dateMatch = name.match(/^(20\d{2}-\d{2}-\d{2})_/);
    if (dateMatch) {
      const date = dateMatch[1];
      if (!patterns.byDate[date]) patterns.byDate[date] = [];
      patterns.byDate[date].push(file);
    }
    
    // Pattern 5: File type-based
    const typeMatch = name.match(/^(photo|image|video|document|logo)_/);
    if (typeMatch) {
      const type = typeMatch[1];
      if (!patterns.byType[type]) patterns.byType[type] = [];
      patterns.byType[type].push(file);
    }
  });
  
  return patterns;
}

/**
 * Display organized file structure
 */
async function displayFileOrganization() {
  const patterns = await analyzeFilePatterns();
  
  console.log('\n📁 File Organization Analysis:');
  console.log('=' .repeat(60));
  
  // Display by prefix (most common pattern)
  if (Object.keys(patterns.byPrefix).length > 0) {
    console.log('\n🏷️  By Prefix (Project Names):');
    Object.entries(patterns.byPrefix)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([prefix, files]) => {
        console.log(`   ${prefix.padEnd(20)} ${files.length.toString().padStart(3)} files`);
      });
  }
  
  // Display by category
  if (Object.keys(patterns.byCategory).length > 0) {
    console.log('\n📂 By Category:');
    Object.entries(patterns.byCategory)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([category, files]) => {
        console.log(`   ${category.padEnd(20)} ${files.length.toString().padStart(3)} files`);
      });
  }
  
  // Display by type
  if (Object.keys(patterns.byType).length > 0) {
    console.log('\n🎨 By Type:');
    Object.entries(patterns.byType)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([type, files]) => {
        console.log(`   ${type.padEnd(20)} ${files.length.toString().padStart(3)} files`);
      });
  }
  
  return patterns;
}

/**
 * Create virtual folder structure
 */
async function createVirtualFolders() {
  console.log('\n🏗️  Creating virtual folder structure...');
  
  const patterns = await analyzeFilePatterns();
  const virtualFolders = [];
  
  // Create folders based on patterns
  for (const [prefix, files] of Object.entries(patterns.byPrefix)) {
    if (files.length >= 2) { // Only create folders for groups with 2+ files
      virtualFolders.push({
        name: prefix,
        type: 'project',
        fileCount: files.length,
        files: files,
        description: `Project folder for ${prefix} (${files.length} files)`
      });
    }
  }
  
  for (const [category, files] of Object.entries(patterns.byCategory)) {
    if (files.length >= 2) {
      virtualFolders.push({
        name: category,
        type: 'category',
        fileCount: files.length,
        files: files,
        description: `${category} projects (${files.length} files)`
      });
    }
  }
  
  for (const [type, files] of Object.entries(patterns.byType)) {
    if (files.length >= 2) {
      virtualFolders.push({
        name: type,
        type: 'media_type',
        fileCount: files.length,
        files: files,
        description: `${type} files (${files.length} files)`
      });
    }
  }
  
  return virtualFolders;
}

/**
 * Display virtual folder structure
 */
async function displayVirtualFolders() {
  const virtualFolders = await createVirtualFolders();
  
  if (virtualFolders.length === 0) {
    console.log('📁 No virtual folders can be created (need 2+ files per group)');
    return [];
  }
  
  console.log('\n📁 Virtual Folder Structure:');
  console.log('┌─────────────────────────────┬───────────┬──────────┐');
  console.log('│ Folder Name                 │ Type      │ Files    │');
  console.log('├─────────────────────────────┼───────────┼──────────┤');
  
  virtualFolders
    .sort((a, b) => b.fileCount - a.fileCount)
    .forEach(folder => {
      const name = folder.name.padEnd(27);
      const type = folder.type.padEnd(9);
      const count = folder.fileCount.toString().padStart(6);
      console.log(`│ ${name} │ ${type} │ ${count}   │`);
    });
  
  console.log('└─────────────────────────────┴───────────┴──────────┘');
  
  return virtualFolders;
}

/**
 * Create projects from virtual folders
 */
async function createProjectsFromFolders() {
  console.log('\n🚀 Creating projects from virtual folders...');
  
  const virtualFolders = await createVirtualFolders();
  const projectFolders = virtualFolders.filter(f => f.type === 'project');
  
  if (projectFolders.length === 0) {
    console.log('📁 No project folders found to create projects from');
    return;
  }
  
  console.log(`📋 Found ${projectFolders.length} project folders to process`);
  
  for (const folder of projectFolders) {
    console.log(`\n🔍 Processing folder: ${folder.name}`);
    console.log(`   Files: ${folder.fileCount}`);
    console.log(`   Description: ${folder.description}`);
    
    // This would integrate with your existing create-projects-api.js
    // For now, just display what would be created
    console.log(`   → Would create project: "${folder.name.charAt(0).toUpperCase() + folder.name.slice(1)} Project"`);
    console.log(`   → Cover image: ${folder.files[0]?.name || 'Unknown'}`);
    console.log(`   → Additional images: ${folder.files.slice(1, 6).length} files`);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🚀 Cloud-Compatible Folder Management');
  console.log(`📡 Connected to: ${STRAPI_URL}`);
  console.log('');
  
  switch (command) {
    case 'analyze':
      await displayFileOrganization();
      break;
      
    case 'folders':
      await displayVirtualFolders();
      break;
      
    case 'create-projects':
      await createProjectsFromFolders();
      break;
      
    case 'full-workflow':
      console.log('🔄 Running full workflow...');
      await displayFileOrganization();
      await displayVirtualFolders();
      await createProjectsFromFolders();
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node cloud-folder-management.js <command>');
      console.log('');
      console.log('📋 Commands:');
      console.log('  analyze           - Analyze file patterns and organization');
      console.log('  folders           - Display virtual folder structure');
      console.log('  create-projects   - Show what projects would be created');
      console.log('  full-workflow     - Run complete analysis and workflow');
      console.log('');
      console.log('💡 Examples:');
      console.log('  node cloud-folder-management.js analyze');
      console.log('  node cloud-folder-management.js full-workflow');
      break;
  }
}

// Export functions for use in other scripts
module.exports = {
  getAllMediaFiles,
  analyzeFilePatterns,
  displayFileOrganization,
  createVirtualFolders,
  displayVirtualFolders,
  createProjectsFromFolders
};

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}
