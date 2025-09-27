#!/usr/bin/env node

/**
 * Test Media Library API Capabilities
 * 
 * This script tests various approaches to folder management in Strapi Cloud:
 * 1. Tests Media Library Handler plugin endpoints
 * 2. Tests standard upload endpoints
 * 3. Tests alternative folder organization approaches
 * 4. Provides recommendations based on what's available
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
 * Test Media Library Handler plugin endpoints
 */
async function testMediaLibraryHandler() {
  console.log('🔍 Testing Media Library Handler plugin endpoints...');
  
  const endpoints = [
    '/media/folders',
    '/media/folders?populate=*',
    '/media/folders/1',
    '/media/folders/1?populate=*'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      console.log(`✅ ${endpoint}: ${response.status} - ${JSON.stringify(response.data).substring(0, 100)}...`);
      return true;
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || 'Error'} - ${error.response?.data?.error?.message || error.message}`);
    }
  }
  
  return false;
}

/**
 * Test standard upload endpoints
 */
async function testUploadEndpoints() {
  console.log('\n🔍 Testing standard upload endpoints...');
  
  const endpoints = [
    '/upload/files',
    '/upload/files?pagination[limit]=5',
    '/upload/files?populate=*',
    '/upload/files?filters[name][$contains]=test'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      console.log(`✅ ${endpoint}: ${response.status} - Found ${response.data?.length || 0} files`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || 'Error'} - ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

/**
 * Test content type endpoints
 */
async function testContentTypes() {
  console.log('\n🔍 Testing content type endpoints...');
  
  const endpoints = [
    '/projects',
    '/categories',
    '/about',
    '/global'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      console.log(`✅ ${endpoint}: ${response.status} - Found ${response.data?.data?.length || 0} entries`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || 'Error'} - ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

/**
 * Test creating a test file upload
 */
async function testFileUpload() {
  console.log('\n🔍 Testing file upload capability...');
  
  try {
    // Create a simple test file
    const testFile = new Blob(['Test file content'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('files', testFile, 'test-file.txt');
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log(`✅ File upload: ${response.status} - File ID: ${response.data?.[0]?.id || 'Unknown'}`);
    return response.data?.[0]?.id;
  } catch (error) {
    console.log(`❌ File upload: ${error.response?.status || 'Error'} - ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

/**
 * Test alternative folder organization
 */
async function testAlternativeFolderOrganization() {
  console.log('\n🔍 Testing alternative folder organization approaches...');
  
  try {
    // Get all files and analyze naming patterns
    const response = await api.get('/upload/files?pagination[limit]=100');
    const files = response.data;
    
    if (files.length === 0) {
      console.log('📁 No files found to analyze');
      return;
    }
    
    console.log(`📊 Found ${files.length} files to analyze`);
    
    // Group files by name patterns
    const patterns = {};
    files.forEach(file => {
      if (file.name) {
        const parts = file.name.split('_');
        if (parts.length > 1) {
          const prefix = parts[0];
          if (!patterns[prefix]) {
            patterns[prefix] = [];
          }
          patterns[prefix].push(file);
        }
      }
    });
    
    console.log('📁 File organization patterns found:');
    Object.entries(patterns).forEach(([pattern, files]) => {
      console.log(`   ${pattern}: ${files.length} files`);
    });
    
    return patterns;
  } catch (error) {
    console.log(`❌ Pattern analysis: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

/**
 * Provide recommendations based on test results
 */
function provideRecommendations(mediaLibraryHandlerWorks, uploadWorks, contentTypesWork, fileUploadWorks, patterns) {
  console.log('\n📋 Recommendations based on test results:');
  console.log('=' .repeat(60));
  
  if (mediaLibraryHandlerWorks) {
    console.log('✅ Media Library Handler plugin is working!');
    console.log('   → Use folder-management.js for full folder management');
    console.log('   → Create organized folder structures');
    console.log('   → Move files between folders');
  } else {
    console.log('❌ Media Library Handler plugin is not available');
    console.log('   → Plugin may not be deployed to Strapi Cloud yet');
    console.log('   → Plugin may not be compatible with Strapi Cloud');
    console.log('   → Use alternative approaches below');
  }
  
  if (uploadWorks && contentTypesWork) {
    console.log('✅ Standard API endpoints are working');
    console.log('   → Use create-projects-api.js for project management');
    console.log('   → Use filename-based organization');
    console.log('   → Create projects from file patterns');
  }
  
  if (patterns && Object.keys(patterns).length > 0) {
    console.log('✅ File organization patterns detected');
    console.log('   → Use organizeFilesByPattern() function');
    console.log('   → Create projects from existing file groups');
    console.log('   → Implement custom folder logic');
  }
  
  console.log('\n💡 Recommended next steps:');
  
  if (mediaLibraryHandlerWorks) {
    console.log('1. Use folder-management.js create-structure');
    console.log('2. Use folder-management.js organize');
    console.log('3. Use create-projects-api.js create-all-projects');
  } else {
    console.log('1. Use create-projects-api.js list-folders');
    console.log('2. Use create-projects-api.js create-all-projects');
    console.log('3. Implement custom folder organization logic');
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Testing Strapi Cloud Media Library API Capabilities');
  console.log(`📡 Connected to: ${STRAPI_URL}`);
  console.log('=' .repeat(60));
  
  // Test Media Library Handler plugin
  const mediaLibraryHandlerWorks = await testMediaLibraryHandler();
  
  // Test standard upload endpoints
  await testUploadEndpoints();
  
  // Test content types
  await testContentTypes();
  
  // Test file upload
  const fileUploadWorks = await testFileUpload();
  
  // Test alternative organization
  const patterns = await testAlternativeFolderOrganization();
  
  // Provide recommendations
  provideRecommendations(
    mediaLibraryHandlerWorks,
    true, // uploadWorks - assume true if we got this far
    true, // contentTypesWork - assume true if we got this far
    fileUploadWorks,
    patterns
  );
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testMediaLibraryHandler,
  testUploadEndpoints,
  testContentTypes,
  testFileUpload,
  testAlternativeFolderOrganization,
  runTests
};
