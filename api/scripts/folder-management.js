#!/usr/bin/env node

/**
 * Strapi Media Library Folder Management API
 * 
 * This script provides comprehensive folder management for Strapi Cloud instances
 * using the Media Library Handler plugin. It handles:
 * 1. Creating folders in the Media Library
 * 2. Listing existing folders
 * 3. Updating folder names and structure
 * 4. Moving files between folders
 * 5. Deleting folders
 * 
 * Prerequisites:
 * - Media Library Handler plugin installed (pnpm add strapi-plugin-media-library-handler)
 * - Plugin enabled in config/plugins.ts
 * - Strapi Cloud credentials configured in strapi-cloud.env
 * - Strapi server restarted after plugin installation
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '../strapi-cloud.env' });

const STRAPI_URL = process.env.STRAPI_CLOUD_BASE_URL || 'https://striking-ball-b079f8c4b0.strapiapp.com';
const API_TOKEN = process.env.STRAPI_CLOUD_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ STRAPI_CLOUD_API_TOKEN not found in environment variables');
  console.log('   Please ensure strapi-cloud.env is configured with your API token');
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
 * Create a new folder in the Media Library
 */
async function createFolder(folderData) {
  try {
    const response = await api.post('/media/folders', {
      data: folderData
    });
    
    console.log(`✅ Folder created successfully!`);
    console.log(`   ID: ${response.data.data.id}`);
    console.log(`   Name: ${response.data.data.attributes.name}`);
    console.log(`   Path: ${response.data.data.attributes.path}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Error creating folder:', error.response?.data || error.message);
    if (error.response?.data?.error?.details?.errors) {
      console.error('   Validation errors:');
      error.response.data.error.details.errors.forEach(err => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
    }
    return null;
  }
}

/**
 * Get all folders in the Media Library
 */
async function getFolders() {
  try {
    const response = await api.get('/media/folders?populate=*');
    return response.data.data;
  } catch (error) {
    console.error('❌ Error fetching folders:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get a specific folder by ID
 */
async function getFolder(folderId) {
  try {
    const response = await api.get(`/media/folders/${folderId}?populate=*`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error fetching folder ${folderId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Update a folder
 */
async function updateFolder(folderId, updateData) {
  try {
    const response = await api.put(`/media/folders/${folderId}`, {
      data: updateData
    });
    
    console.log(`✅ Folder updated successfully!`);
    console.log(`   ID: ${response.data.data.id}`);
    console.log(`   Name: ${response.data.data.attributes.name}`);
    
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error updating folder ${folderId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Delete a folder
 */
async function deleteFolder(folderId) {
  try {
    await api.delete(`/media/folders/${folderId}`);
    console.log(`✅ Folder ${folderId} deleted successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting folder ${folderId}:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Get files in a specific folder
 */
async function getFilesInFolder(folderId) {
  try {
    const response = await api.get(`/upload/files?filters[folder][id][$eq]=${folderId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching files in folder ${folderId}:`, error.response?.data || error.message);
    return [];
  }
}

/**
 * Move a file to a different folder
 */
async function moveFileToFolder(fileId, folderId) {
  try {
    const response = await api.put(`/upload/files/${fileId}`, {
      data: {
        folder: folderId
      }
    });
    
    console.log(`✅ File moved to folder successfully!`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error moving file ${fileId} to folder ${folderId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Create a folder structure for organizing project media
 */
async function createProjectFolderStructure() {
  console.log('🏗️  Creating project folder structure...');
  
  const folderStructure = [
    { name: 'Projects', description: 'Main projects folder' },
    { name: 'Projects/Residential', description: 'Residential architecture projects' },
    { name: 'Projects/Commercial', description: 'Commercial architecture projects' },
    { name: 'Projects/Mixed-Use', description: 'Mixed use development projects' },
    { name: 'Branding', description: 'Company branding and logos' },
    { name: 'Branding/Logos', description: 'Company logos and variations' },
    { name: 'Branding/Stationery', description: 'Business cards, letterheads, etc.' },
    { name: 'Portfolio', description: 'Portfolio and presentation materials' },
    { name: 'Archive', description: 'Archived projects and old materials' }
  ];
  
  const createdFolders = [];
  
  for (const folder of folderStructure) {
    console.log(`📁 Creating folder: ${folder.name}`);
    const result = await createFolder({
      name: folder.name,
      description: folder.description
    });
    
    if (result) {
      createdFolders.push(result);
    }
    
    // Small delay to avoid API rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n✅ Created ${createdFolders.length} folders successfully!`);
  return createdFolders;
}

/**
 * List all folders in a tree structure
 */
async function listFoldersTree() {
  try {
    const folders = await getFolders();
    
    if (folders.length === 0) {
      console.log('📁 No folders found in Media Library');
      return;
    }
    
    console.log('📁 Media Library Folder Structure:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    
    // Group folders by path depth
    const folderMap = new Map();
    folders.forEach(folder => {
      const path = folder.attributes?.path || folder.path || '';
      const depth = path.split('/').length - 1;
      if (!folderMap.has(depth)) {
        folderMap.set(depth, []);
      }
      folderMap.get(depth).push(folder);
    });
    
    // Display folders in tree structure
    for (const [depth, folderList] of folderMap) {
      folderList.forEach(folder => {
        const indent = '  '.repeat(depth);
        const name = folder.attributes?.name || folder.name || 'Unknown';
        const id = folder.id;
        console.log(`│ ${indent}📁 ${name} (ID: ${id})`);
      });
    }
    
    console.log('└─────────────────────────────────────────────────────────────┘');
    
  } catch (error) {
    console.error('❌ Error listing folders:', error.response?.data || error.message);
  }
}

/**
 * Organize existing files into folders based on filename patterns
 */
async function organizeFilesByPattern() {
  console.log('🔄 Organizing files by filename patterns...');
  
  try {
    // Get all files
    const response = await api.get('/upload/files?pagination[limit]=500');
    const allFiles = response.data;
    
    if (allFiles.length === 0) {
      console.log('📁 No files found to organize');
      return;
    }
    
    // Group files by prefix (before first underscore)
    const fileGroups = {};
    allFiles.forEach(file => {
      if (file.name) {
        const parts = file.name.split('_');
        if (parts.length > 1) {
          const folderName = parts[0];
          if (!fileGroups[folderName]) {
            fileGroups[folderName] = [];
          }
          fileGroups[folderName].push(file);
        }
      }
    });
    
    console.log(`📊 Found ${Object.keys(fileGroups).length} file groups to organize`);
    
    // Create folders and move files
    for (const [folderName, files] of Object.entries(fileGroups)) {
      if (files.length < 2) {
        console.log(`⏩ Skipping "${folderName}" (only ${files.length} file)`);
        continue;
      }
      
      console.log(`📁 Creating folder "${folderName}" for ${files.length} files...`);
      
      // Create folder
      const folder = await createFolder({
        name: folderName,
        description: `Auto-organized folder for ${folderName} project files`
      });
      
      if (folder) {
        // Move files to folder
        for (const file of files) {
          await moveFileToFolder(file.id, folder.id);
          await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
        }
        console.log(`✅ Moved ${files.length} files to "${folderName}" folder`);
      }
    }
    
    console.log('✅ File organization complete!');
    
  } catch (error) {
    console.error('❌ Error organizing files:', error.response?.data || error.message);
  }
}

/**
 * Main function to handle command-line arguments
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🚀 Strapi Media Library Folder Management');
  console.log(`📡 Connected to: ${STRAPI_URL}`);
  console.log('');
  
  switch (command) {
    case 'list':
      await listFoldersTree();
      break;
      
    case 'create':
      const folderName = args[1];
      const description = args[2] || '';
      
      if (!folderName) {
        console.error('❌ Usage: create <folder-name> [description]');
        console.log('   Example: create "New Project" "Project media files"');
        break;
      }
      
      await createFolder({
        name: folderName,
        description: description
      });
      break;
      
    case 'create-structure':
      await createProjectFolderStructure();
      break;
      
    case 'organize':
      await organizeFilesByPattern();
      break;
      
    case 'update':
      const updateId = args[1];
      const newName = args[2];
      const newDescription = args[3] || '';
      
      if (!updateId || !newName) {
        console.error('❌ Usage: update <folder-id> <new-name> [new-description]');
        break;
      }
      
      await updateFolder(updateId, {
        name: newName,
        description: newDescription
      });
      break;
      
    case 'delete':
      const deleteId = args[1];
      
      if (!deleteId) {
        console.error('❌ Usage: delete <folder-id>');
        break;
      }
      
      await deleteFolder(deleteId);
      break;
      
    case 'files':
      const folderId = args[1];
      
      if (!folderId) {
        console.error('❌ Usage: files <folder-id>');
        break;
      }
      
      const files = await getFilesInFolder(folderId);
      console.log(`📁 Files in folder ${folderId}:`);
      files.forEach(file => {
        console.log(`   ${file.id}: ${file.name} (${file.mime})`);
      });
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node folder-management.js <command> [args]');
      console.log('');
      console.log('📋 Commands:');
      console.log('  list                    - List all folders in tree structure');
      console.log('  create <name> [desc]    - Create a new folder');
      console.log('  create-structure        - Create organized folder structure');
      console.log('  organize                - Organize existing files by name patterns');
      console.log('  update <id> <name> [desc] - Update folder name/description');
      console.log('  delete <id>            - Delete a folder');
      console.log('  files <id>             - List files in a folder');
      console.log('');
      console.log('💡 Examples:');
      console.log('  node folder-management.js list');
      console.log('  node folder-management.js create "Project Alpha" "Alpha project files"');
      console.log('  node folder-management.js create-structure');
      console.log('  node folder-management.js organize');
      console.log('  node folder-management.js update 1 "Updated Name" "New description"');
      console.log('  node folder-management.js files 1');
      break;
  }
}

// Export functions for use in other scripts
module.exports = {
  createFolder,
  getFolders,
  getFolder,
  updateFolder,
  deleteFolder,
  getFilesInFolder,
  moveFileToFolder,
  createProjectFolderStructure,
  organizeFilesByPattern
};

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}
