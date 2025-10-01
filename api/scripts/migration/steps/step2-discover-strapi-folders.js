/**
 * STEP 2: DISCOVER STRAPI FOLDER STRUCTURE
 * 
 * Discovers existing folders in Strapi media library.
 */

const { logStepHeader, logResult, pauseForConfirmation, flattenFolderStructure } = require('../utils');

async function discoverStrapiFolders(strapiApi, rl) {
  logStepHeader(2, 'DISCOVER STRAPI FOLDER STRUCTURE');
  
  try {
    console.log('🔍 Fetching Strapi folder structure...');
    const response = await strapiApi.get('/api/media/folders-structure');
    const folders = response.data || [];
    
    // Flatten the folder structure for easier processing
    const strapiFolders = flattenFolderStructure(folders);
    
    logResult(true, `Found ${strapiFolders.length} Strapi folders`);
    
    console.log('\n📂 Strapi Folders:');
    strapiFolders.forEach(folder => {
      const parent = folder.parent ? ` (under ${folder.parent})` : ' (root)';
      console.log(`   📁 ${folder.name} (ID: ${folder.id})${parent}`);
    });
    
    await pauseForConfirmation('Review the Strapi folder structure above');
    
    return strapiFolders;
    
  } catch (error) {
    logResult(false, 'Failed to discover Strapi folders', error.message);
    throw error;
  }
}

module.exports = { discoverStrapiFolders };
