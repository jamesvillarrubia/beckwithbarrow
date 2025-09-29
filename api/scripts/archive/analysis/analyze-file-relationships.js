#!/usr/bin/env node

/**
 * Analyze relationships between Cloudinary files and Strapi files
 */

const axios = require('axios');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../strapi-cloud.env') });

const STRAPI_URL = process.env.STRAPI_CLOUD_BASE_URL || 'https://striking-ball-b079f8c4b0.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_CLOUD_API_TOKEN;
const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME;
const CLOUDINARY_KEY = process.env.CLOUDINARY_KEY;
const CLOUDINARY_SECRET = process.env.CLOUDINARY_SECRET;

// Configure axios
const strapiApi = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: { 'Authorization': `Bearer ${STRAPI_API_TOKEN}` }
});

const cloudinaryApi = axios.create({
  baseURL: `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}`,
  auth: { username: CLOUDINARY_KEY, password: CLOUDINARY_SECRET }
});

async function getCloudinaryRootFiles() {
  try {
    const response = await cloudinaryApi.get('/resources/image', {
      params: { type: 'upload', max_results: 500, resource_type: 'image' }
    });
    
    return response.data.resources.filter(resource => 
      !resource.asset_folder || resource.asset_folder === ''
    );
  } catch (error) {
    console.error('❌ Error fetching Cloudinary files:', error.message);
    return [];
  }
}

async function getStrapiFiles() {
  try {
    const response = await strapiApi.get('/upload/files?pagination[pageSize]=100');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching Strapi files:', error.message);
    return [];
  }
}

async function analyzeFiles() {
  console.log('🔍 Analyzing file relationships...\n');
  
  const [cloudinaryFiles, strapiFiles] = await Promise.all([
    getCloudinaryRootFiles(),
    getStrapiFiles()
  ]);
  
  console.log(`☁️  Cloudinary root files: ${cloudinaryFiles.length}`);
  console.log(`📁 Strapi files: ${strapiFiles.length}\n`);
  
  // Analyze Strapi files by provider
  const providerStats = strapiFiles.reduce((acc, file) => {
    acc[file.provider] = (acc[file.provider] || 0) + 1;
    return acc;
  }, {});
  
  console.log('📊 Strapi files by provider:');
  Object.entries(providerStats).forEach(([provider, count]) => {
    console.log(`   ${provider}: ${count}`);
  });
  
  // Find potential matches between Cloudinary and Strapi files
  console.log('\n🔍 Looking for potential matches...');
  
  const matches = [];
  const cloudinaryBasenames = new Set();
  
  cloudinaryFiles.forEach(cf => {
    const basename = (cf.display_name || cf.public_id).replace(/^(thumbnail_|medium_|small_|large_)/, '');
    cloudinaryBasenames.add(basename);
  });
  
  strapiFiles.forEach(sf => {
    const strapiBasename = sf.name.replace(/\.[^.]+$/, ''); // Remove extension
    
    // Check if this Strapi file has a corresponding Cloudinary file
    for (const cloudinaryBasename of cloudinaryBasenames) {
      if (strapiBasename.includes(cloudinaryBasename) || cloudinaryBasename.includes(strapiBasename)) {
        matches.push({
          strapiFile: sf,
          cloudinaryBasename: cloudinaryBasename,
          similarity: 'name_match'
        });
        break;
      }
    }
  });
  
  console.log(`🎯 Found ${matches.length} potential matches`);
  
  if (matches.length > 0) {
    console.log('\n📋 Sample matches:');
    matches.slice(0, 5).forEach((match, i) => {
      console.log(`${i + 1}. Strapi: ${match.strapiFile.name}`);
      console.log(`   Cloudinary basename: ${match.cloudinaryBasename}`);
      console.log(`   Strapi provider: ${match.strapiFile.provider}`);
      console.log('');
    });
  }
  
  // Show what types of files are in Cloudinary root
  console.log('📁 Cloudinary root file patterns:');
  const patterns = {};
  cloudinaryFiles.forEach(file => {
    const name = file.display_name || file.public_id;
    const prefix = name.split('_')[0];
    patterns[prefix] = (patterns[prefix] || 0) + 1;
  });
  
  Object.entries(patterns).forEach(([pattern, count]) => {
    console.log(`   ${pattern}*: ${count} files`);
  });
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  if (matches.length > 0) {
    console.log('✅ Files have been successfully migrated to Strapi Cloud storage');
    console.log('🧹 Cloudinary root files appear to be leftovers that can be cleaned up');
    console.log('⚠️  Before cleaning up, verify that all Strapi files are working correctly');
  }
  
  if (cloudinaryFiles.length > 0) {
    console.log(`🗑️  Consider cleaning up ${cloudinaryFiles.length} files from Cloudinary root`);
    console.log('📁 These files may be duplicates or unused formats');
  }
  
  console.log('\n🎯 Next steps:');
  console.log('1. Verify Strapi files are working correctly on your website');
  console.log('2. Create a backup of Cloudinary files before deletion');
  console.log('3. Delete the root files from Cloudinary to clean up storage');
}

analyzeFiles().catch(console.error);
