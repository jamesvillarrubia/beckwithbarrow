#!/usr/bin/env node

/**
 * Clean Null Locale Entries Script
 * 
 * This script removes all entries with null locale, keeping only the proper English locale versions.
 * This should resolve the "locale null not found" errors.
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
 * Get all entries with null locale for a content type
 */
async function getNullLocaleEntries(contentType) {
  try {
    const response = await api.get(`/${contentType}?locale=null&pagination[limit]=1000`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`❌ Error fetching null locale entries for ${contentType}:`, error.response?.data || error.message);
    return [];
  }
}

/**
 * Delete an entry with null locale
 */
async function deleteNullLocaleEntry(contentType, documentId) {
  try {
    await api.delete(`/${contentType}/${documentId}?locale=null`);
    console.log(`   ✅ Deleted null locale entry: ${documentId}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error deleting ${documentId}:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Verify English locale entry exists
 */
async function verifyEnglishLocaleExists(contentType, documentId) {
  try {
    const response = await api.get(`/${contentType}/${documentId}?locale=en`);
    return !!response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return false;
    }
    console.error(`   ⚠️  Error checking English locale for ${documentId}:`, error.response?.status);
    return false;
  }
}

/**
 * Clean null locale entries for a specific content type
 */
async function cleanNullLocaleForContentType(contentType) {
  console.log(`\n🧹 Cleaning null locale entries for ${contentType}...`);
  
  // Get all null locale entries
  const nullEntries = await getNullLocaleEntries(contentType);
  console.log(`   Found ${nullEntries.length} null locale entries`);
  
  if (nullEntries.length === 0) {
    console.log(`   ✅ No null locale entries found for ${contentType}`);
    return { deleted: 0, errors: 0, skipped: 0 };
  }
  
  let deleted = 0;
  let errors = 0;
  let skipped = 0;
  
  for (const entry of nullEntries) {
    const documentId = entry.documentId;
    const title = entry.Title || entry.name || 'Unknown';
    
    console.log(`   🔍 Processing: ${title} (${documentId})`);
    
    // Check if English locale version exists
    const hasEnglishVersion = await verifyEnglishLocaleExists(contentType, documentId);
    
    if (hasEnglishVersion) {
      console.log(`   ✅ English version exists, safe to delete null locale version`);
      
      // Delete the null locale version
      const success = await deleteNullLocaleEntry(contentType, documentId);
      if (success) {
        deleted++;
      } else {
        errors++;
      }
    } else {
      console.log(`   ⚠️  No English version found, skipping deletion (might be orphaned)`);
      skipped++;
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return { deleted, errors, skipped };
}

/**
 * Clean all null locale entries
 */
async function cleanAllNullLocaleEntries() {
  console.log('🧹 Starting to clean all null locale entries...');
  
  const contentTypes = ['projects', 'categories'];
  const summary = {
    totalDeleted: 0,
    totalErrors: 0,
    totalSkipped: 0
  };
  
  for (const contentType of contentTypes) {
    const result = await cleanNullLocaleForContentType(contentType);
    
    summary.totalDeleted += result.deleted;
    summary.totalErrors += result.errors;
    summary.totalSkipped += result.skipped;
    
    console.log(`   📊 ${contentType} summary: ${result.deleted} deleted, ${result.errors} errors, ${result.skipped} skipped`);
  }
  
  console.log('\n📊 Overall Summary:');
  console.log(`   ✅ Total deleted: ${summary.totalDeleted}`);
  console.log(`   ❌ Total errors: ${summary.totalErrors}`);
  console.log(`   ⚠️  Total skipped: ${summary.totalSkipped}`);
  
  if (summary.totalDeleted > 0) {
    console.log('\n🎯 Next steps:');
    console.log('   1. Clear your browser cache and cookies');
    console.log('   2. Log out and back into Strapi admin');
    console.log('   3. Try editing projects again');
    console.log('   4. The "locale null not found" error should be resolved');
  }
  
  return summary;
}

/**
 * Preview what would be deleted (dry run)
 */
async function previewCleanup() {
  console.log('👁️  Preview: What would be deleted...');
  
  const contentTypes = ['projects', 'categories'];
  
  for (const contentType of contentTypes) {
    console.log(`\n📋 ${contentType.toUpperCase()} with null locale:`);
    
    const nullEntries = await getNullLocaleEntries(contentType);
    
    if (nullEntries.length === 0) {
      console.log('   ✅ No null locale entries found');
      continue;
    }
    
    for (const entry of nullEntries) {
      const documentId = entry.documentId;
      const title = entry.Title || entry.name || 'Unknown';
      
      // Check if English version exists
      const hasEnglishVersion = await verifyEnglishLocaleExists(contentType, documentId);
      
      if (hasEnglishVersion) {
        console.log(`   🗑️  WOULD DELETE: ${title} (${documentId}) - English version exists`);
      } else {
        console.log(`   ⚠️  WOULD SKIP: ${title} (${documentId}) - No English version found`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('\n💡 Run with "clean" command to actually perform the cleanup');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🧹 Clean Null Locale Entries Script');
  console.log(`📡 Connected to: ${STRAPI_URL}`);
  console.log('');
  
  switch (command) {
    case 'preview':
      await previewCleanup();
      break;
      
    case 'clean':
      console.log('⚠️  WARNING: This will delete null locale entries!');
      console.log('   Only entries with corresponding English versions will be deleted.');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await cleanAllNullLocaleEntries();
      break;
      
    case 'projects-only':
      console.log('🧹 Cleaning null locale entries for projects only...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      const result = await cleanNullLocaleForContentType('projects');
      console.log(`📊 Projects cleanup: ${result.deleted} deleted, ${result.errors} errors, ${result.skipped} skipped`);
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node clean-null-locale.js <command>');
      console.log('');
      console.log('📋 Commands:');
      console.log('  preview       - Show what would be deleted (safe)');
      console.log('  clean         - Delete all null locale entries with English versions');
      console.log('  projects-only - Clean only project null locale entries');
      console.log('');
      console.log('💡 Examples:');
      console.log('  node clean-null-locale.js preview');
      console.log('  node clean-null-locale.js clean');
      console.log('');
      console.log('🔒 All operations use only REST API calls');
      console.log('⚠️  This will only delete null locale entries that have English versions');
      break;
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getNullLocaleEntries,
  deleteNullLocaleEntry,
  verifyEnglishLocaleExists,
  cleanNullLocaleForContentType,
  cleanAllNullLocaleEntries,
  previewCleanup
};
