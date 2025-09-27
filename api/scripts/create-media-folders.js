#!/usr/bin/env node

/**
 * Create Media Library Folders
 * 
 * This script creates actual folders in the Strapi Media Library
 * using the Media Library Handler plugin API endpoints.
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

// Configure axios for Strapi API
const strapiApi = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Create a folder in the Media Library
 */
async function createMediaFolder(folderName, description = '') {
  try {
    console.log(`📁 Creating folder: ${folderName}`);
    
    const response = await strapiApi.post('/media/folders', {
      data: {
        name: folderName,
        description: description
      }
    });
    
    console.log(`✅ Created folder: ${folderName} (ID: ${response.data.data.id})`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error creating folder ${folderName}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Get all existing folders
 */
async function getExistingFolders() {
  try {
    const response = await strapiApi.get('/media/folders');
    return response.data.data || [];
  } catch (error) {
    console.error('❌ Error fetching existing folders:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Create all project folders
 */
async function createAllProjectFolders() {
  console.log('🚀 Creating Media Library folders for all projects...');
  console.log(`📡 Connected to: ${STRAPI_URL}`);
  console.log('');
  
  // First, check if the Media Library Handler plugin is working
  console.log('🔍 Testing Media Library Handler plugin...');
  const existingFolders = await getExistingFolders();
  
  if (existingFolders.length === 0 && !existingFolders) {
    console.log('❌ Media Library Handler plugin is not working or not installed');
    console.log('   The /api/media/folders endpoint is not available');
    console.log('');
    console.log('💡 Solutions:');
    console.log('   1. Install the plugin: pnpm add strapi-plugin-media-library-handler');
    console.log('   2. Restart Strapi server: pnpm dev');
    console.log('   3. Ensure plugin is enabled in config/plugins.ts with kebab-case name');
    console.log('   4. Plugin name should be "media-library-handler" not "mediaLibraryHandler"');
    return;
  }
  
  console.log(`📁 Found ${existingFolders.length} existing folders`);
  
  // Define the folders to create based on your project names
  const projectFolders = [
    { name: 'Agricola Modern House', description: 'Agricola Modern House project files' },
    { name: 'Jenks Family Residence', description: 'Jenks Family Residence project files' },
    { name: 'Holm Residence', description: 'Holm Residence project files' },
    { name: 'Haythorne House', description: 'Haythorne House project files' },
    { name: 'Gunther Residence', description: 'Gunther Residence project files' },
    { name: 'Strauss Weinberg Project', description: 'Strauss Weinberg Project files' },
    { name: 'Seidman House', description: 'Seidman House project files' },
    { name: 'Rowntree Residence', description: 'Rowntree Residence project files' },
    { name: 'Krant House', description: 'Krant House project files' },
    { name: 'Waller House', description: 'Waller House project files' },
    { name: 'Dineen Family Home', description: 'Dineen Family Home project files' },
    { name: 'Butler House', description: 'Butler House project files' },
    { name: 'Turell Residence', description: 'Turell Residence project files' },
    { name: 'Mixed Portfolio', description: 'Mixed Portfolio project files' },
    { name: 'Hetherington Estate', description: 'Hetherington Estate project files' },
    { name: 'Onota Lake House', description: 'Onota Lake House project files' },
    { name: 'Buhn Residence', description: 'Buhn Residence project files' },
    { name: 'Branding', description: 'Company branding and logo files' },
    { name: 'Archives', description: 'Archived project files' }
  ];
  
  const createdFolders = [];
  const existingFolderNames = existingFolders.map(f => f.attributes?.name || f.name);
  
  for (const folder of projectFolders) {
    // Check if folder already exists
    if (existingFolderNames.includes(folder.name)) {
      console.log(`⏩ Folder "${folder.name}" already exists. Skipping.`);
      continue;
    }
    
    const createdFolder = await createMediaFolder(folder.name, folder.description);
    if (createdFolder) {
      createdFolders.push(createdFolder);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n✅ Created ${createdFolders.length} new folders`);
  
  // List all folders
  const allFolders = await getExistingFolders();
  console.log('\n📁 All Media Library folders:');
  allFolders.forEach(folder => {
    const name = folder.attributes?.name || folder.name || 'Unknown';
    const id = folder.id;
    console.log(`   ${id}: ${name}`);
  });
}

/**
 * List all folders
 */
async function listAllFolders() {
  console.log('📁 Listing all Media Library folders...');
  
  const folders = await getExistingFolders();
  
  if (folders.length === 0) {
    console.log('📁 No folders found in Media Library');
    return;
  }
  
  console.log(`📁 Found ${folders.length} folders:`);
  folders.forEach(folder => {
    const name = folder.attributes?.name || folder.name || 'Unknown';
    const id = folder.id;
    const description = folder.attributes?.description || folder.description || '';
    console.log(`   ${id}: ${name}${description ? ` - ${description}` : ''}`);
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'create':
      await createAllProjectFolders();
      break;
      
    case 'list':
      await listAllFolders();
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node create-media-folders.js <command>');
      console.log('');
      console.log('📋 Commands:');
      console.log('  create    - Create all project folders in Media Library');
      console.log('  list      - List all existing folders');
      console.log('');
      console.log('💡 Examples:');
      console.log('  node create-media-folders.js create');
      console.log('  node create-media-folders.js list');
      break;
  }
}

// Export functions for use in other scripts
module.exports = {
  createMediaFolder,
  getExistingFolders,
  createAllProjectFolders,
  listAllFolders
};

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}
