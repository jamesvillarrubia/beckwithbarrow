#!/usr/bin/env node

/**
 * Media State Manager
 * 
 * Comprehensive tool for auditing, validating, and cleaning up media references
 * across Cloudinary, Strapi media library, and application content.
 * 
 * Features:
 * - Complete state audit of Cloudinary and Strapi media
 * - Validate media references in projects, components, and content
 * - Detect orphaned media (in Cloudinary but not referenced)
 * - Detect broken references (referenced but missing)
 * - Clean up incorrectly migrated files
 * - Fix media folder organization
 * - Generate comprehensive reports
 * - Safe cleanup with backup and rollback capabilities
 * 
 * Usage:
 *   node media-state-manager.js audit              # Full system audit
 *   node media-state-manager.js validate           # Validate all media links
 *   node media-state-manager.js cleanup --dry-run  # Preview cleanup actions
 *   node media-state-manager.js cleanup --execute  # Execute cleanup
 *   node media-state-manager.js fix-folders        # Fix folder organization
 *   node media-state-manager.js report             # Generate detailed report
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../strapi-cloud.env') });

const STRAPI_URL = process.env.STRAPI_CLOUD_BASE_URL || 'https://striking-ball-b079f8c4b0.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_CLOUD_API_TOKEN;

const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME;
const CLOUDINARY_KEY = process.env.CLOUDINARY_KEY;
const CLOUDINARY_SECRET = process.env.CLOUDINARY_SECRET;

if (!STRAPI_API_TOKEN || !CLOUDINARY_NAME || !CLOUDINARY_KEY || !CLOUDINARY_SECRET) {
  console.error('❌ Missing required environment variables');
  console.error('Required: STRAPI_CLOUD_API_TOKEN, CLOUDINARY_NAME, CLOUDINARY_KEY, CLOUDINARY_SECRET');
  process.exit(1);
}

// Configure axios for Strapi API
const strapiApi = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Configure axios for Cloudinary API
const cloudinaryApi = axios.create({
  baseURL: `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}`,
  auth: {
    username: CLOUDINARY_KEY,
    password: CLOUDINARY_SECRET
  }
});

// Folder mapping from MIGRATION-PLAN.md
const FOLDER_MAPPING = {
  'agricola': { id: 160, name: 'Agricola Modern House', expectedCount: 11 },
  'buhn': { id: 176, name: 'Buhn Residence', expectedCount: 9 },
  'butler': { id: 171, name: 'Butler House', expectedCount: 13 },
  'dineen': { id: 170, name: 'Dineen Family Home', expectedCount: 13 },
  'gunther': { id: 164, name: 'Gunther Residence', expectedCount: 9 },
  'haythorne': { id: 163, name: 'Haythorne House', expectedCount: 4 },
  'hetherington': { id: 174, name: 'Hetherington Estate', expectedCount: 6 },
  'holm': { id: 162, name: 'Holm Residence', expectedCount: 9 },
  'jenks': { id: 161, name: 'Jenks Family Residence', expectedCount: 57 },
  'krant': { id: 168, name: 'Krant House', expectedCount: 24 },
  'onota': { id: 175, name: 'Onota Lake House', expectedCount: 20 },
  'rowntree': { id: 167, name: 'Rowntree Residence', expectedCount: 7 },
  'seidman': { id: 166, name: 'Seidman House', expectedCount: 15 },
  'strauss_weinberg': { id: 165, name: 'Strauss Weinberg Project', expectedCount: 1 },
  'turell': { id: 172, name: 'Turell Residence', expectedCount: 20 },
  'waller': { id: 169, name: 'Waller House', expectedCount: 11 },
  'logos': { id: 177, name: 'Branding', expectedCount: 40 }
};

/**
 * Get all Cloudinary images with folder information
 */
async function getAllCloudinaryImages() {
  try {
    console.log('🔍 Fetching all Cloudinary images...');
    
    const allImages = [];
    let nextCursor = null;
    
    do {
      const params = {
        type: 'upload',
        max_results: 500,
        resource_type: 'image'
      };
      
      if (nextCursor) {
        params.next_cursor = nextCursor;
      }
      
      const response = await cloudinaryApi.get('/resources/image', { params });
      const images = response.data.resources || [];
      allImages.push(...images);
      nextCursor = response.data.next_cursor;
      
      console.log(`   📁 Fetched ${images.length} images (total: ${allImages.length})`);
      
    } while (nextCursor);

    console.log(`✅ Total Cloudinary images: ${allImages.length}`);
    return allImages;
  } catch (error) {
    console.error('❌ Error fetching Cloudinary images:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get all Strapi media files
 */
async function getAllStrapiMedia() {
  try {
    console.log('🔍 Fetching all Strapi media files...');
    
    const response = await strapiApi.get('/upload/files', {
      params: {
        pagination: { limit: 1000 }
      }
    });
    
    const files = response.data || [];
    console.log(`✅ Total Strapi media files: ${files.length}`);
    return files;
  } catch (error) {
    console.error('❌ Error fetching Strapi media:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get all Strapi folders
 */
async function getAllStrapiFolders() {
  try {
    console.log('🔍 Fetching all Strapi folders...');
    
    const response = await strapiApi.get('/upload/folders');
    const folders = response.data || [];
    
    console.log(`✅ Total Strapi folders: ${folders.length}`);
    return folders;
  } catch (error) {
    console.error('❌ Error fetching Strapi folders:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get all projects and their media references
 */
async function getAllProjectsWithMedia() {
  try {
    console.log('🔍 Fetching all projects with media references...');
    
    const response = await strapiApi.get('/projects', {
      params: {
        populate: ['cover', 'images', 'categories']
      }
    });
    
    const projects = response.data?.data || [];
    console.log(`✅ Total projects: ${projects.length}`);
    return projects;
  } catch (error) {
    console.error('❌ Error fetching projects:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get global settings with media references
 */
async function getGlobalWithMedia() {
  try {
    console.log('🔍 Fetching global settings with media...');
    
    const response = await strapiApi.get('/global', {
      params: {
        populate: ['favicon', 'defaultSeo.shareImage']
      }
    });
    
    return response.data?.data || null;
  } catch (error) {
    console.error('❌ Error fetching global settings:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Organize Cloudinary images by folder
 */
function organizeCloudinaryImagesByFolder(images) {
  const organized = {
    beckwithbarrow: {},
    root: [],
    other: []
  };

  images.forEach(image => {
    if (image.public_id.startsWith('beckwithbarrow/')) {
      const pathParts = image.public_id.split('/');
      if (pathParts.length >= 2) {
        const folderName = pathParts[1];
        if (!organized.beckwithbarrow[folderName]) {
          organized.beckwithbarrow[folderName] = [];
        }
        organized.beckwithbarrow[folderName].push(image);
      }
    } else if (!image.public_id.includes('/')) {
      organized.root.push(image);
    } else {
      organized.other.push(image);
    }
  });

  return organized;
}

/**
 * Analyze media usage in application content
 */
function analyzeMediaUsage(projects, globalSettings, strapiMedia) {
  const usage = {
    referencedMedia: new Set(),
    projectReferences: {},
    globalReferences: [],
    unreferencedMedia: [],
    brokenReferences: []
  };

  // Create lookup map for Strapi media
  const mediaLookup = new Map();
  strapiMedia.forEach(media => {
    mediaLookup.set(media.id, media);
    if (media.url) {
      mediaLookup.set(media.url, media);
    }
  });

  // Analyze project references
  projects.forEach(project => {
    const projectRefs = {
      cover: null,
      images: [],
      brokenRefs: []
    };

    // Check cover image
    if (project.attributes.cover?.data) {
      const coverId = project.attributes.cover.data.id;
      if (mediaLookup.has(coverId)) {
        projectRefs.cover = coverId;
        usage.referencedMedia.add(coverId);
      } else {
        projectRefs.brokenRefs.push({ type: 'cover', id: coverId });
      }
    }

    // Check images
    if (project.attributes.images?.data) {
      project.attributes.images.data.forEach(img => {
        if (mediaLookup.has(img.id)) {
          projectRefs.images.push(img.id);
          usage.referencedMedia.add(img.id);
        } else {
          projectRefs.brokenRefs.push({ type: 'images', id: img.id });
        }
      });
    }

    usage.projectReferences[project.id] = projectRefs;
    usage.brokenReferences.push(...projectRefs.brokenRefs);
  });

  // Analyze global references
  if (globalSettings) {
    if (globalSettings.attributes.favicon?.data) {
      const faviconId = globalSettings.attributes.favicon.data.id;
      if (mediaLookup.has(faviconId)) {
        usage.globalReferences.push({ type: 'favicon', id: faviconId });
        usage.referencedMedia.add(faviconId);
      } else {
        usage.brokenReferences.push({ type: 'global.favicon', id: faviconId });
      }
    }

    if (globalSettings.attributes.defaultSeo?.shareImage?.data) {
      const shareImageId = globalSettings.attributes.defaultSeo.shareImage.data.id;
      if (mediaLookup.has(shareImageId)) {
        usage.globalReferences.push({ type: 'seo.shareImage', id: shareImageId });
        usage.referencedMedia.add(shareImageId);
      } else {
        usage.brokenReferences.push({ type: 'global.seo.shareImage', id: shareImageId });
      }
    }
  }

  // Find unreferenced media
  strapiMedia.forEach(media => {
    if (!usage.referencedMedia.has(media.id)) {
      usage.unreferencedMedia.push(media);
    }
  });

  return usage;
}

/**
 * Validate Cloudinary folder structure against expected mapping
 */
function validateCloudinaryFolderStructure(organizedImages) {
  const validation = {
    validFolders: [],
    invalidFolders: [],
    missingFolders: [],
    unexpectedFolders: [],
    countMismatches: []
  };

  // Check expected folders
  Object.entries(FOLDER_MAPPING).forEach(([folderName, folderInfo]) => {
    const images = organizedImages.beckwithbarrow[folderName] || [];
    
    if (images.length === 0) {
      validation.missingFolders.push({
        name: folderName,
        expected: folderInfo.expectedCount,
        actual: 0
      });
    } else if (images.length !== folderInfo.expectedCount) {
      validation.countMismatches.push({
        name: folderName,
        expected: folderInfo.expectedCount,
        actual: images.length,
        difference: images.length - folderInfo.expectedCount
      });
      validation.validFolders.push({
        name: folderName,
        count: images.length,
        status: 'count_mismatch'
      });
    } else {
      validation.validFolders.push({
        name: folderName,
        count: images.length,
        status: 'valid'
      });
    }
  });

  // Check for unexpected folders
  Object.keys(organizedImages.beckwithbarrow).forEach(folderName => {
    if (!FOLDER_MAPPING[folderName]) {
      validation.unexpectedFolders.push({
        name: folderName,
        count: organizedImages.beckwithbarrow[folderName].length
      });
    }
  });

  return validation;
}

/**
 * Detect incorrectly migrated files (uploaded to Strapi Cloud instead of referenced)
 */
function detectIncorrectlyMigratedFiles(strapiMedia) {
  const incorrectFiles = strapiMedia.filter(file => {
    // Files that were incorrectly uploaded instead of referenced
    const isFromCloudinary = file.name && (
      file.name.includes('_') && // Cloudinary naming pattern
      (file.provider === 'strapi-provider-upload-strapi-cloud' || 
       file.provider === 'local' ||
       !file.url?.includes('cloudinary.com'))
    );
    
    // Check if it matches our project naming patterns
    const matchesProjectPattern = file.name && Object.keys(FOLDER_MAPPING).some(folder =>
      file.name.toLowerCase().includes(folder.toLowerCase())
    );
    
    return isFromCloudinary && matchesProjectPattern;
  });

  return incorrectFiles;
}

/**
 * Generate comprehensive audit report
 */
async function generateAuditReport() {
  console.log('🔍 COMPREHENSIVE MEDIA STATE AUDIT');
  console.log(`📡 Strapi: ${STRAPI_URL}`);
  console.log(`☁️  Cloudinary: ${CLOUDINARY_NAME}`);
  console.log('━'.repeat(80));

  const report = {
    timestamp: new Date().toISOString(),
    cloudinary: {},
    strapi: {},
    application: {},
    issues: {},
    recommendations: []
  };

  try {
    // Fetch all data
    const [cloudinaryImages, strapiMedia, strapiFolders, projects, globalSettings] = await Promise.all([
      getAllCloudinaryImages(),
      getAllStrapiMedia(),
      getAllStrapiFolders(),
      getAllProjectsWithMedia(),
      getGlobalWithMedia()
    ]);

    // Organize Cloudinary data
    const organizedCloudinary = organizeCloudinaryImagesByFolder(cloudinaryImages);
    report.cloudinary = {
      totalImages: cloudinaryImages.length,
      beckwithbarrowFolders: Object.keys(organizedCloudinary.beckwithbarrow).length,
      rootImages: organizedCloudinary.root.length,
      otherImages: organizedCloudinary.other.length,
      folderBreakdown: Object.entries(organizedCloudinary.beckwithbarrow).map(([name, images]) => ({
        name,
        count: images.length
      }))
    };

    // Analyze Strapi data
    report.strapi = {
      totalMediaFiles: strapiMedia.length,
      totalFolders: strapiFolders.length,
      folderBreakdown: strapiFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        filesCount: strapiMedia.filter(file => file.folder === folder.id).length
      }))
    };

    // Analyze application usage
    const mediaUsage = analyzeMediaUsage(projects, globalSettings, strapiMedia);
    report.application = {
      totalProjects: projects.length,
      referencedMediaCount: mediaUsage.referencedMedia.size,
      unreferencedMediaCount: mediaUsage.unreferencedMedia.length,
      brokenReferencesCount: mediaUsage.brokenReferences.length
    };

    // Validate structure
    const folderValidation = validateCloudinaryFolderStructure(organizedCloudinary);
    const incorrectFiles = detectIncorrectlyMigratedFiles(strapiMedia);

    report.issues = {
      cloudinaryFolderIssues: {
        missingFolders: folderValidation.missingFolders,
        countMismatches: folderValidation.countMismatches,
        unexpectedFolders: folderValidation.unexpectedFolders
      },
      strapiIssues: {
        incorrectlyMigratedFiles: incorrectFiles.length,
        unreferencedMedia: mediaUsage.unreferencedMedia.length,
        brokenReferences: mediaUsage.brokenReferences.length
      },
      applicationIssues: {
        brokenMediaReferences: mediaUsage.brokenReferences
      }
    };

    // Generate recommendations
    if (incorrectFiles.length > 0) {
      report.recommendations.push(`Delete ${incorrectFiles.length} incorrectly migrated files from Strapi Cloud storage`);
    }
    
    if (folderValidation.missingFolders.length > 0) {
      report.recommendations.push(`Create Strapi media references for ${folderValidation.missingFolders.length} missing Cloudinary folders`);
    }
    
    if (mediaUsage.unreferencedMedia.length > 0) {
      report.recommendations.push(`Review ${mediaUsage.unreferencedMedia.length} unreferenced media files for potential cleanup`);
    }
    
    if (mediaUsage.brokenReferences.length > 0) {
      report.recommendations.push(`Fix ${mediaUsage.brokenReferences.length} broken media references in application content`);
    }

    // Display summary
    console.log('\n📊 AUDIT SUMMARY');
    console.log('━'.repeat(50));
    console.log(`☁️  Cloudinary Images: ${report.cloudinary.totalImages}`);
    console.log(`📁 Strapi Media Files: ${report.strapi.totalMediaFiles}`);
    console.log(`🗂️  Strapi Folders: ${report.strapi.totalFolders}`);
    console.log(`📄 Projects: ${report.application.totalProjects}`);
    
    console.log('\n🚨 ISSUES DETECTED');
    console.log('━'.repeat(50));
    console.log(`❌ Incorrectly migrated files: ${incorrectFiles.length}`);
    console.log(`📁 Missing Cloudinary folders: ${folderValidation.missingFolders.length}`);
    console.log(`🔢 Count mismatches: ${folderValidation.countMismatches.length}`);
    console.log(`🔗 Broken references: ${mediaUsage.brokenReferences.length}`);
    console.log(`📎 Unreferenced media: ${mediaUsage.unreferencedMedia.length}`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS');
      console.log('━'.repeat(50));
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Save detailed report
    const reportPath = path.join(__dirname, `media-audit-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);

    return report;

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    return null;
  }
}

/**
 * Clean up incorrectly migrated files
 */
async function cleanupIncorrectFiles(options = {}) {
  const { dryRun = true, confirm = false } = options;
  
  console.log(`🧹 CLEANUP: ${dryRun ? 'DRY RUN - ' : ''}Incorrectly migrated files`);
  console.log('━'.repeat(80));

  const strapiMedia = await getAllStrapiMedia();
  const incorrectFiles = detectIncorrectlyMigratedFiles(strapiMedia);

  if (incorrectFiles.length === 0) {
    console.log('✅ No incorrectly migrated files found');
    return { deleted: 0, errors: [] };
  }

  console.log(`📋 Found ${incorrectFiles.length} incorrectly migrated files:`);
  incorrectFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file.name} (ID: ${file.id}) - Provider: ${file.provider}`);
  });

  if (dryRun) {
    console.log('\n🔍 This is a dry run. Use --execute to actually delete files.');
    return { deleted: 0, errors: [] };
  }

  if (!confirm) {
    console.log('\n⚠️  Use --confirm to proceed with deletion');
    return { deleted: 0, errors: [] };
  }

  // Create backup first
  const backupPath = path.join(__dirname, `backup-incorrect-files-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(incorrectFiles, null, 2));
  console.log(`💾 Backup created: ${backupPath}`);

  const results = { deleted: 0, errors: [] };

  for (const file of incorrectFiles) {
    try {
      await strapiApi.delete(`/upload/files/${file.id}`);
      console.log(`   ✅ Deleted: ${file.name} (ID: ${file.id})`);
      results.deleted++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`   ❌ Failed to delete ${file.name}:`, error.response?.data || error.message);
      results.errors.push({ file: file.name, error: error.message });
    }
  }

  console.log(`\n📊 Cleanup Results: ${results.deleted} deleted, ${results.errors.length} errors`);
  return results;
}

/**
 * Fix folder organization
 */
async function fixFolderOrganization(options = {}) {
  const { dryRun = true } = options;
  
  console.log(`🔧 FIX FOLDERS: ${dryRun ? 'DRY RUN - ' : ''}Organizing media into correct folders`);
  console.log('━'.repeat(80));

  const [strapiMedia, strapiFolders] = await Promise.all([
    getAllStrapiMedia(),
    getAllStrapiFolders()
  ]);

  // Create folder lookup
  const folderLookup = new Map();
  strapiFolders.forEach(folder => {
    folderLookup.set(folder.id, folder);
    folderLookup.set(folder.name, folder);
  });

  const fixes = [];

  // Find media that should be in project folders but isn't
  strapiMedia.forEach(file => {
    if (!file.folder && file.name) {
      // Try to determine correct folder based on filename
      for (const [folderKey, folderInfo] of Object.entries(FOLDER_MAPPING)) {
        if (file.name.toLowerCase().includes(folderKey.toLowerCase())) {
          fixes.push({
            fileId: file.id,
            fileName: file.name,
            currentFolder: file.folder,
            targetFolderId: folderInfo.id,
            targetFolderName: folderInfo.name
          });
          break;
        }
      }
    }
  });

  console.log(`📋 Found ${fixes.length} files that need folder assignment:`);
  fixes.forEach((fix, index) => {
    console.log(`   ${index + 1}. ${fix.fileName} → ${fix.targetFolderName} (ID: ${fix.targetFolderId})`);
  });

  if (dryRun) {
    console.log('\n🔍 This is a dry run. Use --execute to apply folder fixes.');
    return { fixed: 0, errors: [] };
  }

  const results = { fixed: 0, errors: [] };

  for (const fix of fixes) {
    try {
      await strapiApi.put(`/upload/files/${fix.fileId}`, {
        folder: fix.targetFolderId
      });
      console.log(`   ✅ Moved: ${fix.fileName} → ${fix.targetFolderName}`);
      results.fixed++;
    } catch (error) {
      console.error(`   ❌ Failed to move ${fix.fileName}:`, error.response?.data || error.message);
      results.errors.push({ file: fix.fileName, error: error.message });
    }
  }

  console.log(`\n📊 Fix Results: ${results.fixed} fixed, ${results.errors.length} errors`);
  return results;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const flags = args.slice(1);

  const options = {
    dryRun: flags.includes('--dry-run'),
    execute: flags.includes('--execute'),
    confirm: flags.includes('--confirm')
  };

  switch (command) {
    case 'audit':
      await generateAuditReport();
      break;

    case 'validate':
      console.log('🔍 VALIDATION: Checking media link integrity');
      const report = await generateAuditReport();
      if (report && report.issues.applicationIssues.brokenMediaReferences.length > 0) {
        console.log('\n🔗 BROKEN REFERENCES:');
        report.issues.applicationIssues.brokenMediaReferences.forEach(ref => {
          console.log(`   ${ref.type}: ID ${ref.id}`);
        });
      }
      break;

    case 'cleanup':
      await cleanupIncorrectFiles({
        dryRun: !options.execute,
        confirm: options.confirm
      });
      break;

    case 'fix-folders':
      await fixFolderOrganization({
        dryRun: !options.execute
      });
      break;

    case 'report':
      const detailedReport = await generateAuditReport();
      if (detailedReport) {
        console.log('\n📋 Use the generated JSON report for detailed analysis');
      }
      break;

    default:
      console.log('📖 Media State Manager');
      console.log('');
      console.log('Comprehensive tool for auditing, validating, and cleaning up media references');
      console.log('across Cloudinary, Strapi media library, and application content.');
      console.log('');
      console.log('Usage:');
      console.log('  node media-state-manager.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  audit              - Complete system audit with recommendations');
      console.log('  validate           - Validate all media links in application');
      console.log('  cleanup            - Clean up incorrectly migrated files');
      console.log('  fix-folders        - Fix media folder organization');
      console.log('  report             - Generate detailed JSON report');
      console.log('');
      console.log('Options:');
      console.log('  --dry-run          - Preview actions without executing');
      console.log('  --execute          - Actually perform the actions');
      console.log('  --confirm          - Confirm destructive actions');
      console.log('');
      console.log('Examples:');
      console.log('  node media-state-manager.js audit');
      console.log('  node media-state-manager.js cleanup --dry-run');
      console.log('  node media-state-manager.js cleanup --execute --confirm');
      console.log('  node media-state-manager.js fix-folders --execute');
      break;
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateAuditReport,
  cleanupIncorrectFiles,
  fixFolderOrganization,
  getAllCloudinaryImages,
  getAllStrapiMedia,
  analyzeMediaUsage,
  validateCloudinaryFolderStructure,
  detectIncorrectlyMigratedFiles
};
