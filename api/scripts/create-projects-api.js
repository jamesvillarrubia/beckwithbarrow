#!/usr/bin/env node

/**
 * Create Projects via Strapi Cloud API
 * 
 * This script demonstrates how to create projects in your Strapi Cloud instance
 * using the REST API. It handles:
 * 1. Authentication with API tokens
 * 2. Creating projects with all required fields
 * 3. Linking media files and categories
 * 4. Publishing/draft management
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
 * Get all available categories
 */
async function getCategories() {
  try {
    const response = await api.get('/categories?locale=en');
    return response.data.data;
  } catch (error) {
    console.error('❌ Error fetching categories:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Create a category with proper locale handling
 */
async function createCategory(categoryData, locale = 'en') {
  try {
    const response = await api.post(`/categories?locale=${locale}`, {
      data: {
        ...categoryData,
        locale: locale,
        publishedAt: new Date().toISOString()
      }
    });
    
    console.log(`✅ Category created: ${categoryData.name}`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error creating category ${categoryData.name}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Get all available media files
 */
async function getMediaFiles(folderName = null) {
  try {
    let url = '/upload/files?populate=folder';
    if (folderName) {
      url += `&filters[folder][name][$eq]=${folderName}`;
    }
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching media files:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get media files by folder name (using name pattern since folder API isn't available)
 */
async function getMediaByFolder(folderName) {
  try {
    // Since folder filtering isn't working, get all files and filter by name pattern
    const response = await api.get('/upload/files?pagination[limit]=500');
    const allFiles = response.data;
    
    // Filter files that start with the folder name pattern
    const folderFiles = allFiles.filter(file => 
      file.name && file.name.toLowerCase().startsWith(folderName.toLowerCase() + '_')
    );
    
    return folderFiles;
  } catch (error) {
    console.error(`❌ Error fetching media for folder "${folderName}":`, error.response?.data || error.message);
    return [];
  }
}

/**
 * Create a new project with proper locale handling
 */
async function createProject(projectData, locale = 'en') {
  try {
    const response = await api.post(`/projects?locale=${locale}`, {
      data: {
        ...projectData,
        locale: locale
      }
    });
    
    console.log('✅ Project created successfully!');
    console.log(`   ID: ${response.data.data.id}`);
    console.log(`   Title: ${response.data.data.Title || response.data.data.attributes?.Title || 'Unknown'}`);
    console.log(`   Slug: ${response.data.data.slug || response.data.data.attributes?.slug || 'Unknown'}`);
    console.log(`   Locale: ${locale}`);
    console.log(`   Published: ${response.data.data.publishedAt || response.data.data.attributes?.publishedAt ? 'Yes' : 'No (Draft)'}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Error creating project:', error.response?.data || error.message);
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
 * Update an existing project
 */
async function updateProject(projectId, projectData) {
  try {
    const response = await api.put(`/projects/${projectId}`, {
      data: projectData
    });
    
    console.log('✅ Project updated successfully!');
    return response.data.data;
  } catch (error) {
    console.error('❌ Error updating project:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Get all projects
 */
async function getProjects() {
  try {
    const response = await api.get('/projects?populate=*');
    return response.data.data;
  } catch (error) {
    console.error('❌ Error fetching projects:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Delete a project
 */
async function deleteProject(projectId) {
  try {
    await api.delete(`/projects/${projectId}`);
    console.log(`✅ Project ${projectId} deleted successfully!`);
    return true;
  } catch (error) {
    console.error('❌ Error deleting project:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Create a sample project with media from a specific folder
 */
async function createSampleProject(folderName, projectTitle) {
  console.log(`🔍 Creating project "${projectTitle}" with media from "${folderName}" folder...`);
  
  // Get categories
  const categories = await getCategories();
  console.log(`📁 Found ${categories.length} categories`);
  
  // Get media files from the specified folder
  const mediaFiles = await getMediaByFolder(folderName);
  console.log(`🖼️  Found ${mediaFiles.length} media files in "${folderName}" folder`);
  
  if (mediaFiles.length === 0) {
    console.log('⚠️  No media files found in the specified folder');
    return null;
  }
  
  // Select cover image (first image) and additional images
  const coverImage = mediaFiles[0];
  const additionalImages = mediaFiles.slice(1, Math.min(6, mediaFiles.length)); // Up to 5 additional images
  
  // Select a random category if available
  const selectedCategory = categories.length > 0 ? categories[Math.floor(Math.random() * categories.length)] : null;
  
  const projectData = {
    Title: projectTitle,
    description: `A beautiful ${folderName} project showcasing architectural excellence and design innovation. This project demonstrates our commitment to creating spaces that blend functionality with aesthetic appeal.`,
    cover: coverImage.id,
    images: additionalImages.map(img => img.id),
    categories: selectedCategory ? [selectedCategory.id] : [],
    publishedAt: new Date().toISOString() // Publish immediately
  };
  
  console.log(`📋 Project data prepared:`);
  console.log(`   Title: ${projectData.Title}`);
  console.log(`   Description: ${projectData.description.substring(0, 100)}...`);
  console.log(`   Cover image: ${coverImage.name}`);
  console.log(`   Additional images: ${additionalImages.length}`);
  console.log(`   Categories: ${selectedCategory ? (selectedCategory.attributes?.name || selectedCategory.name || 'Unknown') : 'None'}`);
  
  return await createProject(projectData, 'en');
}

/**
 * List all available folders and their media counts (based on filename patterns)
 */
async function listFoldersAndMedia() {
  try {
    // Get all files and group by prefix
    const response = await api.get('/upload/files?pagination[limit]=500');
    const allFiles = response.data;
    
    // Group files by their prefix (before the first underscore)
    const folderGroups = {};
    
    allFiles.forEach(file => {
      if (file.name) {
        const parts = file.name.split('_');
        if (parts.length > 1) {
          const folderName = parts[0];
          if (!folderGroups[folderName]) {
            folderGroups[folderName] = [];
          }
          folderGroups[folderName].push(file);
        }
      }
    });
    
    console.log('📁 Available project folders (based on filename patterns):');
    console.log('┌─────────────────────────────┬───────────┐');
    console.log('│ Folder Name                 │ Media     │');
    console.log('├─────────────────────────────┼───────────┤');
    
    // Sort folder names alphabetically
    const sortedFolders = Object.keys(folderGroups).sort();
    
    for (const folderName of sortedFolders) {
      const mediaCount = folderGroups[folderName].length;
      const paddedName = folderName.padEnd(27);
      const countStr = mediaCount.toString().padStart(7);
      console.log(`│ ${paddedName} │ ${countStr}   │`);
    }
    
    console.log('└─────────────────────────────┴───────────┘');
    
    return sortedFolders.map(name => ({ name, count: folderGroups[name].length }));
  } catch (error) {
    console.error('❌ Error listing folders:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Main function to demonstrate usage
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🚀 Strapi Cloud Projects API Tool');
  console.log(`📡 Connected to: ${STRAPI_URL}`);
  console.log('');
  
  switch (command) {
    case 'list-folders':
      await listFoldersAndMedia();
      break;
      
    case 'list-projects':
      const projects = await getProjects();
      console.log(`📋 Found ${projects.length} projects:`);
      projects.forEach(project => {
        const title = project.attributes?.Title || project.Title || 'Unknown';
        const published = project.attributes?.publishedAt || project.publishedAt;
        console.log(`   ${project.id}: ${title} (${published ? 'Published' : 'Draft'})`);
      });
      break;
      
    case 'list-categories':
      const categories = await getCategories();
      console.log(`📁 Found ${categories.length} categories:`);
      categories.forEach(category => {
        const name = category.attributes?.name || category.name || 'Unknown';
        console.log(`   ${category.id}: ${name}`);
      });
      break;
      
    case 'create-categories':
      console.log('🏗️  Creating basic categories...');
      const basicCategories = [
        { name: 'Residential', slug: 'residential', description: 'Residential architecture projects' },
        { name: 'Commercial', slug: 'commercial', description: 'Commercial architecture projects' },
        { name: 'Mixed Use', slug: 'mixed-use', description: 'Mixed use development projects' }
      ];
      
      for (const catData of basicCategories) {
        await createCategory(catData, 'en');
      }
      console.log('✅ Basic categories created!');
      break;
      
    case 'create-test':
      const testFolder = args[1] || 'agricola';
      const testTitle = args[2] || 'Test Agricola Project';
      console.log(`🧪 Creating test project "${testTitle}" from folder "${testFolder}"...`);
      await createSampleProject(testFolder, testTitle);
      break;
      
    case 'create-sample':
      const folderName = args[1];
      const projectTitle = args[2];
      
      if (!folderName || !projectTitle) {
        console.error('❌ Usage: create-sample <folder-name> <project-title>');
        console.log('   Example: create-sample agricola "Agricola Residence"');
        break;
      }
      
      await createSampleProject(folderName, projectTitle);
      break;
      
    case 'create-all-projects':
      console.log('🏗️  Creating projects for all eligible folders...');
      const allFolders = await listFoldersAndMedia();
      const existingProjects = await getProjects();
      const existingProjectTitles = new Set(existingProjects.map(p => p.Title || p.attributes?.Title));

      const foldersToSkip = ['logo', 'logos', 'freedman', 'o5a']; // Skip branding and single-image folders

      for (const folder of allFolders) {
        let projectTitle = folder.name.charAt(0).toUpperCase() + folder.name.slice(1).replace(/_/g, ' ') + ' Project';
        
        // Custom titles for specific folders
        if (folder.name === 'jenks') projectTitle = 'Jenks Family Residence';
        if (folder.name === 'agricola') projectTitle = 'Agricola Modern House';
        if (folder.name === 'waller') projectTitle = 'Waller House';
        if (folder.name === 'buhn') projectTitle = 'Buhn Residence';
        if (folder.name === 'butler') projectTitle = 'Butler House';
        if (folder.name === 'dineen') projectTitle = 'Dineen Family Home';
        if (folder.name === 'gunther') projectTitle = 'Gunther Residence';
        if (folder.name === 'haythorne') projectTitle = 'Haythorne House';
        if (folder.name === 'hetherington') projectTitle = 'Hetherington Estate';
        if (folder.name === 'holm') projectTitle = 'Holm Residence';
        if (folder.name === 'krant') projectTitle = 'Krant House';
        if (folder.name === 'onota') projectTitle = 'Onota Lake House';
        if (folder.name === 'rowntree') projectTitle = 'Rowntree Residence';
        if (folder.name === 'seidman') projectTitle = 'Seidman House';
        if (folder.name === 'strauss') projectTitle = 'Strauss Weinberg Project';
        if (folder.name === 'turell') projectTitle = 'Turell Residence';
        if (folder.name === 'other') projectTitle = 'Mixed Portfolio';

        if (foldersToSkip.includes(folder.name.toLowerCase())) {
          console.log(`⏩ Skipping folder "${folder.name}" (branding or single image).`);
          continue;
        }

        if (existingProjectTitles.has(projectTitle)) {
          console.log(`⏩ Project "${projectTitle}" already exists. Skipping.`);
          continue;
        }

        console.log(`\n🔍 Creating project "${projectTitle}" with media from "${folder.name}" folder...`);
        await createSampleProject(folder.name, projectTitle);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay to avoid API rate limits
      }
      console.log('\n✅ All eligible projects created!');
      break;
      
    case 'create-custom':
      // Interactive project creation
      console.log('🛠️  Custom project creation not implemented yet');
      console.log('   Use create-sample for now, or modify the script');
      break;
      
    case 'delete':
      const projectId = args[1];
      if (!projectId) {
        console.error('❌ Usage: delete <project-id>');
        break;
      }
      await deleteProject(projectId);
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node create-projects-api.js <command> [args]');
      console.log('');
      console.log('📋 Commands:');
      console.log('  list-folders              - List all available media folders');
      console.log('  list-projects             - List all existing projects');
      console.log('  list-categories           - List all available categories');
      console.log('  create-categories         - Create basic categories (Residential, Commercial, Mixed Use)');
      console.log('  create-test [folder] [title] - Create a single test project (default: agricola)');
      console.log('  create-sample <folder> <title> - Create a project using media from folder');
      console.log('  create-all-projects       - Create projects for all eligible folders with images');
      console.log('  delete <project-id>       - Delete a project by ID');
      console.log('');
      console.log('💡 Examples:');
      console.log('  node create-projects-api.js list-folders');
      console.log('  node create-projects-api.js create-sample agricola "Agricola Modern Residence"');
      console.log('  node create-projects-api.js create-sample jenks "Jenks Family Home"');
      console.log('  node create-projects-api.js list-projects');
      console.log('  node create-projects-api.js delete 1');
      break;
  }
}

// Export functions for use in other scripts
module.exports = {
  createProject,
  updateProject,
  getProjects,
  deleteProject,
  getCategories,
  getMediaFiles,
  getMediaByFolder,
  createSampleProject,
  listFoldersAndMedia
};

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}
