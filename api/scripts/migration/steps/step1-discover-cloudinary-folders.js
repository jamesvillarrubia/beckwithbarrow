/**
 * STEP 1: DISCOVER CLOUDINARY FOLDER STRUCTURE
 * 
 * Discovers all folders in your Cloudinary account and gets asset counts.
 */

const { logStepHeader, logResult, pauseForConfirmation } = require('../utils');

async function discoverCloudinaryFolders(cloudinaryApi, rl) {
  logStepHeader(1, 'DISCOVER CLOUDINARY FOLDER STRUCTURE');
  
  try {
    console.log('🔍 Fetching Cloudinary folder structure...');
    const response = await cloudinaryApi.get('/folders/Project%20Photos');
    const folders = response.data.folders || [];
    
    console.log('🔍 Fetching asset counts for each folder...');
    const cloudinaryFolders = [];
    
    for (const folder of folders) {
      try {
        // Fetch assets in this folder to get count
        const assetsResponse = await cloudinaryApi.get('/resources/by_asset_folder', {
          params: {
            asset_folder: folder.path,
            max_results: 1  // We only need the count, not the actual assets
          }
        });
        
        const assetCount = assetsResponse.data.total_count || 0;
        
        cloudinaryFolders.push({
          name: folder.name,
          path: folder.path,
          assetCount: assetCount
        });
        
        console.log(`   📁 ${folder.name}: ${assetCount} assets`);
      } catch (error) {
        console.log(`   ⚠️  Could not get asset count for ${folder.name}: ${error.message}`);
        cloudinaryFolders.push({
          name: folder.name,
          path: folder.path,
          assetCount: 0
        });
      }
    }
    
    logResult(true, `Found ${cloudinaryFolders.length} Cloudinary folders`);
    
    console.log('\n📂 Cloudinary Folders Summary:');
    cloudinaryFolders.forEach(folder => {
      console.log(`   📁 ${folder.name} (${folder.assetCount} assets)`);
    });
    
    const totalAssets = cloudinaryFolders.reduce((sum, folder) => sum + folder.assetCount, 0);
    console.log(`\n📊 Total assets across all folders: ${totalAssets}`);
    
    await pauseForConfirmation('Review the Cloudinary folder structure above');
    
    return cloudinaryFolders;
    
  } catch (error) {
    logResult(false, 'Failed to discover Cloudinary folders', error.message);
    throw error;
  }
}

module.exports = { discoverCloudinaryFolders };
