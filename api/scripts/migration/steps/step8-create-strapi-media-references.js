/**
 * STEP 8: SYNC CLOUDINARY WITH STRAPI
 * 
 * Compares Cloudinary images with existing Strapi media and syncs them.
 * Creates new entries, updates existing ones, and identifies what needs to be cleaned up.
 */

const { logStepHeader, logResult, generateCloudinaryFormats, processInBatches } = require('../utils');

async function syncCloudinaryWithStrapi(strapiApi, cloudinaryImages, existingStrapiMedia, folderMapping, dryRun, rl) {
  logStepHeader(8, 'SYNC CLOUDINARY WITH STRAPI');
  
  try {
    console.log('🔄 Comparing Cloudinary images with existing Strapi media...');
    
    if (!cloudinaryImages || cloudinaryImages.length === 0) {
      console.log('⚠️  No Cloudinary images found. Run Step 6 first.');
      return;
    }
    
    if (!existingStrapiMedia || existingStrapiMedia.length === 0) {
      console.log('⚠️  No existing Strapi media found. Run Step 7 first.');
      return;
    }
    
    console.log(`📸 Cloudinary images: ${cloudinaryImages.length}`);
    console.log(`📸 Existing Strapi media: ${existingStrapiMedia.length}`);
    
    // First, identify and group duplicates in Strapi
    console.log('\n🔍 Analyzing Strapi duplicates...');
    const strapiDuplicates = {};
    const strapiByPublicId = {};
    
    existingStrapiMedia.forEach(media => {
      const publicId = media.provider_metadata?.public_id;
      if (publicId) {
        if (!strapiByPublicId[publicId]) {
          strapiByPublicId[publicId] = [];
        }
        strapiByPublicId[publicId].push(media);
      }
    });
    
    // Find duplicates (more than one entry with same public_id)
    Object.keys(strapiByPublicId).forEach(publicId => {
      if (strapiByPublicId[publicId].length > 1) {
        strapiDuplicates[publicId] = strapiByPublicId[publicId];
        console.log(`   🔍 Found ${strapiByPublicId[publicId].length} duplicates for: ${publicId}`);
      }
    });
    
    console.log(`📊 Found ${Object.keys(strapiDuplicates).length} sets of duplicates in Strapi`);
    
    // Compare and categorize
    const toCreate = [];
    const toUpdate = [];
    const toKeep = [];
    const toDelete = [];
    
    // Find matches between Cloudinary and Strapi
    for (const cloudinaryImage of cloudinaryImages) {
      const matchingStrapiEntries = existingStrapiMedia.filter(media => 
        media.provider_metadata?.public_id === cloudinaryImage.publicId ||
        media.url === cloudinaryImage.url ||
        media.name === cloudinaryImage.displayName
      );
      
      if (matchingStrapiEntries.length > 0) {
        // Keep the first entry, mark others for deletion
        const keepEntry = matchingStrapiEntries[0];
        const deleteEntries = matchingStrapiEntries.slice(1);
        
        // Check if the kept entry needs updating
        // Always update entries that don't have proper Cloudinary formats
        const hasProperFormats = keepEntry.formats && 
          keepEntry.formats.thumbnail && 
          keepEntry.formats.small && 
          keepEntry.formats.medium && 
          keepEntry.formats.large &&
          keepEntry.formats.thumbnail.url?.includes('cloudinary.com') &&
          keepEntry.formats.small.url?.includes('cloudinary.com') &&
          keepEntry.formats.medium.url?.includes('cloudinary.com') &&
          keepEntry.formats.large.url?.includes('cloudinary.com');
        
        // Force update if formats are missing or incorrect OR if name is wrong
        const needsUpdate = 
          keepEntry.url !== cloudinaryImage.url ||
          keepEntry.width !== cloudinaryImage.width ||
          keepEntry.height !== cloudinaryImage.height ||
          keepEntry.provider !== 'cloudinary' ||
          keepEntry.name !== cloudinaryImage.displayName || // Check if name is correct
          !hasProperFormats ||
          !keepEntry.formats || // Force update if no formats at all
          true; // FORCE UPDATE ALL ENTRIES TO ENSURE CORRECT FORMATS AND NAMES
        
        if (needsUpdate) {
          toUpdate.push({ cloudinary: cloudinaryImage, strapi: keepEntry });
        } else {
          toKeep.push({ cloudinary: cloudinaryImage, strapi: keepEntry });
        }
        
        // Add duplicates to deletion list
        toDelete.push(...deleteEntries);
      } else {
        toCreate.push(cloudinaryImage);
      }
    }
    
    // Find Strapi entries that don't exist in Cloudinary (orphaned)
    for (const strapiMedia of existingStrapiMedia) {
      const cloudinaryMatch = cloudinaryImages.find(img => 
        img.publicId === strapiMedia.provider_metadata?.public_id ||
        img.url === strapiMedia.url ||
        img.displayName === strapiMedia.name
      );
      
      if (!cloudinaryMatch) {
        toDelete.push(strapiMedia);
      }
    }
    
    console.log('\n📊 Sync Analysis:');
    console.log(`   ➕ To create: ${toCreate.length}`);
    console.log(`   🔄 To update: ${toUpdate.length}`);
    console.log(`   ✅ To keep: ${toKeep.length}`);
    console.log(`   🗑️  To delete: ${toDelete.length}`);
    
    if (dryRun) {
      console.log('\n🧪 DRY RUN - Would perform the following actions:');
      if (toCreate.length > 0) {
        console.log('\n📄 Would create:');
        toCreate.forEach(img => console.log(`   ➕ ${img.displayName} → ${img.folder}`));
      }
      if (toUpdate.length > 0) {
        console.log('\n🔄 Would update:');
        toUpdate.forEach(({ cloudinary, strapi }) => console.log(`   🔄 ${cloudinary.displayName} (${strapi.name})`));
      }
      if (toDelete.length > 0) {
        console.log('\n🗑️  Would delete:');
        toDelete.forEach(media => console.log(`   🗑️  ${media.name} (duplicate/orphaned)`));
      }
      return;
    }
    
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    let failedCount = 0;
    
    // Process creates and updates in parallel batches
    const batchSize = 10;
    const allOperations = [...toCreate, ...toUpdate];
    
    if (allOperations.length > 0) {
      console.log(`\n🔄 Processing ${allOperations.length} create/update operations...`);
      
      const results = await processInBatches(allOperations, batchSize, async (operation) => {
        try {
          const isUpdate = operation.cloudinary && operation.strapi;
          const image = operation.cloudinary || operation;
          const existingMedia = operation.strapi;
          
          console.log(`   📸 ${isUpdate ? 'Updating' : 'Creating'}: ${image.publicId}`);
          
          // Find the Strapi folder ID for this image
          const folderMappingEntry = folderMapping.get(image.folder);
          if (!folderMappingEntry || !folderMappingEntry.strapiId) {
            console.log(`   ⚠️  No Strapi folder mapping found for ${image.folder}, skipping`);
            return { success: false, type: 'error' };
          }
          
          const strapiFolder = {
            id: folderMappingEntry.strapiId,
            name: folderMappingEntry.strapiName
          };
          
          // Generate Cloudinary format URLs
          const formats = generateCloudinaryFormats(image);
          const displayName = image.displayName || image.publicId.split('/').pop();
          
          // Fix MIME type and extension for JPEG files
          const mimeType = image.format === 'jpg' ? 'image/jpeg' : `image/${image.format}`;
          const extension = image.format === 'jpg' ? '.jpeg' : `.${image.format}`;
          
          // Create media entry data
          const mediaData = {
            name: displayName,
            alternativeText: displayName,
            caption: displayName,
            url: image.url,
            provider: 'cloudinary',
            provider_metadata: {
              public_id: image.publicId,
              resource_type: 'image'
            },
            formats: formats,
            width: image.width,
            height: image.height,
            size: Math.round(image.bytes / 1024 * 100) / 100, // Convert bytes to KB with 2 decimal places
            mime: mimeType,
            folderId: strapiFolder.id,
            hash: image.publicId,
            ext: extension,
            previewUrl: null,
            path: null,
            created_by: 1,
            updated_by: 1
          };
          
          if (isUpdate && existingMedia) {
            // Update existing media
            console.log(`   🔄 Updating existing media: ${displayName}`);
            try {
              await strapiApi.put(`/api/media-files/${existingMedia.id}`, mediaData);
              console.log(`   ✅ Updated successfully`);
              return { success: true, type: 'updated' };
            } catch (error) {
              console.log(`   ❌ Failed to update: ${error.message}`);
              return { success: false, type: 'error' };
            }
          } else {
            // Create new media
            console.log(`   ➕ Creating new media: ${displayName}`);
            try {
              await strapiApi.post('/api/media-files', mediaData);
              console.log(`   ✅ Created successfully`);
              return { success: true, type: 'created' };
            } catch (error) {
              console.log(`   ❌ Failed to create: ${error.message}`);
              return { success: false, type: 'error' };
            }
          }
        } catch (error) {
          console.log(`   ❌ Processing error: ${error.message}`);
          return { success: false, type: 'error' };
        }
      });
      
      // Process results
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            if (result.value.type === 'created') {
              createdCount++;
            } else if (result.value.type === 'updated') {
              updatedCount++;
            }
          } else {
            failedCount++;
          }
        } else {
          failedCount++;
          console.log(`   ❌ Batch processing error: ${result.reason}`);
        }
      });
    }
    
    // Process deletions
    if (toDelete.length > 0) {
      console.log(`\n🗑️  Processing ${toDelete.length} delete operations...`);
      
      for (const media of toDelete) {
        try {
          console.log(`   🗑️  Deleting: ${media.name}`);
          await strapiApi.delete(`/api/media/files/${media.id}`);
          console.log(`   ✅ Deleted successfully`);
          deletedCount++;
        } catch (error) {
          console.log(`   ❌ Failed to delete: ${error.message}`);
          failedCount++;
        }
      }
    }
    
    console.log(`\n📊 Sync Summary:`);
    console.log(`   ➕ Created: ${createdCount}`);
    console.log(`   🔄 Updated: ${updatedCount}`);
    console.log(`   🗑️  Deleted: ${deletedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    
    logResult(true, `Sync complete: ${createdCount} created, ${updatedCount} updated, ${deletedCount} deleted`);
    
  } catch (error) {
    logResult(false, 'Error during sync', error.message);
    throw error;
  }
}

module.exports = { syncCloudinaryWithStrapi };