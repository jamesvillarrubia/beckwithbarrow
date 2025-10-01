/**
 * STEP 5: VERIFY FOLDER STRUCTURE
 * 
 * Verifies that the folder structure is correct after creation.
 */

const { logStepHeader, logResult, flattenFolderStructure } = require('../utils');

async function verifyFolderStructure(strapiApi, createdFolders, rl) {
  logStepHeader(5, 'VERIFY FOLDER STRUCTURE');
  
  try {
    console.log('🔍 Re-fetching Strapi folder structure to verify changes...');
    const response = await strapiApi.get('/api/media/folders-structure');
    const folders = response.data || [];
    
    const updatedFolders = flattenFolderStructure(folders);
    
    console.log('\n📂 Updated Strapi Folders:');
    updatedFolders.forEach(folder => {
      const parent = folder.parent ? ` (under ${folder.parent})` : ' (root)';
      const isNew = createdFolders.some(created => created.id === folder.id);
      const marker = isNew ? ' 🆕' : '';
      console.log(`   📁 ${folder.name} (ID: ${folder.id})${parent}${marker}`);
    });
    
    const projectPhotosFolder = updatedFolders.find(f => f.id === 147);
    if (projectPhotosFolder) {
      console.log(`\n📂 Project Photos folder children:`);
      const children = updatedFolders.filter(f => f.parentId === 147);
      children.forEach(child => {
        console.log(`   📁 ${child.name} (ID: ${child.id})`);
      });
    }
    
    logResult(true, `Verified ${updatedFolders.length} folders`);
    
  } catch (error) {
    logResult(false, 'Failed to verify folder structure', error.message);
    throw error;
  }
}

module.exports = { verifyFolderStructure };
