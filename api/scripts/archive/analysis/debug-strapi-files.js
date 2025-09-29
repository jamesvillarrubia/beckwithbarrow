#!/usr/bin/env node

/**
 * Debug script to examine Strapi files and understand the data structure
 */

const axios = require('axios');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../strapi-cloud.env') });

const STRAPI_URL = process.env.STRAPI_CLOUD_BASE_URL || 'https://striking-ball-b079f8c4b0.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_CLOUD_API_TOKEN;

// Configure axios for Strapi API
const strapiApi = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`
  }
});

async function debugStrapiFiles() {
  try {
    console.log('🔍 Fetching Strapi media files...');
    
    const response = await strapiApi.get('/upload/files?pagination[pageSize]=50');
    const files = response.data;
    
    console.log(`📄 Found ${files.length} total files in Strapi`);
    
    // Show first few files with their structure
    console.log('\n📋 Sample file structures:');
    files.slice(0, 5).forEach((file, i) => {
      console.log(`\n${i + 1}. File ID: ${file.id}`);
      console.log(`   Name: ${file.name}`);
      console.log(`   URL: ${file.url}`);
      console.log(`   Provider: ${file.provider}`);
      console.log(`   Provider Metadata:`, file.provider_metadata);
      console.log(`   Folder:`, file.folder);
      console.log(`   Formats:`, Object.keys(file.formats || {}));
    });
    
    // Filter Cloudinary files
    const cloudinaryFiles = files.filter(file => 
      file.provider === 'cloudinary' && 
      file.url && 
      file.url.includes('cloudinary.com')
    );
    
    console.log(`\n☁️  Cloudinary files: ${cloudinaryFiles.length}`);
    
    // Show Cloudinary file details
    cloudinaryFiles.slice(0, 3).forEach((file, i) => {
      console.log(`\n${i + 1}. Cloudinary File:`);
      console.log(`   Name: ${file.name}`);
      console.log(`   URL: ${file.url}`);
      console.log(`   Provider Metadata:`, file.provider_metadata);
      console.log(`   Has folder:`, !!file.folder);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugStrapiFiles().catch(console.error);
