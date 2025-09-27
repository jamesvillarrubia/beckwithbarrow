#!/usr/bin/env node

/**
 * Find Phantom References Script
 * 
 * This script searches for orphaned references to non-existent document IDs
 * using only REST API calls to help debug the "locale null not found" error.
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
 * Search for a specific document ID across all content types
 */
async function searchForDocumentId(phantomId) {
  console.log(`🔍 Searching for phantom ID: ${phantomId}`);
  
  const contentTypes = ['projects', 'categories', 'upload/files'];
  const results = [];
  
  for (const contentType of contentTypes) {
    try {
      console.log(`   Checking ${contentType}...`);
      
      // Get all entries for this content type
      const response = await api.get(`/${contentType}?populate=*&locale=all&pagination[limit]=1000`);
      const entries = response.data.data || response.data;
      
      console.log(`   Found ${entries.length} entries in ${contentType}`);
      
      // Search through each entry for the phantom ID
      for (const entry of entries) {
        const entryStr = JSON.stringify(entry);
        if (entryStr.includes(phantomId)) {
          results.push({
            contentType,
            entry: entry,
            location: `Found in ${contentType} entry ID ${entry.id}`
          });
          console.log(`   ⚠️  FOUND REFERENCE in ${contentType} entry ID ${entry.id}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error checking ${contentType}:`, error.response?.status || error.message);
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

/**
 * Check for entries with null locale
 */
async function findNullLocaleEntries() {
  console.log('🔍 Searching for entries with null locale...');
  
  const contentTypes = ['projects', 'categories'];
  const nullLocaleEntries = [];
  
  for (const contentType of contentTypes) {
    try {
      console.log(`   Checking ${contentType} for null locale...`);
      
      // Try to get entries with null locale
      const response = await api.get(`/${contentType}?populate=*&locale=null&pagination[limit]=1000`);
      const entries = response.data.data || response.data;
      
      if (entries.length > 0) {
        console.log(`   ⚠️  Found ${entries.length} entries with null locale in ${contentType}`);
        nullLocaleEntries.push(...entries.map(entry => ({ contentType, entry })));
      } else {
        console.log(`   ✅ No null locale entries found in ${contentType}`);
      }
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ✅ No null locale entries found in ${contentType} (404 response)`);
      } else {
        console.log(`   ❌ Error checking ${contentType}:`, error.response?.status || error.message);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return nullLocaleEntries;
}

/**
 * Check all document IDs for consistency
 */
async function checkDocumentIdConsistency() {
  console.log('🔍 Checking document ID consistency across content types...');
  
  const allDocumentIds = new Set();
  const duplicateIds = [];
  const contentTypes = ['projects', 'categories'];
  
  for (const contentType of contentTypes) {
    try {
      console.log(`   Checking ${contentType}...`);
      
      const response = await api.get(`/${contentType}?populate=*&locale=all&pagination[limit]=1000`);
      const entries = response.data.data || response.data;
      
      for (const entry of entries) {
        const docId = entry.documentId;
        if (docId) {
          if (allDocumentIds.has(docId)) {
            duplicateIds.push({ documentId: docId, contentType, entry });
            console.log(`   ⚠️  Duplicate document ID found: ${docId} in ${contentType}`);
          } else {
            allDocumentIds.add(docId);
          }
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error checking ${contentType}:`, error.response?.status || error.message);
    }
  }
  
  console.log(`📊 Total unique document IDs: ${allDocumentIds.size}`);
  console.log(`📊 Duplicate document IDs: ${duplicateIds.length}`);
  
  return { allDocumentIds: Array.from(allDocumentIds), duplicateIds };
}

/**
 * Try to access the phantom ID directly
 */
async function tryAccessPhantomId(phantomId) {
  console.log(`🔍 Attempting direct access to phantom ID: ${phantomId}`);
  
  const contentTypes = ['projects', 'categories'];
  const locales = ['en', 'null', undefined];
  
  for (const contentType of contentTypes) {
    for (const locale of locales) {
      try {
        const localeParam = locale ? `?locale=${locale}` : '';
        const response = await api.get(`/${contentType}/${phantomId}${localeParam}`);
        console.log(`   ✅ Found ${phantomId} in ${contentType} with locale ${locale || 'default'}`);
        console.log(`   Data:`, JSON.stringify(response.data, null, 2));
        return response.data;
      } catch (error) {
        const status = error.response?.status;
        if (status === 404) {
          console.log(`   ❌ ${phantomId} not found in ${contentType} with locale ${locale || 'default'} (404)`);
        } else {
          console.log(`   ❌ Error accessing ${phantomId} in ${contentType}:`, status || error.message);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return null;
}

/**
 * Clear browser/admin cache suggestions
 */
function suggestCacheClearSteps() {
  console.log('\n🧹 Cache Clearing Suggestions:');
  console.log('');
  console.log('1. **Browser Cache**:');
  console.log('   - Hard refresh your Strapi admin (Ctrl+F5 or Cmd+Shift+R)');
  console.log('   - Clear browser cache and cookies for your Strapi domain');
  console.log('   - Try opening Strapi admin in incognito/private mode');
  console.log('');
  console.log('2. **Strapi Admin Cache**:');
  console.log('   - Log out and log back into Strapi admin');
  console.log('   - Close all Strapi admin tabs and reopen');
  console.log('');
  console.log('3. **Local Development**:');
  console.log('   - Restart your local Strapi server if running');
  console.log('   - Clear your local .tmp folder: rm -rf .tmp');
  console.log('');
  console.log('4. **If problem persists**:');
  console.log('   - The issue might be in Strapi Cloud\'s cache');
  console.log('   - Contact Strapi support or wait for cache to expire naturally');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const phantomId = args[1] || 'j0k1l2m3n4o5p6q7r8s9t0u1';
  
  console.log('🕵️  Find Phantom References Script');
  console.log(`📡 Connected to: ${STRAPI_URL}`);
  console.log('');
  
  switch (command) {
    case 'search':
      const results = await searchForDocumentId(phantomId);
      if (results.length === 0) {
        console.log(`\n✅ No references to ${phantomId} found in current data`);
        console.log('This suggests the reference is in cache or orphaned relations');
        suggestCacheClearSteps();
      } else {
        console.log(`\n⚠️  Found ${results.length} references to ${phantomId}:`);
        results.forEach(result => {
          console.log(`   - ${result.location}`);
        });
      }
      break;
      
    case 'null-locale':
      const nullEntries = await findNullLocaleEntries();
      if (nullEntries.length === 0) {
        console.log('\n✅ No entries with null locale found');
      } else {
        console.log(`\n⚠️  Found ${nullEntries.length} entries with null locale:`);
        nullEntries.forEach(({ contentType, entry }) => {
          console.log(`   - ${contentType}: ${entry.id} (${entry.Title || entry.name || 'Unknown'})`);
        });
      }
      break;
      
    case 'consistency':
      await checkDocumentIdConsistency();
      break;
      
    case 'access':
      await tryAccessPhantomId(phantomId);
      break;
      
    case 'full-scan':
      console.log('🔍 Running full diagnostic scan...\n');
      
      // 1. Search for phantom ID
      console.log('=== SEARCHING FOR PHANTOM ID ===');
      await searchForDocumentId(phantomId);
      
      // 2. Check for null locale entries
      console.log('\n=== CHECKING FOR NULL LOCALE ENTRIES ===');
      await findNullLocaleEntries();
      
      // 3. Check document ID consistency
      console.log('\n=== CHECKING DOCUMENT ID CONSISTENCY ===');
      await checkDocumentIdConsistency();
      
      // 4. Try direct access
      console.log('\n=== ATTEMPTING DIRECT ACCESS ===');
      await tryAccessPhantomId(phantomId);
      
      // 5. Provide suggestions
      suggestCacheClearSteps();
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node find-phantom-references.js <command> [phantom-id]');
      console.log('');
      console.log('📋 Commands:');
      console.log('  search [id]     - Search for references to a specific document ID');
      console.log('  null-locale     - Find entries with null locale');
      console.log('  consistency     - Check document ID consistency');
      console.log('  access [id]     - Try to access phantom ID directly');
      console.log('  full-scan [id]  - Run all diagnostic checks');
      console.log('');
      console.log('💡 Examples:');
      console.log('  node find-phantom-references.js search j0k1l2m3n4o5p6q7r8s9t0u1');
      console.log('  node find-phantom-references.js full-scan j0k1l2m3n4o5p6q7r8s9t0u1');
      console.log('  node find-phantom-references.js null-locale');
      console.log('');
      console.log('🔒 All operations use only REST API calls');
      break;
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  searchForDocumentId,
  findNullLocaleEntries,
  checkDocumentIdConsistency,
  tryAccessPhantomId
};
