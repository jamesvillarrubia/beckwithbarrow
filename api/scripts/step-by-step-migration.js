/**
 * STEP-BY-STEP MIGRATION SCRIPT
 * 
 * Performs Cloudinary-to-Strapi migration in discrete, verifiable steps.
 * Each step has clear logging and pauses for user confirmation.
 * 
 * Usage:
 *   node step-by-step-migration.js
 *   node step-by-step-migration.js --step=1  (run specific step)
 *   node step-by-step-migration.js --dry-run (show what would happen)
 */

require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '../strapi-cloud.env' });
require('dotenv').config({ path: '../cloudinary.env' });

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// API Configuration
const cloudinaryApiKey = process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY;
const cloudinarySecret = process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET;
const cloudinaryName = process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;

if (!cloudinaryApiKey || !cloudinarySecret || !cloudinaryName) {
  console.error('❌ Missing Cloudinary credentials. Please check your .env file.');
  process.exit(1);
}

const auth = Buffer.from(`${cloudinaryApiKey}:${cloudinarySecret}`).toString('base64');
const cloudinaryApi = axios.create({
  baseURL: `https://api.cloudinary.com/v1_1/${cloudinaryName}`,
  headers: { 'Authorization': `Basic ${auth}` }
});

const strapiApi = axios.create({
  baseURL: process.env.STRAPI_CLOUD_BASE_URL || process.env.STRAPI_URL || 'http://localhost:1337',
  headers: {
    'Authorization': `Bearer ${process.env.STRAPI_CLOUD_API_TOKEN || process.env.STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to pause and wait for user confirmation
function pauseForConfirmation(message) {
  return new Promise((resolve) => {
    console.log(`\n⏸️  ${message}`);
    console.log('   Press Enter to continue or Ctrl+C to exit...');
    rl.question('', () => {
      resolve();
    });
  });
}

// Helper function to log step headers
function logStepHeader(stepNumber, title) {
  console.log('\n' + '='.repeat(80));
  console.log(`STEP ${stepNumber}: ${title}`);
  console.log('='.repeat(80));
}

// Helper function to log results
function logResult(success, message, details = null) {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${message}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

class StepByStepMigrator {
  constructor() {
    this.cloudinaryFolders = [];
    this.strapiFolders = [];
    this.folderMapping = new Map();
    this.createdFolders = [];
    this.cloudinaryImages = [];
    this.dryRun = false;
    this.dataFile = path.join(__dirname, 'migration-data.json');
  }

  /**
   * Load data from JSON file
   */
  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.cloudinaryFolders = data.cloudinaryFolders || [];
        this.strapiFolders = data.strapiFolders || [];
        this.folderMapping = new Map(data.folderMapping || []);
        this.createdFolders = data.createdFolders || [];
        this.cloudinaryImages = data.cloudinaryImages || [];
        console.log('📁 Loaded existing migration data');
      }
    } catch (error) {
      console.log('📁 No existing migration data found, starting fresh');
    }
  }

  /**
   * Save data to JSON file
   */
  saveData() {
    try {
      const data = {
        cloudinaryFolders: this.cloudinaryFolders,
        strapiFolders: this.strapiFolders,
        folderMapping: Array.from(this.folderMapping.entries()),
        createdFolders: this.createdFolders,
        cloudinaryImages: this.cloudinaryImages,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.log('💾 Migration data saved');
    } catch (error) {
      console.error('❌ Failed to save migration data:', error.message);
    }
  }

  /**
   * Clear saved data
   */
  clearData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        fs.unlinkSync(this.dataFile);
        console.log('🗑️  Migration data cleared');
      }
    } catch (error) {
      console.error('❌ Failed to clear migration data:', error.message);
    }
  }

  /**
   * STEP 0: Clean Up Existing Strapi Assets
   */
  async step0_CleanupExistingAssets() {
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
      
      if (this.dryRun) {
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
      console.log(`   ✅ Deleted: ${deletedCount}`);
      console.log(`   ❌ Failed: ${failedCount}`);
      
      await pauseForConfirmation('Review the cleanup results above');
      
      // Save data after step completion
      this.saveData();
      
    } catch (error) {
      logResult(false, 'Failed to cleanup existing assets', error.message);
      throw error;
    }
  }

  /**
   * STEP 1: Discover Cloudinary Folder Structure
   */
  async step1_DiscoverCloudinaryFolders() {
    logStepHeader(1, 'DISCOVER CLOUDINARY FOLDER STRUCTURE');
    
    try {
      console.log('🔍 Fetching Cloudinary folder structure...');
      const response = await cloudinaryApi.get('/folders/beckwithbarrow');
      const folders = response.data.folders || [];
      
      console.log('🔍 Fetching asset counts for each folder...');
      this.cloudinaryFolders = [];
      
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
          
          this.cloudinaryFolders.push({
            name: folder.name,
            path: folder.path,
            assetCount: assetCount
          });
          
          console.log(`   📁 ${folder.name}: ${assetCount} assets`);
          
        } catch (error) {
          console.log(`   ⚠️  ${folder.name}: Could not fetch asset count (${error.message})`);
          this.cloudinaryFolders.push({
            name: folder.name,
            path: folder.path,
            assetCount: 0
          });
        }
      }
      
      logResult(true, `Found ${this.cloudinaryFolders.length} Cloudinary folders`);
      
      console.log('\n📂 Cloudinary Folders Summary:');
      this.cloudinaryFolders.forEach(folder => {
        console.log(`   📁 ${folder.name} (${folder.assetCount} assets)`);
      });
      
      const totalAssets = this.cloudinaryFolders.reduce((sum, folder) => sum + folder.assetCount, 0);
      console.log(`\n📊 Total assets across all folders: ${totalAssets}`);
      
      await pauseForConfirmation('Review the Cloudinary folder structure above');
      
      // Save data after step completion
      this.saveData();
      
    } catch (error) {
      logResult(false, 'Failed to fetch Cloudinary folders', error.message);
      throw error;
    }
  }

  /**
   * STEP 2: Discover Strapi Folder Structure
   */
  async step2_DiscoverStrapiFolders() {
    logStepHeader(2, 'DISCOVER STRAPI FOLDER STRUCTURE');
    
    try {
      console.log('🔍 Fetching Strapi folder structure...');
      const response = await strapiApi.get('/api/media/folders-structure');
      const folders = response.data || [];
      
      // Flatten the folder structure for easier processing
      this.strapiFolders = this.flattenFolderStructure(folders);
      
      logResult(true, `Found ${this.strapiFolders.length} Strapi folders`);
      
      console.log('\n📂 Strapi Folders:');
      this.strapiFolders.forEach(folder => {
        const parent = folder.parent ? ` (under ${folder.parent})` : ' (root)';
        console.log(`   📁 ${folder.name} (ID: ${folder.id})${parent}`);
      });
      
      await pauseForConfirmation('Review the Strapi folder structure above');
      
      // Save data after step completion
      this.saveData();
      
    } catch (error) {
      logResult(false, 'Failed to fetch Strapi folders', error.message);
      throw error;
    }
  }

  /**
   * STEP 3: Create Folder Mapping
   */
  async step3_CreateFolderMapping() {
    logStepHeader(3, 'CREATE FOLDER MAPPING');
    
    console.log('🔗 Creating mapping between Cloudinary and Strapi folders...');
    
    // Create a map of existing Strapi folders by name
    const strapiFolderMap = new Map();
    this.strapiFolders.forEach(folder => {
      strapiFolderMap.set(folder.name.toLowerCase(), folder);
    });
    
    // Map each Cloudinary folder to Strapi folder
    for (const cloudinaryFolder of this.cloudinaryFolders) {
      const folderName = cloudinaryFolder.name.toLowerCase();
      const strapiFolder = strapiFolderMap.get(folderName);
      
      if (strapiFolder) {
        // Exact match found
        this.folderMapping.set(cloudinaryFolder.name, {
          cloudinaryName: cloudinaryFolder.name,
          strapiId: strapiFolder.id,
          strapiName: strapiFolder.name,
          status: 'EXISTS',
          needsUpdate: strapiFolder.name !== cloudinaryFolder.name
        });
        logResult(true, `${cloudinaryFolder.name} → ${strapiFolder.name} (ID: ${strapiFolder.id})`);
      } else {
        // No match found - needs to be created
        this.folderMapping.set(cloudinaryFolder.name, {
          cloudinaryName: cloudinaryFolder.name,
          strapiId: null,
          strapiName: cloudinaryFolder.name,
          status: 'NEEDS_CREATION',
          needsUpdate: false
        });
        logResult(false, `${cloudinaryFolder.name} → NEEDS CREATION`);
      }
    }
    
    const needsCreation = Array.from(this.folderMapping.values()).filter(m => m.status === 'NEEDS_CREATION');
    const exists = Array.from(this.folderMapping.values()).filter(m => m.status === 'EXISTS');
    
    console.log(`\n📊 Mapping Summary:`);
    console.log(`   ✅ Existing: ${exists.length}`);
    console.log(`   ⚠️  Need Creation: ${needsCreation.length}`);
    
    await pauseForConfirmation('Review the folder mapping above');
    
    // Save data after step completion
    this.saveData();
  }

  /**
   * STEP 4: Create Missing Strapi Folders
   */
  async step4_CreateMissingFolders() {
    logStepHeader(4, 'CREATE MISSING STRAPI FOLDERS');
    
    const needsCreation = Array.from(this.folderMapping.values()).filter(m => m.status === 'NEEDS_CREATION');
    
    if (needsCreation.length === 0) {
      console.log('✅ No folders need to be created');
      return;
    }
    
    console.log(`📁 Creating ${needsCreation.length} missing folders under "Project Photos" (ID: 147)...`);
    
    if (this.dryRun) {
      console.log('🧪 DRY RUN - Would create the following folders:');
      needsCreation.forEach(mapping => {
        console.log(`   📁 ${mapping.cloudinaryName} (under Project Photos)`);
      });
      await pauseForConfirmation('Review the folders that would be created');
      return;
    }
    
    for (const mapping of needsCreation) {
      try {
        console.log(`\n   Creating folder: ${mapping.cloudinaryName}`);
        
        const response = await strapiApi.post('/api/media/folders', {
          name: mapping.cloudinaryName,
          parentId: 147  // Under "Project Photos" folder
        });
        
        const newFolder = {
          id: response.data.id,
          name: response.data.name,
          cloudinaryName: mapping.cloudinaryName,
          parentId: 147,
          createdAt: response.data.createdAt
        };
        
        this.createdFolders.push(newFolder);
        
        // Update the mapping
        mapping.strapiId = newFolder.id;
        mapping.status = 'CREATED';
        
        logResult(true, `Created: ${newFolder.name} (ID: ${newFolder.id})`);
        
      } catch (error) {
        logResult(false, `Failed to create folder ${mapping.cloudinaryName}`, error.message);
      }
    }
    
    console.log(`\n📊 Creation Summary:`);
    console.log(`   ✅ Created: ${this.createdFolders.length}`);
    console.log(`   ❌ Failed: ${needsCreation.length - this.createdFolders.length}`);
    
    await pauseForConfirmation('Review the folder creation results above');
    
    // Save data after step completion
    this.saveData();
  }

  /**
   * STEP 5: Verify Folder Structure
   */
  async step5_VerifyFolderStructure() {
    logStepHeader(5, 'VERIFY FOLDER STRUCTURE');
    
    try {
      console.log('🔍 Re-fetching Strapi folder structure to verify changes...');
      const response = await strapiApi.get('/api/media/folders-structure');
      const folders = response.data || [];
      
      const updatedFolders = this.flattenFolderStructure(folders);
      
      console.log('\n📂 Updated Strapi Folders:');
      updatedFolders.forEach(folder => {
        const parent = folder.parent ? ` (under ${folder.parent})` : ' (root)';
        const isNew = this.createdFolders.some(created => created.id === folder.id);
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
      
      await pauseForConfirmation('Verify the folder structure looks correct');
      
      // Save data after step completion
      this.saveData();
      
    } catch (error) {
      logResult(false, 'Failed to verify folder structure', error.message);
      throw error;
    }
  }

  /**
   * STEP 6: Discover Cloudinary Images
   */
  async step6_DiscoverCloudinaryImages() {
    logStepHeader(6, 'DISCOVER CLOUDINARY IMAGES');
    
    try {
      console.log('🔍 Fetching all images from Cloudinary folders...');
      this.cloudinaryImages = [];
      
      for (const folder of this.cloudinaryFolders) {
        if (folder.assetCount > 0) {
          console.log(`   📁 Fetching images from ${folder.name} (${folder.assetCount} assets)...`);
          
          try {
            const response = await cloudinaryApi.get('/resources/by_asset_folder', {
              params: {
                asset_folder: folder.path,
                max_results: 1000  // Get all images in this folder
              }
            });
            
            const images = response.data.resources || [];
            console.log(`   📸 Found ${images.length} images in ${folder.name}`);
            
            for (const image of images) {
              this.cloudinaryImages.push({
                publicId: image.public_id,
                folder: folder.name,
                cloudinaryPath: folder.path,
                format: image.format,
                width: image.width,
                height: image.height,
                bytes: image.bytes,
                url: image.secure_url,
                version: image.version,
                createdAt: image.created_at,
                displayName: image.display_name || image.original_filename || image.public_id.split('/').pop(),
                originalFilename: image.original_filename || image.public_id.split('/').pop(),
                context: image.context,
                tags: image.tags
              });
            }
            
          } catch (error) {
            console.log(`   ⚠️  Could not fetch images from ${folder.name}: ${error.message}`);
          }
        }
      }
      
      logResult(true, `Found ${this.cloudinaryImages.length} Cloudinary images`);
      
      console.log('\n📸 Cloudinary Images Summary:');
      const folderCounts = {};
      this.cloudinaryImages.forEach(img => {
        folderCounts[img.folder] = (folderCounts[img.folder] || 0) + 1;
      });
      
      Object.entries(folderCounts).forEach(([folder, count]) => {
        console.log(`   📁 ${folder}: ${count} images`);
      });
      
      await pauseForConfirmation('Review the Cloudinary images discovered above');
      
      // Save data after step completion
      this.saveData();
      
    } catch (error) {
      logResult(false, 'Failed to discover Cloudinary images', error.message);
      throw error;
    }
  }

  /**
   * STEP 7: Create Strapi Media References
   */
  async step7_CreateStrapiMediaReferences() {
    logStepHeader(7, 'CREATE STRAPI MEDIA REFERENCES');
    
    try {
      console.log('📸 Creating Strapi media references for Cloudinary images...');
      
      if (this.cloudinaryImages.length === 0) {
        console.log('⚠️  No Cloudinary images found. Run Step 6 first.');
        await pauseForConfirmation('No images to process');
        return;
      }
      
      console.log(`🔍 Available folder mappings:`, Array.from(this.folderMapping.entries()).map(([name, mapping]) => `${name} → ID: ${mapping.strapiId}`));
      console.log(`🔍 First few Cloudinary images:`, this.cloudinaryImages.slice(0, 3).map(img => `${img.displayName} → ${img.folder}`));
      
      if (this.dryRun) {
        console.log('🧪 DRY RUN - Would create the following media references:');
        this.cloudinaryImages.forEach(img => {
          const displayName = img.displayName || img.publicId.split('/').pop();
          console.log(`   📄 ${displayName} → ${img.folder} folder`);
        });
        await pauseForConfirmation('Review the media references that would be created');
        return;
      }
      
      let createdCount = 0;
      let failedCount = 0;

      // Process just the first few images for testing
      const testImages = this.cloudinaryImages.slice(0, 3);
      console.log(`🧪 Processing ${testImages.length} test images (out of ${this.cloudinaryImages.length} total)`);

      for (const image of testImages) {
        try {
          console.log(`   📸 Creating reference for: ${image.publicId}`);
          
          // Find the Strapi folder ID for this image using folderMapping
          const folderMapping = this.folderMapping.get(image.folder);
          if (!folderMapping || !folderMapping.strapiId) {
            console.log(`   ⚠️  No Strapi folder mapping found for ${image.folder}, skipping`);
            console.log(`   🔍 Available folder mappings:`, Array.from(this.folderMapping.keys()));
            failedCount++;
            continue;
          }
          
          const strapiFolder = {
            id: folderMapping.strapiId,
            name: folderMapping.strapiName
          };
          
          // Create a minimal placeholder file first
          const placeholderFile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
          
          // Upload placeholder to create media entry
          const formData = new FormData();
          formData.append('file', new Blob([placeholderFile], { type: 'image/png' }), 'placeholder.png');
          formData.append('folderId', strapiFolder.id);
          formData.append('alternativeText', `${image.folder} - ${image.publicId.split('/').pop()}`);
          
          const uploadResponse = await strapiApi.post('/api/media/files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          // Upload was successful, continue with media creation
          const mediaId = uploadResponse.data.data[0].id;
          
          // Generate Cloudinary format URLs
          const formats = this.generateCloudinaryFormats(image);
          
          // Update the media entry with Cloudinary URLs
          const displayName = image.displayName || image.publicId.split('/').pop();
          const updateData = {
            name: displayName,
            alternativeText: `${image.folder} - ${displayName}`,
            url: image.url,
            formats: formats,
            provider: 'cloudinary',
            folderId: strapiFolder.id,
            provider_metadata: {
              public_id: image.publicId,
              version: image.version,
              format: image.format,
              resource_type: 'image'
            }
          };
          
          console.log(`   🔄 Updating media entry with Cloudinary URLs using custom API...`);
          await strapiApi.put(`/api/media-files/${mediaId}`, updateData);
          
          console.log(`   ✅ COMPLETE: ${image.displayName} → ${image.folder} folder (ID: ${mediaId})`);
          console.log(`   🔗 Cloudinary URL: ${image.url}`);
          console.log(`   📁 Strapi Folder: ${strapiFolder.name} (ID: ${strapiFolder.id})`);
          createdCount++;
          
         } catch (error) {
           console.log(`   ❌ CRITICAL ERROR: Failed to create ${image.publicId}: ${error.message}`);
           console.log(`   ❌ EXITING SCRIPT DUE TO FAILURE`);
           throw error;
         }
      }
      
      console.log(`\n📊 Creation Summary:`);
      console.log(`   ✅ Created: ${createdCount}`);
      console.log(`   ❌ Failed: ${failedCount}`);
      
      await pauseForConfirmation('Review the media reference creation results above');
      
      // Save data after step completion
      this.saveData();
      
    } catch (error) {
      logResult(false, 'Failed to create Strapi media references', error.message);
      throw error;
    }
  }

  /**
   * STEP 8: Verify Media References
   */
  async step8_VerifyMediaReferences() {
    logStepHeader(8, 'VERIFY MEDIA REFERENCES');
    
    try {
      console.log('🔍 Verifying all Strapi media references...');
      
      // Get all media files from Strapi
      const response = await strapiApi.get('/api/media/files', {
        params: {
          'pagination[pageSize]': 1000
        }
      });
      
      const strapiMedia = response.data || [];
      console.log(`📸 Found ${strapiMedia.length} Strapi media files`);
      
      // Categorize by provider
      const cloudinaryMedia = strapiMedia.filter(m => m.provider === 'cloudinary');
      const otherMedia = strapiMedia.filter(m => m.provider !== 'cloudinary');
      
      console.log('\n📊 Media Provider Summary:');
      console.log(`   ☁️  Cloudinary: ${cloudinaryMedia.length}`);
      console.log(`   📁 Other: ${otherMedia.length}`);
      
      if (cloudinaryMedia.length > 0) {
        console.log('\n☁️  Cloudinary Media Files:');
        cloudinaryMedia.forEach(media => {
          const folderName = media.folder?.name || 'Unknown';
          console.log(`   📄 ${media.name} (${folderName}) - ${media.provider}`);
        });
      }
      
      if (otherMedia.length > 0) {
        console.log('\n📁 Other Media Files:');
        // Show details for the most recent entries (last 5)
        const recentMedia = otherMedia.slice(-5);
        recentMedia.forEach(media => {
          const folderName = media.folder?.name || 'Unknown';
          console.log(`   📄 ${media.name} (${folderName}) - ${media.provider}`);
          console.log(`      🔗 URL: ${media.url}`);
          if (media.formats) {
            console.log(`      📐 Formats:`);
            Object.entries(media.formats).forEach(([formatName, format]) => {
              console.log(`         ${formatName}: ${format.url} (${format.width}x${format.height})`);
            });
          }
          console.log(`      🏷️  Provider: ${media.provider}`);
          console.log(`      📊 Provider Metadata:`, media.provider_metadata);
          console.log('');
        });
      }
      
      await pauseForConfirmation('Review the media reference verification above');
      
      // Save data after step completion
      this.saveData();
      
    } catch (error) {
      logResult(false, 'Failed to verify media references', error.message);
      throw error;
    }
  }

  /**
   * Generate Cloudinary format URLs for an image
   */
  generateCloudinaryFormats(image) {
    const baseUrl = `https://res.cloudinary.com/${cloudinaryName}/image/upload`;
    const version = image.version;
    const publicId = image.publicId;
    const format = image.format;
    
    return {
      thumbnail: {
        ext: `.${format}`,
        url: `${baseUrl}/c_limit,w_156,h_156,q_auto:good/v${version}/${publicId}.${format}`,
        hash: `thumbnail_${publicId.split('/').pop()}`,
        mime: `image/${format}`,
        name: `thumbnail_${publicId.split('/').pop()}.${format}`,
        width: Math.min(156, image.width),
        height: Math.min(156, image.height),
        sizeInBytes: Math.round(image.bytes * 0.1) // Estimate
      },
      small: {
        ext: `.${format}`,
        url: `${baseUrl}/c_limit,w_500,h_500,q_auto:good/v${version}/${publicId}.${format}`,
        hash: `small_${publicId.split('/').pop()}`,
        mime: `image/${format}`,
        name: `small_${publicId.split('/').pop()}.${format}`,
        width: Math.min(500, image.width),
        height: Math.min(500, image.height),
        sizeInBytes: Math.round(image.bytes * 0.3) // Estimate
      },
      medium: {
        ext: `.${format}`,
        url: `${baseUrl}/c_limit,w_750,h_750,q_auto:good/v${version}/${publicId}.${format}`,
        hash: `medium_${publicId.split('/').pop()}`,
        mime: `image/${format}`,
        name: `medium_${publicId.split('/').pop()}.${format}`,
        width: Math.min(750, image.width),
        height: Math.min(750, image.height),
        sizeInBytes: Math.round(image.bytes * 0.6) // Estimate
      },
      large: {
        ext: `.${format}`,
        url: `${baseUrl}/c_limit,w_1000,h_1000,q_auto:good/v${version}/${publicId}.${format}`,
        hash: `large_${publicId.split('/').pop()}`,
        mime: `image/${format}`,
        name: `large_${publicId.split('/').pop()}.${format}`,
        width: Math.min(1000, image.width),
        height: Math.min(1000, image.height),
        sizeInBytes: Math.round(image.bytes * 0.8) // Estimate
      }
    };
  }

  /**
   * Helper: Flatten folder structure for easier processing
   */
  flattenFolderStructure(folders, parent = null) {
    const result = [];
    
    for (const folder of folders) {
      result.push({
        id: folder.id,
        name: folder.name,
        parentId: parent ? parent.id : null,
        parent: parent ? parent.name : null
      });
      
      if (folder.children && folder.children.length > 0) {
        result.push(...this.flattenFolderStructure(folder.children, folder));
      }
    }
    
    return result;
  }

  /**
   * Main execution function
   */
  async run() {
    const args = process.argv.slice(2);
    const specificStep = args.find(arg => arg.startsWith('--step='))?.split('=')[1];
    this.dryRun = args.includes('--dry-run');
    const clearData = args.includes('--clear-data');
    const purgeStrapi = args.includes('--purge-strapi');
    
    console.log('🎯 STEP-BY-STEP CLOUDINARY-STRAPI MIGRATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (this.dryRun) {
      console.log('🧪 RUNNING IN DRY RUN MODE - No changes will be made');
    }
    
    if (clearData) {
      this.clearData();
    }
    
    // Load existing data at the start
    this.loadData();
    
    try {
      // Only run cleanup if --purge-strapi flag is provided or step 0 is specifically requested
      if (purgeStrapi || specificStep === '0') {
        await this.step0_CleanupExistingAssets();
      }
      
      if (specificStep === '0') {
        // If only step 0 was requested, stop here
        return;
      }
      
      if (!specificStep || specificStep === '1') {
        await this.step1_DiscoverCloudinaryFolders();
      }
      
      if (!specificStep || specificStep === '2') {
        await this.step2_DiscoverStrapiFolders();
      }
      
      if (!specificStep || specificStep === '3') {
        await this.step3_CreateFolderMapping();
      }
      
      if (!specificStep || specificStep === '4') {
        await this.step4_CreateMissingFolders();
      }
      
      if (!specificStep || specificStep === '5') {
        await this.step5_VerifyFolderStructure();
      }
      
      if (!specificStep || specificStep === '6') {
        await this.step6_DiscoverCloudinaryImages();
      }
      
      if (!specificStep || specificStep === '7') {
        await this.step7_CreateStrapiMediaReferences();
      }
      
      if (!specificStep || specificStep === '8') {
        await this.step8_VerifyMediaReferences();
      }
      
      console.log('\n✅ MIGRATION COMPLETE!');
      console.log('📊 Summary:');
      console.log(`   📂 Cloudinary folders: ${this.cloudinaryFolders.length}`);
      console.log(`   📁 Strapi folders: ${this.strapiFolders.length}`);
      console.log(`   🆕 Created folders: ${this.createdFolders.length}`);
      console.log(`   📸 Cloudinary images: ${this.cloudinaryImages.length}`);
      
    } catch (error) {
      console.error('\n❌ MIGRATION FAILED:', error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  }
}

// Main execution
if (require.main === module) {
  const migrator = new StepByStepMigrator();
  migrator.run().catch(console.error);
}

module.exports = StepByStepMigrator;
