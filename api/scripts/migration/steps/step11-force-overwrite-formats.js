/**
 * STEP 11: FORCE OVERWRITE STRAPI MEDIA FORMATS
 * 
 * Forces an overwrite of Strapi media files to have new formats.
 * Can update all media files or a single specific image.
 * This will update existing media entries with fresh Cloudinary format URLs.
 */

const { logStepHeader, logResult, generateCloudinaryFormats, processInBatches } = require('../utils');

async function forceOverwriteAllFormats(strapiApi, cloudinaryApi, dryRun, rl, options = {}) {
  const { singleImageName } = options;
  
  if (singleImageName) {
    logStepHeader(11, `FORCE OVERWRITE FORMATS FOR SINGLE IMAGE: ${singleImageName}`);
  } else {
    logStepHeader(11, 'FORCE OVERWRITE ALL STRAPI MEDIA FORMATS');
  }
  
  try {
    console.log('🔄 Fetching all existing Strapi media files...');
    
    // Get all media files from Strapi (using local API with custom endpoint)
    const response = await strapiApi.get('/api/media-files');
    const allMedia = response.data.data || [];
    
    console.log('🔄 Fetching fresh Cloudinary data for correct display names...');
    
    // Get fresh Cloudinary data to get correct display names
    const cloudinaryResponse = await cloudinaryApi.get('/resources/image', {
      params: {
        type: 'upload',
        max_results: 1000
      }
    });
    
    const cloudinaryImages = cloudinaryResponse.data.resources || [];
    console.log(`   📸 Found ${cloudinaryImages.length} images in Cloudinary`);
    
    // Create a map of public_id to correct display name
    const cloudinaryNameMap = {};
    cloudinaryImages.forEach(image => {
      if (image.asset_folder && image.asset_folder.startsWith('Project Photos/')) {
        const displayName = image.original_filename || image.public_id.split('/').pop().replace(/\.[^/.]+$/, '');
        cloudinaryNameMap[image.public_id] = displayName;
      }
    });
    
    console.log(`   📸 Mapped ${Object.keys(cloudinaryNameMap).length} Cloudinary display names`);
    
    if (allMedia.length === 0) {
      console.log('⚠️  No media files found in Strapi.');
      return;
    }
    
    console.log(`📸 Found ${allMedia.length} media files to process`);
    
    // Filter for Cloudinary media only
    let cloudinaryMedia = allMedia.filter(media => {
      const attrs = media.attributes || media;
      return attrs.provider === 'cloudinary' && 
             attrs.provider_metadata?.public_id;
    });
    
    // If single image specified, filter to just that image
    if (singleImageName) {
      cloudinaryMedia = cloudinaryMedia.filter(media => {
        const attrs = media.attributes || media;
        return attrs.name === singleImageName;
      });
      
      if (cloudinaryMedia.length === 0) {
        console.log(`❌ No image found with name: ${singleImageName}`);
        return;
      }
      
      console.log(`🎯 Found 1 image matching: ${singleImageName}`);
    }
    
    console.log(`☁️  Found ${cloudinaryMedia.length} Cloudinary media files`);
    
    if (cloudinaryMedia.length === 0) {
      console.log('⚠️  No Cloudinary media files found to update.');
      return;
    }
    
    if (dryRun) {
      console.log('\n🧪 DRY RUN - Would force overwrite formats for:');
      
      // For single image, show detailed comparison
      if (singleImageName && cloudinaryMedia.length === 1) {
        const media = cloudinaryMedia[0];
        const attrs = media.attributes || media;
        const publicId = attrs.provider_metadata?.public_id;
        const displayName = cloudinaryNameMap[publicId] || attrs.name;
        
        console.log('\n📊 CURRENT IMAGE DATA:');
        console.log(`   📸 Name: ${attrs.name}`);
        console.log(`   🆔 Public ID: ${publicId}`);
        console.log(`   📏 Dimensions: ${attrs.width}x${attrs.height}`);
        console.log(`   🔗 URL: ${attrs.url}`);
        
        if (attrs.formats) {
          console.log('   📋 Current Formats:');
          Object.entries(attrs.formats).forEach(([formatName, format]) => {
            console.log(`      ${formatName}: ${format.width}x${format.height} (${format.url})`);
          });
        }
        
        // Generate proposed formats
        const cloudinaryImage = {
          publicId: publicId,
          url: attrs.url,
          width: attrs.width,
          height: attrs.height,
          format: attrs.ext?.replace('.', '') || 'jpg',
          bytes: (attrs.size || 0) * 1024,
          displayName: displayName
        };
        
        const proposedFormats = generateCloudinaryFormats(cloudinaryImage);
        
        console.log('\n🎯 PROPOSED FORMAT DATA:');
        console.log(`   📸 Name: ${displayName}`);
        console.log(`   📏 Original: ${attrs.width}x${attrs.height} (aspect ratio: ${(attrs.width / attrs.height).toFixed(3)})`);
        
        console.log('   📋 Proposed Formats:');
        Object.entries(proposedFormats).forEach(([formatName, format]) => {
          const aspectRatio = (format.width / format.height).toFixed(3);
          console.log(`      ${formatName}: ${format.width}x${format.height} (aspect ratio: ${aspectRatio})`);
        });
      } else {
        // Standard dry run output for multiple images
        cloudinaryMedia.forEach(media => {
          const attrs = media.attributes || media;
          const publicId = attrs.provider_metadata.public_id;
          const correctName = cloudinaryNameMap[publicId] || attrs.name;
          if (correctName !== attrs.name) {
            console.log(`   🔄 ${attrs.name} → ${correctName} (${publicId})`);
          } else {
            console.log(`   🔄 ${attrs.name} (${publicId})`);
          }
        });
      }
      
      console.log(`\n📊 Would update ${cloudinaryMedia.length} media files`);
      return;
    }
    
    // Auto-proceed for batch processing
    console.log(`\n⚠️  WARNING: This will force overwrite formats for ${cloudinaryMedia.length} media files.`);
    console.log('   This action cannot be undone and may temporarily affect your website.');
    console.log('   🚀 Auto-proceeding with format updates...');
    
    let updatedCount = 0;
    let failedCount = 0;
    
    console.log(`\n🔄 Force updating ${cloudinaryMedia.length} media files...`);
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 5; // Smaller batch size for updates
    const results = await processInBatches(cloudinaryMedia, batchSize, async (media) => {
      try {
        const attrs = media.attributes || media;
        const publicId = attrs.provider_metadata.public_id;
        
        console.log(`   🔄 Updating: ${attrs.name} (${publicId})`);
        
        // Get correct display name from Cloudinary
        const displayName = cloudinaryNameMap[publicId] || attrs.name;
        
        // Generate fresh Cloudinary format URLs
        const cloudinaryImage = {
          publicId: publicId,
          url: attrs.url,
          width: attrs.width,
          height: attrs.height,
          format: attrs.ext?.replace('.', '') || 'jpg',
          bytes: (attrs.size || 0) * 1024, // Convert KB back to bytes
          displayName: displayName
        };
        
        const formats = generateCloudinaryFormats(cloudinaryImage);
        
        // Prepare update data with fresh formats
        const updateData = {
          data: {
            name: displayName,
            alternativeText: displayName,
            caption: displayName,
            formats: formats,
            url: attrs.url, // Keep original URL
            width: attrs.width,
            height: attrs.height,
            size: attrs.size,
            mime: attrs.mime,
            provider: 'cloudinary',
            provider_metadata: {
              public_id: publicId,
              resource_type: 'image'
            },
            updated_by: 1
          }
        };
        
        // Update the media file using custom endpoint
        await strapiApi.put(`/api/media-files/${media.id}`, updateData);
        console.log(`   ✅ Updated successfully`);
        
        return { success: true, type: 'updated' };
        
      } catch (error) {
        console.log(`   ❌ Failed to update: ${error.message}`);
        return { success: false, type: 'error' };
      }
    });
    
    // Process results
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          updatedCount++;
        } else {
          failedCount++;
        }
      } else {
        failedCount++;
        console.log(`   ❌ Batch processing error: ${result.reason}`);
      }
    });
    
    console.log(`\n📊 Force Overwrite Summary:`);
    console.log(`   🔄 Updated: ${updatedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    
    if (updatedCount > 0) {
      console.log('\n✅ All media files have been force updated with new formats!');
      console.log('   💡 You may need to clear your CDN cache to see the changes.');
    }
    
    logResult(true, `Force overwrite complete: ${updatedCount} updated, ${failedCount} failed`);
    
  } catch (error) {
    logResult(false, 'Error during force overwrite', error.message);
    throw error;
  }
}

module.exports = { forceOverwriteAllFormats };
