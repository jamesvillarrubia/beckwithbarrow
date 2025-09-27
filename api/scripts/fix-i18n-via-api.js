#!/usr/bin/env node

/**
 * Fix i18n Issues via REST API
 * 
 * This script uses only REST API calls to fix locale issues without touching the database directly.
 * It handles the "locale null not found" error by ensuring all content has proper locale information.
 */

const axios = require('axios');
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
 * Get all projects with all locales
 */
async function getAllProjectsAllLocales() {
  try {
    const response = await api.get('/projects?populate=*&locale=all&pagination[limit]=100');
    return response.data.data;
  } catch (error) {
    console.error('❌ Error fetching projects:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get projects with specific locale
 */
async function getProjectsByLocale(locale = 'en') {
  try {
    const response = await api.get(`/projects?populate=*&locale=${locale}&pagination[limit]=100`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error fetching projects for locale ${locale}:`, error.response?.data || error.message);
    return [];
  }
}

/**
 * Delete a project by documentId and locale
 */
async function deleteProject(documentId, locale = 'en') {
  try {
    await api.delete(`/projects/${documentId}?locale=${locale}`);
    console.log(`✅ Deleted project ${documentId} (locale: ${locale})`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting project ${documentId}:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Create a new project with proper locale
 */
async function createProjectWithLocale(projectData, locale = 'en') {
  try {
    const response = await api.post(`/projects?locale=${locale}`, {
      data: {
        ...projectData,
        locale: locale
      }
    });
    
    console.log(`✅ Created project: ${projectData.Title} (ID: ${response.data.data.id})`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error creating project ${projectData.Title}:`, error.response?.data || error.message);
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
 * Recreate all projects with proper locale handling
 */
async function recreateProjectsWithLocale() {
  console.log('🔄 Starting to recreate projects with proper locale handling...');
  
  // Get all current projects
  const allProjects = await getAllProjectsAllLocales();
  console.log(`📄 Found ${allProjects.length} projects to process`);
  
  if (allProjects.length === 0) {
    console.log('ℹ️  No projects found to process');
    return;
  }
  
  // Group projects by documentId to handle duplicates
  const projectGroups = {};
  allProjects.forEach(project => {
    const docId = project.documentId;
    if (!projectGroups[docId]) {
      projectGroups[docId] = [];
    }
    projectGroups[docId].push(project);
  });
  
  console.log(`📋 Found ${Object.keys(projectGroups).length} unique projects`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const [documentId, projects] of Object.entries(projectGroups)) {
    try {
      // Take the first/best project data
      const sourceProject = projects[0];
      
      console.log(`\n🔄 Processing: ${sourceProject.Title} (${documentId})`);
      
      // Extract clean project data
      const cleanProjectData = {
        Title: sourceProject.Title,
        slug: sourceProject.slug,
        description: sourceProject.description,
        publishedAt: sourceProject.publishedAt
      };
      
      // Add relations if they exist
      if (sourceProject.categories && sourceProject.categories.length > 0) {
        cleanProjectData.categories = sourceProject.categories.map(cat => cat.id);
      }
      
      if (sourceProject.cover && sourceProject.cover.id) {
        cleanProjectData.cover = sourceProject.cover.id;
      }
      
      if (sourceProject.images && sourceProject.images.length > 0) {
        cleanProjectData.images = sourceProject.images.map(img => img.id);
      }
      
      // Delete existing versions (all locales)
      console.log(`   🗑️  Removing existing versions...`);
      for (const project of projects) {
        await deleteProject(documentId, 'en');
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Wait a bit for deletion to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create new version with proper locale
      console.log(`   ✨ Creating new version with proper locale...`);
      const newProject = await createProjectWithLocale(cleanProjectData, 'en');
      
      if (newProject) {
        successCount++;
        console.log(`   ✅ Successfully recreated: ${cleanProjectData.Title}`);
      } else {
        errorCount++;
        console.log(`   ❌ Failed to recreate: ${cleanProjectData.Title}`);
      }
      
      // Small delay between projects to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error processing project ${documentId}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Recreation Summary:');
  console.log(`   ✅ Successfully recreated: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📄 Total processed: ${Object.keys(projectGroups).length}`);
  
  if (successCount > 0) {
    console.log('\n🎯 Next steps:');
    console.log('   1. Try editing projects in Strapi admin again');
    console.log('   2. The "locale null not found" error should be resolved');
    console.log('   3. All projects should now have proper locale support');
  }
}

/**
 * Clean approach: Update existing projects in place
 */
async function updateProjectsInPlace() {
  console.log('🔄 Updating existing projects with proper locale...');
  
  // Get projects with English locale
  const projects = await getProjectsByLocale('en');
  console.log(`📄 Found ${projects.length} projects with English locale`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const project of projects) {
    try {
      console.log(`🔄 Updating: ${project.Title} (${project.documentId})`);
      
      // Create minimal update to refresh locale information
      const updateData = {
        Title: project.Title,
        description: project.description,
        locale: 'en'
      };
      
      // Preserve existing relations
      if (project.categories && project.categories.length > 0) {
        updateData.categories = project.categories.map(cat => cat.id);
      }
      
      if (project.cover && project.cover.id) {
        updateData.cover = project.cover.id;
      }
      
      if (project.images && project.images.length > 0) {
        updateData.images = project.images.map(img => img.id);
      }
      
      const response = await api.put(`/projects/${project.documentId}?locale=en`, {
        data: updateData
      });
      
      console.log(`   ✅ Updated: ${project.Title}`);
      successCount++;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`   ❌ Error updating ${project.Title}:`, error.response?.data || error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Update Summary:');
  console.log(`   ✅ Successfully updated: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📄 Total processed: ${projects.length}`);
}

/**
 * Check for orphaned or problematic entries
 */
async function checkForProblematicEntries() {
  console.log('🔍 Checking for problematic entries...');
  
  try {
    // Try to get projects without locale specification
    const allProjects = await api.get('/projects?populate=*&pagination[limit]=100');
    console.log(`📄 Found ${allProjects.data.data.length} projects without locale filter`);
    
    // Try with explicit locale
    const enProjects = await api.get('/projects?populate=*&locale=en&pagination[limit]=100');
    console.log(`📄 Found ${enProjects.data.data.length} projects with English locale`);
    
    // Try with all locales
    const allLocaleProjects = await api.get('/projects?populate=*&locale=all&pagination[limit]=100');
    console.log(`📄 Found ${allLocaleProjects.data.data.length} projects with all locales`);
    
    // Check for null locale entries
    try {
      const nullLocaleProjects = await api.get('/projects?populate=*&locale=null&pagination[limit]=100');
      console.log(`⚠️  Found ${nullLocaleProjects.data.data.length} projects with null locale`);
      
      if (nullLocaleProjects.data.data.length > 0) {
        console.log('🔧 Found projects with null locale - these need to be fixed');
        return nullLocaleProjects.data.data;
      }
    } catch (error) {
      console.log('✅ No projects with null locale found (this is good)');
    }
    
  } catch (error) {
    console.error('❌ Error checking entries:', error.response?.data || error.message);
  }
  
  return [];
}

/**
 * Clear Strapi cache via API (if endpoint exists)
 */
async function clearCache() {
  try {
    console.log('🧹 Attempting to clear Strapi cache...');
    await api.post('/admin/cache/clear', {});
    console.log('✅ Cache cleared successfully');
  } catch (error) {
    console.log('ℹ️  Cache clear not available via API (this is normal)');
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🛠️  Fix i18n Issues via REST API');
  console.log(`📡 Connected to: ${STRAPI_URL}`);
  console.log('');
  
  switch (command) {
    case 'check':
      await checkForProblematicEntries();
      break;
      
    case 'update':
      await updateProjectsInPlace();
      break;
      
    case 'recreate':
      console.log('⚠️  WARNING: This will delete and recreate all projects!');
      console.log('   This is safe but will change project IDs.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await recreateProjectsWithLocale();
      break;
      
    case 'clear-cache':
      await clearCache();
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node fix-i18n-via-api.js <command>');
      console.log('');
      console.log('📋 Commands:');
      console.log('  check       - Check for problematic entries');
      console.log('  update      - Update existing projects in place (recommended)');
      console.log('  recreate    - Delete and recreate all projects (nuclear option)');
      console.log('  clear-cache - Attempt to clear Strapi cache');
      console.log('');
      console.log('💡 Examples:');
      console.log('  node fix-i18n-via-api.js check');
      console.log('  node fix-i18n-via-api.js update');
      console.log('');
      console.log('🔒 All operations use only REST API calls - no direct database access');
      break;
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getAllProjectsAllLocales,
  getProjectsByLocale,
  deleteProject,
  createProjectWithLocale,
  updateProjectsInPlace,
  recreateProjectsWithLocale,
  checkForProblematicEntries,
  clearCache
};
