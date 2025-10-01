/**
 * STEP 4: CREATE MISSING STRAPI FOLDERS
 * 
 * Creates any missing folders in Strapi to match the Cloudinary structure.
 */

const { logStepHeader, logResult, pauseForConfirmation } = require('../utils');

async function createMissingFolders(strapiApi, folderMapping, dryRun, rl) {
  logStepHeader(4, 'CREATE MISSING STRAPI FOLDERS');
  
  try {
    const needsCreation = Array.from(folderMapping.values()).filter(m => m.status === 'NEEDS_CREATION');
    
    if (needsCreation.length === 0) {
      console.log('✅ No folders need to be created');
      return [];
    }
    
    console.log(`📁 Creating ${needsCreation.length} missing folders under "Project Photos" (ID: 147)...`);
    
    if (dryRun) {
      console.log('🧪 DRY RUN - Would create the following folders:');
      needsCreation.forEach(mapping => {
        console.log(`   📁 ${mapping.cloudinaryName} (under Project Photos)`);
      });
      await pauseForConfirmation('Review the folders that would be created');
      return [];
    }
    
    const createdFolders = [];
    
    for (const mapping of needsCreation) {
      try {
        console.log(`\n   Creating folder: ${mapping.cloudinaryName}`);
        
        const createResponse = await strapiApi.post('/api/media/folders', {
          data: {
            name: mapping.cloudinaryName,
            parent: 147  // Project Photos folder ID
          }
        });
        
        const newFolder = createResponse.data.data;
        createdFolders.push(newFolder);
        
        // Update the mapping with the new folder ID
        mapping.strapiId = newFolder.id;
        mapping.status = 'CREATED';
        
        console.log(`   ✅ Created: ${newFolder.name} (ID: ${newFolder.id})`);
        
      } catch (error) {
        console.log(`   ❌ Failed to create ${mapping.cloudinaryName}: ${error.message}`);
        logResult(false, `Failed to create folder ${mapping.cloudinaryName}`, error.message);
      }
    }
    
    console.log(`\n📊 Folder Creation Summary:`);
    console.log(`   ➕ Created: ${createdFolders.length}`);
    console.log(`   ❌ Failed: ${needsCreation.length - createdFolders.length}`);
    
    logResult(true, `Created ${createdFolders.length} folders`);
    
    return createdFolders;
    
  } catch (error) {
    logResult(false, 'Failed to create missing folders', error.message);
    throw error;
  }
}

module.exports = { createMissingFolders };
