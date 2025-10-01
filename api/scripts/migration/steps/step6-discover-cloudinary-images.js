/**
 * STEP 6: DISCOVER CLOUDINARY IMAGES
 * 
 * Discovers all images in Cloudinary and extracts metadata.
 */

const { logStepHeader, logResult, pauseForConfirmation } = require('../utils');

async function discoverCloudinaryImages(cloudinaryApi, rl) {
  logStepHeader(6, 'DISCOVER CLOUDINARY IMAGES');
  
  try {
    console.log('🔍 Fetching all images from Cloudinary...');
    const cloudinaryImages = [];
    
    // Get all images at once
    const response = await cloudinaryApi.get('/resources/image', {
      params: {
        type: 'upload',
        max_results: 1000  // Get all images
      }
    });
    
    const allImages = response.data.resources || [];
    console.log(`   📸 Found ${allImages.length} total images in Cloudinary`);
    
    // Filter images by folder
    for (const image of allImages) {
      if (image.asset_folder && image.asset_folder.startsWith('Project Photos/')) {
        const folderName = image.asset_folder.replace('Project Photos/', '');
        
        cloudinaryImages.push({
          publicId: image.public_id,
          url: image.secure_url,
          width: image.width,
          height: image.height,
          bytes: image.bytes,
          format: image.format,
          folder: folderName,
          displayName: image.display_name || image.public_id.split('/').pop().replace(/\.[^/.]+$/, ''),
          createdAt: image.created_at,
          updatedAt: image.updated_at
        });
      }
    }
    
    console.log(`   📸 Found ${cloudinaryImages.length} images in Project Photos folders`);
    
    // Group by folder for summary
    const folderGroups = {};
    cloudinaryImages.forEach(image => {
      if (!folderGroups[image.folder]) {
        folderGroups[image.folder] = [];
      }
      folderGroups[image.folder].push(image);
    });
    
    console.log('\n📸 Images by folder:');
    Object.entries(folderGroups).forEach(([folder, images]) => {
      console.log(`   📁 ${folder}: ${images.length} images`);
    });
    
    logResult(true, `Found ${cloudinaryImages.length} Cloudinary images`);
    
    await pauseForConfirmation('Review the Cloudinary images discovered above');
    
    return cloudinaryImages;
    
  } catch (error) {
    logResult(false, 'Failed to discover Cloudinary images', error.message);
    throw error;
  }
}

module.exports = { discoverCloudinaryImages };
