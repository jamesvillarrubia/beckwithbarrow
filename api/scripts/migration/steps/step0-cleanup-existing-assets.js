/**
 * STEP 0: CLEANUP EXISTING STRAPI ASSETS
 * 
 * Optional cleanup step to remove all existing media files from Strapi.
 * Use this when you want to start fresh.
 */

const { logStepHeader, logResult, pauseForConfirmation } = require('../utils');

async function cleanupExistingAssets(strapiApi, dryRun, rl) {
  logStepHeader(0, 'CLEANUP EXISTING STRAPI ASSETS');
  
  try {
    console.log('🔍 Fetching all existing Strapi media files...');
    
    // Get all media files
    const response = await strapiApi.get('/api/media/files', {
      params: {
        'pagination[pageSize]': 1000  // Get all files
      }
    });
    
    const files = response.data || [];
    console.log(`📁 Found ${files.length} existing media files`);
    
    if (files.length === 0) {
      console.log('✅ No existing media files to clean up');
      await pauseForConfirmation('No cleanup needed');
      return;
    }
    
    console.log('\n📂 Existing Media Files:');
    files.forEach(file => {
      console.log(`   📄 ${file.name} (ID: ${file.id}) - ${file.provider || 'local'}`);
    });
    
    if (dryRun) {
      console.log('\n🧪 DRY RUN - Would delete the following files:');
      files.forEach(file => {
        console.log(`   🗑️  ${file.name} (ID: ${file.id})`);
      });
      await pauseForConfirmation('Review the files that would be deleted');
      return;
    }
    
    console.log('\n🗑️  Deleting existing media files...');
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const file of files) {
      try {
        await strapiApi.delete(`/api/media/files/${file.id}`);
        console.log(`   ✅ Deleted: ${file.name} (ID: ${file.id})`);
        deletedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to delete ${file.name}: ${error.message}`);
        failedCount++;
      }
    }
    
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   🗑️  Deleted: ${deletedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    
    logResult(true, `Cleanup complete: ${deletedCount} files deleted`);
    
  } catch (error) {
    logResult(false, 'Failed to cleanup existing assets', error.message);
    throw error;
  }
}

module.exports = { cleanupExistingAssets };
