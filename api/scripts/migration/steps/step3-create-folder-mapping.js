/**
 * STEP 3: CREATE FOLDER MAPPING
 * 
 * Maps Cloudinary folders to Strapi folders and identifies what needs to be created.
 */

const { logStepHeader, logResult, pauseForConfirmation } = require('../utils');

async function createFolderMapping(cloudinaryFolders, strapiFolders, rl) {
  logStepHeader(3, 'CREATE FOLDER MAPPING');
  
  try {
    console.log('🔗 Creating mapping between Cloudinary and Strapi folders...');
    
    // Create a map of existing Strapi folders by name
    const strapiFolderMap = new Map();
    strapiFolders.forEach(folder => {
      strapiFolderMap.set(folder.name.toLowerCase(), folder);
    });
    
    const folderMapping = new Map();
    
    // Map each Cloudinary folder to Strapi folder
    for (const cloudinaryFolder of cloudinaryFolders) {
      const folderName = cloudinaryFolder.name.toLowerCase();
      const strapiFolder = strapiFolderMap.get(folderName);
      
      if (strapiFolder) {
        // Exact match found
        folderMapping.set(cloudinaryFolder.name, {
          cloudinaryName: cloudinaryFolder.name,
          strapiId: strapiFolder.id,
          strapiName: strapiFolder.name,
          status: 'EXISTS',
          needsUpdate: strapiFolder.name !== cloudinaryFolder.name
        });
        console.log(`   ✅ ${cloudinaryFolder.name} → ${strapiFolder.name} (ID: ${strapiFolder.id})`);
      } else {
        // No exact match found
        folderMapping.set(cloudinaryFolder.name, {
          cloudinaryName: cloudinaryFolder.name,
          strapiId: null,
          strapiName: cloudinaryFolder.name,
          status: 'NEEDS_CREATION',
          needsUpdate: false
        });
        console.log(`   ➕ ${cloudinaryFolder.name} → Needs creation`);
      }
    }
    
    // Summary
    const existingCount = Array.from(folderMapping.values()).filter(m => m.status === 'EXISTS').length;
    const needsCreationCount = Array.from(folderMapping.values()).filter(m => m.status === 'NEEDS_CREATION').length;
    
    console.log('\n📊 Folder Mapping Summary:');
    console.log(`   ✅ Existing folders: ${existingCount}`);
    console.log(`   ➕ Folders to create: ${needsCreationCount}`);
    
    if (needsCreationCount > 0) {
      console.log('\n📁 Folders that need to be created:');
      Array.from(folderMapping.values())
        .filter(m => m.status === 'NEEDS_CREATION')
        .forEach(mapping => {
          console.log(`   📁 ${mapping.cloudinaryName}`);
        });
    }
    
    logResult(true, `Created mapping for ${folderMapping.size} folders`);
    
    await pauseForConfirmation('Review the folder mapping above');
    
    return folderMapping;
    
  } catch (error) {
    logResult(false, 'Failed to create folder mapping', error.message);
    throw error;
  }
}

module.exports = { createFolderMapping };
