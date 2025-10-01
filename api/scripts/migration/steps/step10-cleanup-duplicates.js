/**
 * STEP 10: CLEANUP DUPLICATE MEDIA FILES
 * 
 * Removes duplicate media entries from Strapi.
 * This step identifies and removes duplicates based on base names.
 */

const { logStepHeader, logResult } = require('../utils');

async function cleanupDuplicates(strapiApi, rl) {
  logStepHeader(10, 'CLEANUP DUPLICATE MEDIA FILES');
  
  try {
    // Get all media files from Strapi
    console.log('📋 Fetching all media files from Strapi...');
    const response = await strapiApi.get('/api/media/files?pagination[pageSize]=1000');
    const allMedia = response.data.data || [];
    
    console.log(`📊 Found ${allMedia.length} total media files`);
    
    // Group by base name (without suffix)
    const mediaGroups = {};
    allMedia.forEach(media => {
      // Extract base name by removing suffix like _bqzhmj, _axvpco, etc.
      const baseName = media.name.replace(/_[a-z0-9]{6}$/, '');
      
      if (!mediaGroups[baseName]) {
        mediaGroups[baseName] = [];
      }
      mediaGroups[baseName].push(media);
    });
    
    // Find groups with duplicates
    const duplicateGroups = Object.entries(mediaGroups).filter(([baseName, mediaList]) => mediaList.length > 1);
    
    console.log(`🔍 Found ${duplicateGroups.length} groups with duplicates`);
    
    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }
    
    let deletedCount = 0;
    
    for (const [baseName, mediaList] of duplicateGroups) {
      console.log(`\n📁 Processing group: ${baseName}`);
      console.log(`   Found ${mediaList.length} duplicates:`);
      
      // Sort by creation date (keep the oldest/most original)
      mediaList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Keep the first one, delete the rest
      const keepMedia = mediaList[0];
      const deleteMedia = mediaList.slice(1);
      
      console.log(`   ✅ Keeping: ${keepMedia.name} (${keepMedia.width}x${keepMedia.height})`);
      
      for (const media of deleteMedia) {
        console.log(`   🗑️  Deleting: ${media.name} (${media.width}x${media.height})`);
        
        try {
          await strapiApi.delete(`/api/media/files/${media.id}`);
          console.log(`   ✅ Deleted successfully`);
          deletedCount++;
        } catch (error) {
          console.log(`   ❌ Failed to delete: ${error.message}`);
        }
      }
    }
    
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   🗑️  Duplicates deleted: ${deletedCount}`);
    console.log(`   📁 Duplicate groups processed: ${duplicateGroups.length}`);
    
    logResult(true, `Cleaned up ${deletedCount} duplicate media files`);
    
  } catch (error) {
    logResult(false, 'Error during duplicate cleanup', error.message);
    throw error;
  }
}

module.exports = { cleanupDuplicates };
