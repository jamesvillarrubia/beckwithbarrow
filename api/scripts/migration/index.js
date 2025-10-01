#!/usr/bin/env node

/**
 * STEP-BY-STEP CLOUDINARY-STRAPI MIGRATION
 * 
 * Modular migration system for syncing Cloudinary assets with Strapi media library.
 * Each step is now a separate module for better maintainability.
 */

const readline = require('readline');
const path = require('path');

// Import step modules
const step0 = require('./steps/step0-cleanup-existing-assets');
const step1 = require('./steps/step1-discover-cloudinary-folders');
const step2 = require('./steps/step2-discover-strapi-folders');
const step3 = require('./steps/step3-create-folder-mapping');
const step4 = require('./steps/step4-create-missing-folders');
const step5 = require('./steps/step5-verify-folder-structure');
const step6 = require('./steps/step6-discover-cloudinary-images');
const step7 = require('./steps/step7-validate-cloudinary-urls');
const step8 = require('./steps/step8-create-strapi-media-references');
const step9 = require('./steps/step9-verify-media-references');
const step10 = require('./steps/step10-cleanup-duplicates');
const step11 = require('./steps/step11-force-overwrite-formats');

// Import utilities
const { loadEnvironment, createApiClients, logStepHeader, logResult, pauseForConfirmation, saveToFile, loadFromFile } = require('./utils');

class StepByStepMigrator {
  constructor() {
    this.dryRun = false;
    this.step = 0;
    this.cloudinaryFolders = [];
    this.strapiFolders = [];
    this.folderMapping = new Map();
    this.createdFolders = [];
    this.cloudinaryImages = [];
    this.validCloudinaryImages = [];
    this.invalidCloudinaryImages = [];
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  // Load existing migration data
  loadState() {
    const state = loadFromFile('migration-data.json');
    if (state) {
      this.cloudinaryFolders = state.cloudinaryFolders || [];
      this.strapiFolders = state.strapiFolders || [];
      this.folderMapping = new Map(state.folderMapping || []);
      this.createdFolders = state.createdFolders || [];
      this.cloudinaryImages = state.cloudinaryImages || [];
      this.validCloudinaryImages = state.validCloudinaryImages || [];
      this.invalidCloudinaryImages = state.invalidCloudinaryImages || [];
      this.existingStrapiMedia = state.existingStrapiMedia || [];
      console.log('📁 Loaded existing migration data');
    } else {
      console.log('📁 No existing migration data found');
    }
  }

  // Save migration data
  saveState() {
    const state = {
      cloudinaryFolders: this.cloudinaryFolders,
      strapiFolders: this.strapiFolders,
      folderMapping: Array.from(this.folderMapping.entries()),
      createdFolders: this.createdFolders,
      cloudinaryImages: this.cloudinaryImages,
      validCloudinaryImages: this.validCloudinaryImages,
      invalidCloudinaryImages: this.invalidCloudinaryImages,
      existingStrapiMedia: this.existingStrapiMedia,
      lastUpdated: new Date().toISOString()
    };
    saveToFile('migration-data.json', state);
  }

  async run() {
    try {
      console.log('🎯 STEP-BY-STEP CLOUDINARY-STRAPI MIGRATION');
      console.log('━'.repeat(60));
      
      // Load existing migration data
      this.loadState();
      
      // Load environment and create API clients
      await loadEnvironment();
      const { cloudinaryApi, strapiApi } = createApiClients();
      
      // Parse command line arguments
      const args = process.argv.slice(2);
      const specificStep = args.find(arg => arg.startsWith('--step='))?.split('=')[1];
      const purgeStrapi = args.includes('--purge-strapi');
      this.dryRun = args.includes('--dry-run');
      
      // Execute steps
      if (purgeStrapi || specificStep === '0') {
        await step0.cleanupExistingAssets(strapiApi, this.dryRun, this.rl);
        this.saveState();
      }
      
      if (specificStep === '0') {
        console.log('✅ Cleanup complete. Exiting.');
        return;
      }
      
      if (!specificStep || specificStep === '1') {
        this.cloudinaryFolders = await step1.discoverCloudinaryFolders(cloudinaryApi, this.rl);
        this.saveState();
      }
      
      if (!specificStep || specificStep === '2') {
        this.strapiFolders = await step2.discoverStrapiFolders(strapiApi, this.rl);
        this.saveState();
      }
      
      if (!specificStep || specificStep === '3') {
        this.folderMapping = await step3.createFolderMapping(this.cloudinaryFolders, this.strapiFolders, this.rl);
        this.saveState();
      }
      
      if (!specificStep || specificStep === '4') {
        this.createdFolders = await step4.createMissingFolders(strapiApi, this.folderMapping, this.dryRun, this.rl);
        this.saveState();
      }
      
      if (!specificStep || specificStep === '5') {
        await step5.verifyFolderStructure(strapiApi, this.createdFolders, this.rl);
        this.saveState();
      }
      
      if (!specificStep || specificStep === '6') {
        this.cloudinaryImages = await step6.discoverCloudinaryImages(cloudinaryApi, this.rl);
        this.saveState();
      }
      
      if (!specificStep || specificStep === '7') {
        this.existingStrapiMedia = await step7.discoverExistingStrapiMedia(strapiApi, this.rl);
        this.saveState();
      }
      
      if (!specificStep || specificStep === '8') {
        await step8.syncCloudinaryWithStrapi(strapiApi, this.cloudinaryImages, this.existingStrapiMedia, this.folderMapping, this.dryRun, this.rl);
        this.saveState();
      }
      
      if (!specificStep || specificStep === '9') {
        await step9.verifyMediaReferences(strapiApi, this.rl);
        this.saveState();
      }
      
      if (!specificStep || specificStep === '10') {
        await step10.cleanupDuplicates(strapiApi, this.rl);
        this.saveState();
      }
      
      if (!specificStep || specificStep === '11') {
        await step11.forceOverwriteAllFormats(strapiApi, cloudinaryApi, this.dryRun, this.rl);
        this.saveState();
      }
      
      console.log('\n✅ MIGRATION COMPLETE!');
      console.log('📊 Summary:');
      console.log(`   📂 Cloudinary folders: ${this.cloudinaryFolders.length}`);
      console.log(`   📁 Strapi folders: ${this.strapiFolders.length}`);
      console.log(`   🆕 Created folders: ${this.createdFolders.length}`);
      console.log(`   📸 Cloudinary images: ${this.cloudinaryImages.length}`);
      console.log(`   ✅ Valid images: ${this.validCloudinaryImages.length}`);
      console.log(`   ❌ Invalid images: ${this.invalidCloudinaryImages.length}`);
      
    } catch (error) {
      console.error('\n❌ MIGRATION FAILED:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Main execution
if (require.main === module) {
  const migrator = new StepByStepMigrator();
  migrator.run().catch(console.error);
}

module.exports = StepByStepMigrator;
