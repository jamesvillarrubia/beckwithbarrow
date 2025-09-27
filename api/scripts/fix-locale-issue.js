#!/usr/bin/env node

/**
 * Fix Locale Issue Script
 * 
 * This script fixes the "locale null not found" error by updating all projects
 * with the correct locale information.
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
 * Get all projects
 */
async function getAllProjects() {
  try {
    const response = await api.get('/projects?populate=*');
    return response.data.data;
  } catch (error) {
    console.error('❌ Error fetching projects:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Update a project with locale using documentId
 */
async function updateProjectLocale(project, projectData) {
  try {
    // Use documentId for i18n content
    const documentId = project.documentId;
    
    // Ensure locale is set to 'en' (or whatever your default locale is)
    const updateData = {
      ...projectData,
      locale: 'en'
    };
    
    const response = await api.put(`/projects/${documentId}?locale=en`, {
      data: updateData
    });
    
    console.log(`✅ Updated project ${project.id} (${documentId}): ${projectData.Title || 'Unknown'}`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error updating project ${project.id} (${project.documentId}):`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Check available locales
 */
async function getAvailableLocales() {
  try {
    const response = await api.get('/i18n/locales');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching locales:', error.response?.data || error.message);
    // If i18n endpoint doesn't exist, return default
    return [{ code: 'en', name: 'English', isDefault: true }];
  }
}

/**
 * Fix all projects with locale issues
 */
async function fixAllProjects() {
  console.log('🔧 Starting to fix locale issues for all projects...');
  
  // Get available locales
  const locales = await getAvailableLocales();
  console.log(`📍 Available locales:`, locales.map(l => l.code || l.name || l).join(', '));
  
  // Get default locale
  const defaultLocale = locales.find(l => l.isDefault)?.code || locales[0]?.code || 'en';
  console.log(`🌍 Using default locale: ${defaultLocale}`);
  
  // Get all projects
  const projects = await getAllProjects();
  console.log(`📄 Found ${projects.length} projects to fix`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const project of projects) {
    try {
      // Create update data with current attributes (attributes are at root level)
      const updateData = {
        Title: project.Title,
        description: project.description,
        slug: project.slug,
        locale: defaultLocale,
        publishedAt: project.publishedAt
      };
      
      // Add relations if they exist
      if (project.categories?.data) {
        updateData.categories = project.categories.data.map(cat => cat.id);
      }
      
      if (project.cover?.data) {
        updateData.cover = project.cover.data.id;
      }
      
      if (project.images?.data) {
        updateData.images = project.images.data.map(img => img.id);
      }
      
      const result = await updateProjectLocale(project, updateData);
      if (result) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to process project ${project.id}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Fix Summary:');
  console.log(`   ✅ Successfully fixed: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📄 Total: ${projects.length}`);
  
  if (successCount > 0) {
    console.log('\n🎯 Next steps:');
    console.log('   1. Try editing projects in Strapi admin again');
    console.log('   2. The "locale null not found" error should be resolved');
  }
}

/**
 * Check if i18n is enabled
 */
async function checkI18nStatus() {
  try {
    const response = await api.get('/i18n/locales');
    console.log('✅ i18n plugin is enabled');
    console.log('📍 Available locales:', response.data.map(l => `${l.name} (${l.code})`).join(', '));
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️  i18n plugin is not enabled - this might not be a locale issue');
      return false;
    } else {
      console.error('❌ Error checking i18n status:', error.response?.data || error.message);
      return false;
    }
  }
}

/**
 * Alternative: Update projects without locale (if i18n is disabled)
 */
async function updateProjectsWithoutLocale() {
  console.log('🔧 Updating projects without locale information...');
  
  const projects = await getAllProjects();
  console.log(`📄 Found ${projects.length} projects to update`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const project of projects) {
    try {
      // Create minimal update to refresh the record
      const updateData = {
        Title: project.Title,
        description: project.description,
      };
      
      const response = await api.put(`/projects/${project.id}`, {
        data: updateData
      });
      
      console.log(`✅ Refreshed project ${project.id}: ${project.Title || 'Unknown'}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error updating project ${project.id}:`, error.response?.data || error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Update Summary:');
  console.log(`   ✅ Successfully updated: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🛠️  Fix Locale Issue Script');
  console.log(`📡 Connected to: ${STRAPI_URL}`);
  console.log('');
  
  switch (command) {
    case 'check':
      await checkI18nStatus();
      break;
      
    case 'fix':
      const i18nEnabled = await checkI18nStatus();
      if (i18nEnabled) {
        await fixAllProjects();
      } else {
        await updateProjectsWithoutLocale();
      }
      break;
      
    case 'force-locale':
      await fixAllProjects();
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node fix-locale-issue.js <command>');
      console.log('');
      console.log('📋 Commands:');
      console.log('  check        - Check if i18n is enabled and what locales are available');
      console.log('  fix          - Automatically fix locale issues (recommended)');
      console.log('  force-locale - Force update all projects with locale info');
      console.log('');
      console.log('💡 Examples:');
      console.log('  node fix-locale-issue.js check');
      console.log('  node fix-locale-issue.js fix');
      break;
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getAllProjects,
  updateProjectLocale,
  getAvailableLocales,
  fixAllProjects,
  checkI18nStatus
};
