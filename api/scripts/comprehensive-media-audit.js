/**
 * COMPREHENSIVE MEDIA AUDIT SCRIPT
 * 
 * Creates a complete audit and mapping between Cloudinary and Strapi media files:
 * - Fetches all Cloudinary images with metadata
 * - Fetches all existing Strapi media files
 * - Creates pairwise matching between Cloudinary and Strapi files
 * - Identifies missing files, incorrect storage locations, and format issues
 * - Generates migration plan for moving from local storage to Cloudinary references
 * - Maps Cloudinary formats (thumbnail, small, medium, large) to Strapi format structure
 * 
 * Usage:
 *   node comprehensive-media-audit.js
 *   node comprehensive-media-audit.js --format=csv
 *   node comprehensive-media-audit.js --output=audit-report.json
 *   node comprehensive-media-audit.js --test-mode  (limits to 1 folder for testing)
 */

require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '../strapi-cloud.env' });

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Cloudinary API setup
const cloudinaryApiKey = process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY;
const cloudinarySecret = process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET;
const cloudinaryName = process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;

if (!cloudinaryApiKey || !cloudinarySecret || !cloudinaryName) {
  console.error('❌ Missing Cloudinary credentials. Please check your .env file.');
  console.error('Required: CLOUDINARY_KEY, CLOUDINARY_SECRET, CLOUDINARY_NAME');
  process.exit(1);
}

const auth = Buffer.from(`${cloudinaryApiKey}:${cloudinarySecret}`).toString('base64');
const cloudinaryApi = axios.create({
  baseURL: `https://api.cloudinary.com/v1_1/${cloudinaryName}`,
  headers: { 'Authorization': `Basic ${auth}` }
});

// Strapi API setup
const strapiApi = axios.create({
  baseURL: process.env.STRAPI_CLOUD_BASE_URL || process.env.STRAPI_URL || 'http://localhost:1337',
  headers: {
    'Authorization': `Bearer ${process.env.STRAPI_CLOUD_API_TOKEN || process.env.STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Dynamic folder discovery - no hardcoded mappings
// The script will discover Cloudinary folders and create corresponding Strapi folders

// Image format types
const FORMAT_TYPES = ['thumbnail', 'small', 'medium', 'large'];

class MediaAuditor {
  constructor(testMode = false) {
    this.allImages = [];
    this.strapiFolders = [];
    this.strapiFiles = [];
    this.auditResults = [];
    this.testMode = testMode;
    this.cloudinaryToStrapiMatches = [];
    this.unmatchedCloudinaryImages = [];
    this.unmatchedStrapiFiles = [];
    this.cloudinaryFolders = [];
    this.folderMapping = new Map(); // Maps Cloudinary folder names to Strapi folder IDs
  }

  /**
   * Fetch all Cloudinary images with complete metadata
   */
  async fetchAllCloudinaryImages() {
    console.log('🔍 Fetching all Cloudinary images...');
    
    let allImages = [];
    let nextCursor = null;
    let page = 1;
    const maxPages = this.testMode ? 2 : 100; // Limit pages in test mode

    do {
      const params = {
        type: 'upload',
        max_results: this.testMode ? 50 : 500, // Smaller batches in test mode
        resource_type: 'image'
      };
      
      if (nextCursor) {
        params.next_cursor = nextCursor;
      }

      try {
        const response = await cloudinaryApi.get('/resources/image', { params });
        const images = response.data.resources || [];
        
        console.log(`   📄 Page ${page}: ${images.length} images`);
        allImages = allImages.concat(images);
        
        nextCursor = response.data.next_cursor;
        page++;
        
        // Add small delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Break early in test mode
        if (this.testMode && page > maxPages) {
          console.log(`🧪 Test mode: limiting to ${maxPages} pages`);
          break;
        }
        
      } catch (error) {
        console.error(`❌ Error fetching page ${page}:`, error.message);
        if (error.response?.status === 401) {
          console.error('❌ Cloudinary authentication failed. Please check your API credentials.');
        }
        break;
      }
    } while (nextCursor && page <= maxPages);

    console.log(`✅ Total images fetched: ${allImages.length}`);
    this.allImages = allImages;
    return allImages;
  }

  /**
   * Fetch all Strapi folders
   */
  async fetchStrapiFolders() {
    console.log('📁 Fetching Strapi folders...');
    
    try {
      // Try media plugin endpoint first
      let response;
      try {
        response = await strapiApi.get('/api/media/folders-structure');
      } catch (error) {
        if (error.response?.status === 404) {
          // Fallback to standard upload endpoint
          response = await strapiApi.get('/api/upload/folders');
        } else {
          throw error;
        }
      }
      
      this.strapiFolders = response.data || [];
      console.log(`✅ Found ${this.strapiFolders.length} Strapi folders`);
      
      return this.strapiFolders;
    } catch (error) {
      console.error('❌ Error fetching Strapi folders:', error.message);
      this.strapiFolders = [];
      return [];
    }
  }

  /**
   * Discover Cloudinary folder structure dynamically
   */
  async discoverCloudinaryFolders() {
    console.log('📁 Discovering Cloudinary folder structure...');
    
    try {
      // Fetch all folders under beckwithbarrow/
      const response = await cloudinaryApi.get('/folders/beckwithbarrow');
      const folders = response.data.folders || [];
      
      this.cloudinaryFolders = folders.map(folder => ({
        name: folder.name,
        path: folder.path,
        assetCount: folder.asset_count || 0
      }));
      
      console.log(`✅ Found ${this.cloudinaryFolders.length} Cloudinary folders:`);
      this.cloudinaryFolders.forEach(folder => {
        console.log(`   📂 ${folder.name} (${folder.assetCount} assets)`);
      });
      
      return this.cloudinaryFolders;
    } catch (error) {
      console.error('❌ Error discovering Cloudinary folders:', error.message);
      this.cloudinaryFolders = [];
      return [];
    }
  }

  /**
   * Create dynamic folder mapping between Cloudinary and Strapi
   */
  async createFolderMapping() {
    console.log('🔗 Creating dynamic folder mapping...');
    
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
          strapiId: strapiFolder.id,
          strapiName: strapiFolder.name,
          status: 'EXISTS',
          needsUpdate: strapiFolder.name !== cloudinaryFolder.name
        });
        console.log(`   ✅ ${cloudinaryFolder.name} → ${strapiFolder.name} (ID: ${strapiFolder.id})`);
      } else {
        // No match found - needs to be created
        this.folderMapping.set(cloudinaryFolder.name, {
          strapiId: null,
          strapiName: cloudinaryFolder.name, // Use exact Cloudinary name
          status: 'NEEDS_CREATION',
          needsUpdate: false
        });
        console.log(`   ⚠️  ${cloudinaryFolder.name} → NEEDS CREATION`);
      }
    }
    
    console.log(`✅ Folder mapping complete: ${this.folderMapping.size} folders mapped`);
    return this.folderMapping;
  }

  /**
   * Fetch all Strapi media files
   */
  async fetchStrapiMediaFiles() {
    console.log('🎬 Fetching all Strapi media files...');
    
    try {
      let allFiles = [];
      let page = 1;
      const pageSize = this.testMode ? 50 : 100;
      let hasMorePages = true;
      const maxPages = this.testMode ? 5 : 50; // Safety limit to prevent infinite loops
      
      while (hasMorePages && page <= maxPages) {
        let response;
        try {
          // Try media plugin endpoint first
          response = await strapiApi.get('/api/media/files', {
            params: {
              'pagination[page]': page,
              'pagination[pageSize]': pageSize
            }
          });
        } catch (error) {
          if (error.response?.status === 404) {
            // Fallback to standard upload endpoint
            response = await strapiApi.get('/api/upload/files', {
              params: {
                'pagination[page]': page,
                'pagination[pageSize]': pageSize
              }
            });
          } else {
            throw error;
          }
        }
        
        const files = response.data?.data || response.data || [];
        
        if (files.length === 0) {
          hasMorePages = false;
          break;
        }
        
        allFiles = allFiles.concat(files);
        console.log(`   📄 Page ${page}: ${files.length} files (total: ${allFiles.length})`);
        
        // Check if we got fewer files than requested (end of data)
        if (files.length < pageSize) {
          hasMorePages = false;
        } else {
          page++;
        }
        
        // Add small delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (page > maxPages) {
        console.warn(`⚠️  Reached maximum page limit (${maxPages}). There may be more files.`);
      }
      
      this.strapiFiles = allFiles;
      console.log(`✅ Total Strapi media files: ${allFiles.length}`);
      
      return allFiles;
    } catch (error) {
      console.error('❌ Error fetching Strapi media files:', error.response?.data || error.message);
      this.strapiFiles = [];
      return [];
    }
  }

  /**
   * Determine project from image public_id using dynamic folder mapping
   */
  determineProject(publicId) {
    const lowerPublicId = publicId.toLowerCase();
    
    // Remove format prefixes
    const cleanId = lowerPublicId
      .replace(/^(thumbnail_|small_|medium_|large_)/, '');
    
    // Check against discovered Cloudinary folders
    for (const [folderName, mapping] of this.folderMapping) {
      if (cleanId.startsWith(folderName + '_') || 
          cleanId.includes('/' + folderName + '/') ||
          cleanId.includes('/' + folderName + '_')) {
        return folderName;
      }
    }
    
    return null;
  }

  /**
   * Determine image format type
   */
  determineFormat(publicId) {
    const lowerPublicId = publicId.toLowerCase();
    
    for (const format of FORMAT_TYPES) {
      if (lowerPublicId.startsWith(format + '_')) {
        return format;
      }
    }
    
    return 'original';
  }

  /**
   * Generate proposed Cloudinary path
   */
  generateProposedCloudinaryPath(publicId, project, format) {
    if (!project) {
      // Keep unmatched images in a misc folder
      return `beckwithbarrow/misc/${publicId}`;
    }

    const cleanId = publicId
      .replace(/^(thumbnail_|small_|medium_|large_)/, '')
      .replace(new RegExp(`^${project}_`), '');

    if (format === 'original') {
      return `beckwithbarrow/${project}/${cleanId}`;
    } else {
      return `beckwithbarrow/${project}/${format}/${format}_${cleanId}`;
    }
  }

  /**
   * Extract base filename from Cloudinary public_id or Strapi filename
   */
  extractBaseFilename(identifier, isStrapi = false) {
    if (isStrapi) {
      // For Strapi files, remove Strapi-generated suffixes and extensions
      return identifier
        .replace(/\.[^.]+$/, '') // Remove extension
        .replace(/_[a-f0-9]{10}$/, '') // Remove Strapi hash suffix
        .replace(/^(thumbnail_|small_|medium_|large_)/, '') // Remove format prefixes
        .toLowerCase();
    } else {
      // For Cloudinary files, clean up the public_id
      return identifier
        .split('/').pop() // Get filename part
        .replace(/^(thumbnail_|small_|medium_|large_)/, '') // Remove format prefixes
        .replace(/\.[^.]+$/, '') // Remove extension
        .toLowerCase();
    }
  }

  /**
   * Create pairwise matching between Cloudinary and Strapi files
   * CLOUDINARY IS THE SOURCE OF TRUTH - Every Cloudinary image should have a Strapi reference
   */
  async createPairwiseMatching() {
    console.log('🔄 Creating pairwise matching between Cloudinary and Strapi files...');
    console.log('   📋 Cloudinary is the source of truth - every image should have a Strapi reference');
    
    const matches = [];
    const unmatchedCloudinary = [...this.allImages];
    const unmatchedStrapi = [...this.strapiFiles];
    
    // Create a map of Strapi files by base filename for faster lookup
    const strapiFileMap = new Map();
    this.strapiFiles.forEach(file => {
      const baseFilename = this.extractBaseFilename(file.name, true);
      if (!strapiFileMap.has(baseFilename)) {
        strapiFileMap.set(baseFilename, []);
      }
      strapiFileMap.get(baseFilename).push(file);
    });
    
    // Match Cloudinary images to Strapi files (Cloudinary-first approach)
    for (let i = unmatchedCloudinary.length - 1; i >= 0; i--) {
      const cloudinaryImage = unmatchedCloudinary[i];
      const cloudinaryBaseFilename = this.extractBaseFilename(cloudinaryImage.public_id, false);
      
      const matchingStrapiFiles = strapiFileMap.get(cloudinaryBaseFilename) || [];
      
      if (matchingStrapiFiles.length > 0) {
        // Found a match - create match record
        const strapiFile = matchingStrapiFiles[0]; // Take the first match
        
        matches.push({
          cloudinaryImage,
          strapiFile,
          matchType: 'FILENAME_MATCH',
          matchConfidence: this.calculateMatchConfidence(cloudinaryImage, strapiFile),
          issues: this.identifyMatchIssues(cloudinaryImage, strapiFile)
        });
        
        // Remove from unmatched lists
        unmatchedCloudinary.splice(i, 1);
        const strapiIndex = unmatchedStrapi.findIndex(f => f.id === strapiFile.id);
        if (strapiIndex >= 0) {
          unmatchedStrapi.splice(strapiIndex, 1);
        }
        
        // Remove from strapiFileMap
        matchingStrapiFiles.shift();
        if (matchingStrapiFiles.length === 0) {
          strapiFileMap.delete(cloudinaryBaseFilename);
        }
      }
    }
    
    this.cloudinaryToStrapiMatches = matches;
    this.unmatchedCloudinaryImages = unmatchedCloudinary;
    this.unmatchedStrapiFiles = unmatchedStrapi;
    
    console.log(`✅ Matching complete:`);
    console.log(`   📊 Matched pairs: ${matches.length}`);
    console.log(`   🔍 Unmatched Cloudinary images: ${unmatchedCloudinary.length} (NEED STRAPI REFERENCES)`);
    console.log(`   🔍 Unmatched Strapi files: ${unmatchedStrapi.length} (POTENTIALLY ORPHANED)`);
    
    return { matches, unmatchedCloudinary, unmatchedStrapi };
  }

  /**
   * Calculate match confidence between Cloudinary and Strapi files
   */
  calculateMatchConfidence(cloudinaryImage, strapiFile) {
    let confidence = 0;
    
    // Base filename match
    const cloudinaryBase = this.extractBaseFilename(cloudinaryImage.public_id, false);
    const strapiBase = this.extractBaseFilename(strapiFile.name, true);
    if (cloudinaryBase === strapiBase) confidence += 50;
    
    // Dimension match
    if (cloudinaryImage.width === strapiFile.width && cloudinaryImage.height === strapiFile.height) {
      confidence += 30;
    }
    
    // File size similarity (within 10%)
    if (cloudinaryImage.bytes && strapiFile.size) {
      const sizeDiff = Math.abs(cloudinaryImage.bytes - (strapiFile.size * 1024)) / cloudinaryImage.bytes;
      if (sizeDiff < 0.1) confidence += 20;
    }
    
    return Math.min(confidence, 100);
  }

  /**
   * Identify issues with matched files
   */
  identifyMatchIssues(cloudinaryImage, strapiFile) {
    const issues = [];
    
    // Check if Strapi file is using local storage instead of Cloudinary
    if (strapiFile.provider !== 'cloudinary' && strapiFile.url && !strapiFile.url.includes('cloudinary.com')) {
      issues.push('USING_LOCAL_STORAGE');
    }
    
    // Check if URLs don't match
    if (strapiFile.url !== cloudinaryImage.secure_url) {
      issues.push('URL_MISMATCH');
    }
    
    // Check if formats are missing or incorrect
    if (!strapiFile.formats || Object.keys(strapiFile.formats).length === 0) {
      issues.push('MISSING_FORMATS');
    } else {
      // Check if format URLs point to Cloudinary
      const formatIssues = Object.entries(strapiFile.formats).filter(([formatName, formatData]) => 
        !formatData.url || !formatData.url.includes('cloudinary.com')
      );
      if (formatIssues.length > 0) {
        issues.push('FORMAT_URLs_NOT_CLOUDINARY');
      }
    }
    
    // Check folder assignment
    const project = this.determineProject(cloudinaryImage.public_id);
    if (project && PROJECT_FOLDERS[project]) {
      const expectedFolderId = PROJECT_FOLDERS[project].strapiId;
      if (strapiFile.folder?.id !== expectedFolderId) {
        issues.push('WRONG_FOLDER');
      }
    }
    
    return issues;
  }

  /**
   * Generate proposed Strapi folder info using dynamic mapping
   */
  generateProposedStrapiFolder(project) {
    if (!project || !this.folderMapping.has(project)) {
      return {
        folderId: null,
        folderName: 'Miscellaneous',
        folderPath: '/Miscellaneous'
      };
    }

    const folderMapping = this.folderMapping.get(project);
    return {
      folderId: folderMapping.strapiId,
      folderName: folderMapping.strapiName,
      folderPath: `/${folderMapping.strapiName}`,
      status: folderMapping.status,
      needsCreation: folderMapping.status === 'NEEDS_CREATION'
    };
  }

  /**
   * Determine action needed for each image
   */
  determineAction(currentPath, proposedPath, project) {
    if (currentPath === proposedPath) {
      return 'NO_ACTION';
    }

    if (currentPath.includes('/') && proposedPath.includes('/')) {
      return 'MOVE_FOLDER';
    }

    if (!currentPath.includes('/') && proposedPath.includes('/')) {
      return 'MOVE_TO_FOLDER';
    }

    if (currentPath.includes('direct_uploads/')) {
      if (project) {
        return 'CLEANUP_DUPLICATE';
      } else {
        return 'REVIEW_MANUAL';
      }
    }

    return 'REVIEW_MANUAL';
  }

  /**
   * Generate comprehensive format mapping for Cloudinary images
   */
  generateCloudinaryFormats(cloudinaryImage) {
    const baseUrl = cloudinaryImage.secure_url;
    const publicId = cloudinaryImage.public_id;
    const project = this.determineProject(publicId);
    
    if (!baseUrl || !project) return {};
    
    // Extract base URL parts
    const urlParts = baseUrl.split('/');
    const cloudName = urlParts.find((part, index) => urlParts[index - 1] === 'cloudinary.com');
    const resourceType = urlParts[urlParts.indexOf(cloudName) + 1]; // usually 'image'
    const version = urlParts.find(part => part.startsWith('v'));
    
    const formats = {};
    
    // Generate format URLs based on Cloudinary transformations
    // Using c_limit for all formats to preserve aspect ratio and show full image
    const formatConfigs = {
      thumbnail: { 
        width: 156, 
        height: 156, 
        crop: 'limit', // Show full image, maintain aspect ratio
        quality: 'auto:good'
      },
      small: { 
        width: 500, 
        height: 500, 
        crop: 'limit', // Show full image, maintain aspect ratio
        quality: 'auto:good'
      },
      medium: { 
        width: 750, 
        height: 750, 
        crop: 'limit', // Show full image, maintain aspect ratio
        quality: 'auto:good'
      },
      large: { 
        width: 1000, 
        height: 1000, 
        crop: 'limit', // Show full image, maintain aspect ratio
        quality: 'auto:good'
      }
    };
    
    Object.entries(formatConfigs).forEach(([formatName, config]) => {
      // Build transformation string with all parameters
      let transformation = `c_${config.crop},w_${config.width},h_${config.height}`;
      
      if (config.gravity) {
        transformation += `,g_${config.gravity}`;
      }
      
      if (config.quality) {
        transformation += `,q_${config.quality}`;
      }
      
      const formatUrl = `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${transformation}/${version}/${publicId}.${cloudinaryImage.format}`;
      
      // Calculate expected dimensions based on crop mode
      let expectedWidth = config.width;
      let expectedHeight = config.height;
      
      if (config.crop === 'limit') {
        // For 'limit' crop, dimensions will be constrained by aspect ratio
        // We'll use the original image dimensions to calculate the actual output size
        const originalAspectRatio = cloudinaryImage.width / cloudinaryImage.height;
        const maxAspectRatio = config.width / config.height;
        
        if (originalAspectRatio > maxAspectRatio) {
          // Image is wider than target ratio
          expectedWidth = config.width;
          expectedHeight = Math.round(config.width / originalAspectRatio);
        } else {
          // Image is taller than target ratio
          expectedHeight = config.height;
          expectedWidth = Math.round(config.height * originalAspectRatio);
        }
      }
      
      formats[formatName] = {
        ext: `.${cloudinaryImage.format}`,
        url: formatUrl,
        hash: `${formatName}_${publicId.split('/').pop()}`,
        mime: `image/${cloudinaryImage.format}`,
        name: `${formatName}_${publicId.split('/').pop()}.${cloudinaryImage.format}`,
        path: null,
        width: expectedWidth,
        height: expectedHeight,
        sizeInBytes: null, // Will be estimated
        transformation: transformation, // Store the transformation for reference
        cropMode: config.crop,
        maintainsAspectRatio: config.crop === 'limit'
      };
    });
    
    return formats;
  }

  /**
   * Audit all images and generate comprehensive action plan
   */
  async auditAllImages() {
    console.log('📊 Analyzing all images and generating comprehensive action plan...');
    
    const results = [];
    
    // Process matched pairs
    for (const match of this.cloudinaryToStrapiMatches) {
      const { cloudinaryImage, strapiFile, matchConfidence, issues } = match;
      const publicId = cloudinaryImage.public_id;
      const project = this.determineProject(publicId);
      const format = this.determineFormat(publicId);
      const proposedCloudinaryPath = this.generateProposedCloudinaryPath(publicId, project, format);
      const proposedStrapi = this.generateProposedStrapiFolder(project);
      const proposedFormats = this.generateCloudinaryFormats(cloudinaryImage);
      
      const auditItem = {
        // Match Info
        matchType: 'MATCHED_PAIR',
        matchConfidence,
        issues,
        
        // Current Cloudinary Info
        currentPublicId: publicId,
        currentPath: publicId.includes('/') ? publicId.split('/').slice(0, -1).join('/') : 'ROOT',
        currentFilename: publicId.split('/').pop(),
        
        // Current Strapi Info
        strapiId: strapiFile.id,
        strapiName: strapiFile.name,
        strapiUrl: strapiFile.url,
        strapiProvider: strapiFile.provider,
        strapiFolderId: strapiFile.folder?.id || null,
        strapiFolderName: strapiFile.folder?.name || null,
        strapiFormats: strapiFile.formats || {},
        
        // Image Metadata
        width: cloudinaryImage.width || null,
        height: cloudinaryImage.height || null,
        bytes: cloudinaryImage.bytes || null,
        format: cloudinaryImage.format || null,
        createdAt: cloudinaryImage.created_at || null,
        secureUrl: cloudinaryImage.secure_url || null,
        
        // Analysis
        detectedProject: project,
        detectedFormat: format,
        
        // Proposed Cloudinary Structure
        proposedCloudinaryPath: proposedCloudinaryPath,
        proposedCloudinaryFolder: proposedCloudinaryPath.split('/').slice(0, -1).join('/'),
        proposedCloudinaryFilename: proposedCloudinaryPath.split('/').pop(),
        
        // Proposed Strapi Structure
        proposedStrapiFolderId: proposedStrapi.folderId,
        proposedStrapiFolderName: proposedStrapi.folderName,
        proposedStrapiFolderPath: proposedStrapi.folderPath,
        proposedFormats,
        
        // Action Plan
        actionRequired: this.determineMatchedPairAction(issues),
        priority: this.determineMatchedPairPriority(issues),
        
        // Additional Info
        isOrganized: publicId === proposedCloudinaryPath,
        isUsingCloudinary: strapiFile.provider === 'cloudinary' && strapiFile.url?.includes('cloudinary.com'),
        hasCorrectFormats: this.validateFormats(strapiFile.formats, proposedFormats),
        needsReview: issues.includes('WRONG_FOLDER') || issues.includes('URL_MISMATCH')
      };

      results.push(auditItem);
    }
    
    // Process unmatched Cloudinary images
    for (const image of this.unmatchedCloudinaryImages) {
      const publicId = image.public_id;
      const project = this.determineProject(publicId);
      const format = this.determineFormat(publicId);
      const proposedCloudinaryPath = this.generateProposedCloudinaryPath(publicId, project, format);
      const proposedStrapi = this.generateProposedStrapiFolder(project);
      const proposedFormats = this.generateCloudinaryFormats(image);
      
      const auditItem = {
        // Match Info
        matchType: 'UNMATCHED_CLOUDINARY',
        matchConfidence: 0,
        issues: ['MISSING_IN_STRAPI'],
        
        // Current Cloudinary Info
        currentPublicId: publicId,
        currentPath: publicId.includes('/') ? publicId.split('/').slice(0, -1).join('/') : 'ROOT',
        currentFilename: publicId.split('/').pop(),
        
        // Current Strapi Info (none)
        strapiId: null,
        strapiName: null,
        strapiUrl: null,
        strapiProvider: null,
        strapiFolderId: null,
        strapiFolderName: null,
        strapiFormats: {},
        
        // Image Metadata
        width: image.width || null,
        height: image.height || null,
        bytes: image.bytes || null,
        format: image.format || null,
        createdAt: image.created_at || null,
        secureUrl: image.secure_url || null,
        
        // Analysis
        detectedProject: project,
        detectedFormat: format,
        
        // Proposed Cloudinary Structure
        proposedCloudinaryPath: proposedCloudinaryPath,
        proposedCloudinaryFolder: proposedCloudinaryPath.split('/').slice(0, -1).join('/'),
        proposedCloudinaryFilename: proposedCloudinaryPath.split('/').pop(),
        
        // Proposed Strapi Structure
        proposedStrapiFolderId: proposedStrapi.folderId,
        proposedStrapiFolderName: proposedStrapi.folderName,
        proposedStrapiFolderPath: proposedStrapi.folderPath,
        proposedFormats,
        
        // Action Plan
        actionRequired: 'CREATE_STRAPI_REFERENCE',
        priority: project ? 2 : 4,
        
        // Additional Info
        isOrganized: publicId === proposedCloudinaryPath,
        isUsingCloudinary: false,
        hasCorrectFormats: false,
        needsReview: !project
      };

      results.push(auditItem);
    }
    
    // Process unmatched Strapi files
    for (const file of this.unmatchedStrapiFiles) {
      const auditItem = {
        // Match Info
        matchType: 'UNMATCHED_STRAPI',
        matchConfidence: 0,
        issues: ['MISSING_IN_CLOUDINARY'],
        
        // Current Cloudinary Info (none)
        currentPublicId: null,
        currentPath: null,
        currentFilename: null,
        
        // Current Strapi Info
        strapiId: file.id,
        strapiName: file.name,
        strapiUrl: file.url,
        strapiProvider: file.provider,
        strapiFolderId: file.folder?.id || null,
        strapiFolderName: file.folder?.name || null,
        strapiFormats: file.formats || {},
        
        // Image Metadata
        width: file.width || null,
        height: file.height || null,
        bytes: file.size ? file.size * 1024 : null,
        format: file.ext?.replace('.', '') || null,
        createdAt: file.createdAt || null,
        secureUrl: file.url || null,
        
        // Analysis
        detectedProject: null,
        detectedFormat: 'original',
        
        // Proposed structures (unknown without Cloudinary match)
        proposedCloudinaryPath: null,
        proposedCloudinaryFolder: null,
        proposedCloudinaryFilename: null,
        proposedStrapiFolderId: null,
        proposedStrapiFolderName: null,
        proposedStrapiFolderPath: null,
        proposedFormats: {},
        
        // Action Plan
        actionRequired: file.provider === 'cloudinary' ? 'REVIEW_ORPHANED_CLOUDINARY' : 'DELETE_LOCAL_FILE',
        priority: file.provider === 'cloudinary' ? 3 : 1,
        
        // Additional Info
        isOrganized: false,
        isUsingCloudinary: file.provider === 'cloudinary' && file.url?.includes('cloudinary.com'),
        hasCorrectFormats: false,
        needsReview: true
      };

      results.push(auditItem);
    }

    this.auditResults = results;
    console.log(`✅ Comprehensive audit complete: ${results.length} items analyzed`);
    
    return results;
  }

  /**
   * Determine action for matched pairs based on issues
   */
  determineMatchedPairAction(issues) {
    if (issues.length === 0) return 'NO_ACTION';
    
    if (issues.includes('USING_LOCAL_STORAGE')) return 'MIGRATE_TO_CLOUDINARY';
    if (issues.includes('URL_MISMATCH')) return 'UPDATE_STRAPI_URL';
    if (issues.includes('FORMAT_URLs_NOT_CLOUDINARY')) return 'UPDATE_FORMAT_URLS';
    if (issues.includes('MISSING_FORMATS')) return 'ADD_FORMATS';
    if (issues.includes('WRONG_FOLDER')) return 'MOVE_TO_CORRECT_FOLDER';
    
    return 'REVIEW_MANUAL';
  }

  /**
   * Determine priority for matched pairs based on issues
   */
  determineMatchedPairPriority(issues) {
    if (issues.length === 0) return 0; // No action needed
    if (issues.includes('USING_LOCAL_STORAGE')) return 1; // High priority - using local storage
    if (issues.includes('FORMAT_URLs_NOT_CLOUDINARY')) return 2; // High priority - formats not using Cloudinary
    if (issues.includes('URL_MISMATCH')) return 2; // High priority - URL mismatch
    if (issues.includes('MISSING_FORMATS')) return 3; // Medium priority - missing formats
    if (issues.includes('WRONG_FOLDER')) return 3; // Medium priority - wrong folder
    return 4; // Low priority - needs manual review
  }

  /**
   * Validate if current formats match proposed formats
   */
  validateFormats(currentFormats, proposedFormats) {
    if (!currentFormats || Object.keys(currentFormats).length === 0) return false;
    if (!proposedFormats || Object.keys(proposedFormats).length === 0) return false;
    
    const currentFormatKeys = Object.keys(currentFormats).sort();
    const proposedFormatKeys = Object.keys(proposedFormats).sort();
    
    // Check if all proposed formats exist in current formats
    return proposedFormatKeys.every(key => currentFormatKeys.includes(key)) &&
           // Check if all current format URLs point to Cloudinary
           Object.values(currentFormats).every(format => 
             format.url && format.url.includes('cloudinary.com')
           );
  }

  /**
   * Determine priority for actions (legacy method for backwards compatibility)
   */
  determinePriority(action, project) {
    if (action === 'NO_ACTION') return 0;
    if (action === 'CLEANUP_DUPLICATE') return 1;
    if (action === 'MOVE_TO_FOLDER' && project) return 2;
    if (action === 'MOVE_FOLDER') return 3;
    return 4; // REVIEW_MANUAL
  }

  /**
   * Generate comprehensive summary statistics
   */
  generateSummary() {
    const summary = {
      totalItems: this.auditResults.length,
      totalCloudinaryImages: this.allImages.length,
      totalStrapiFiles: this.strapiFiles.length,
      
      // Folder statistics
      totalCloudinaryFolders: this.cloudinaryFolders.length,
      totalStrapiFolders: this.strapiFolders.length,
      folderMappingStatus: {
        exists: 0,
        needsCreation: 0,
        needsUpdate: 0
      },
      
      // Matching statistics
      matchedPairs: this.cloudinaryToStrapiMatches.length,
      unmatchedCloudinary: this.unmatchedCloudinaryImages.length,
      unmatchedStrapi: this.unmatchedStrapiFiles.length,
      
      // Breakdown by match type
      byMatchType: {},
      
      // Action breakdown
      byAction: {},
      
      // Project breakdown
      byProject: {},
      
      // Storage provider breakdown
      byProvider: {
        cloudinary: 0,
        localStrapi: 0,
        other: 0
      },
      
      // Issue breakdown
      byIssues: {},
      
      // Priority breakdown
      byPriority: {
        0: 0, // No action
        1: 0, // Critical - using local storage
        2: 0, // High - URL/format issues
        3: 0, // Medium - organization issues
        4: 0  // Low - needs review
      },
      
      // Format status
      formatStatus: {
        hasCorrectFormats: 0,
        missingFormats: 0,
        incorrectFormatUrls: 0
      }
    };

    // Calculate folder mapping status
    this.folderMapping.forEach((mapping, folderName) => {
      if (mapping.status === 'EXISTS') {
        summary.folderMappingStatus.exists++;
        if (mapping.needsUpdate) {
          summary.folderMappingStatus.needsUpdate++;
        }
      } else if (mapping.status === 'NEEDS_CREATION') {
        summary.folderMappingStatus.needsCreation++;
      }
    });

    this.auditResults.forEach(item => {
      // By match type
      summary.byMatchType[item.matchType] = (summary.byMatchType[item.matchType] || 0) + 1;
      
      // By action
      summary.byAction[item.actionRequired] = (summary.byAction[item.actionRequired] || 0) + 1;
      
      // By project
      const project = item.detectedProject || 'unmatched';
      summary.byProject[project] = (summary.byProject[project] || 0) + 1;
      
      // By provider
      if (item.isUsingCloudinary) {
        summary.byProvider.cloudinary++;
      } else if (item.strapiProvider === 'strapi-provider-upload-strapi-cloud' || 
                 (item.strapiUrl && item.strapiUrl.includes('strapiapp.com'))) {
        summary.byProvider.localStrapi++;
      } else if (item.strapiProvider) {
        summary.byProvider.other++;
      }
      
      // By issues
      if (item.issues && Array.isArray(item.issues)) {
        item.issues.forEach(issue => {
          summary.byIssues[issue] = (summary.byIssues[issue] || 0) + 1;
        });
      }
      
      // By priority
      summary.byPriority[item.priority] = (summary.byPriority[item.priority] || 0) + 1;
      
      // Format status
      if (item.hasCorrectFormats) {
        summary.formatStatus.hasCorrectFormats++;
      } else if (item.issues && item.issues.includes('MISSING_FORMATS')) {
        summary.formatStatus.missingFormats++;
      } else if (item.issues && item.issues.includes('FORMAT_URLs_NOT_CLOUDINARY')) {
        summary.formatStatus.incorrectFormatUrls++;
      }
    });

    return summary;
  }

  /**
   * Output results in specified format
   */
  async outputResults(format = 'json', outputFile = null) {
    const summary = this.generateSummary();
    const timestamp = Date.now();
    
    console.log('\n📊 COMPREHENSIVE MEDIA AUDIT SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Total Items Analyzed: ${summary.totalItems}`);
    console.log(`🖼️  Cloudinary Images: ${summary.totalCloudinaryImages}`);
    console.log(`📁 Strapi Files: ${summary.totalStrapiFiles}`);
    
    console.log('\n📂 Folder Structure:');
    console.log(`   ☁️  Cloudinary Folders: ${summary.totalCloudinaryFolders}`);
    console.log(`   📁 Strapi Folders: ${summary.totalStrapiFolders}`);
    console.log(`   ✅ Existing Mappings: ${summary.folderMappingStatus.exists}`);
    console.log(`   ⚠️  Need Creation: ${summary.folderMappingStatus.needsCreation}`);
    console.log(`   🔄 Need Update: ${summary.folderMappingStatus.needsUpdate}`);
    
    console.log('\n🔗 Matching Results:');
    console.log(`   ✅ Matched Pairs: ${summary.matchedPairs}`);
    console.log(`   🔍 Unmatched Cloudinary: ${summary.unmatchedCloudinary}`);
    console.log(`   🔍 Unmatched Strapi: ${summary.unmatchedStrapi}`);
    
    console.log('\n🎯 Actions Required:');
    Object.entries(summary.byAction).forEach(([action, count]) => {
      console.log(`   ${action}: ${count} items`);
    });
    
    console.log('\n📁 By Project:');
    Object.entries(summary.byProject).forEach(([project, count]) => {
      console.log(`   ${project}: ${count} items`);
    });
    
    console.log('\n💾 Storage Provider Breakdown:');
    console.log(`   ☁️  Using Cloudinary: ${summary.byProvider.cloudinary}`);
    console.log(`   🏠 Using Local Strapi: ${summary.byProvider.localStrapi}`);
    console.log(`   ❓ Other Providers: ${summary.byProvider.other}`);
    
    console.log('\n🚨 Issues Detected:');
    Object.entries(summary.byIssues).forEach(([issue, count]) => {
      console.log(`   ${issue}: ${count} items`);
    });
    
    console.log('\n📍 Priority Breakdown:');
    console.log(`   🟢 Priority 0 (No Action): ${summary.byPriority[0]}`);
    console.log(`   🔴 Priority 1 (Critical - Local Storage): ${summary.byPriority[1]}`);
    console.log(`   🟠 Priority 2 (High - URL/Format Issues): ${summary.byPriority[2]}`);
    console.log(`   🟡 Priority 3 (Medium - Organization): ${summary.byPriority[3]}`);
    console.log(`   ⚫ Priority 4 (Low - Manual Review): ${summary.byPriority[4]}`);
    
    console.log('\n🖼️  Format Status:');
    console.log(`   ✅ Correct Formats: ${summary.formatStatus.hasCorrectFormats}`);
    console.log(`   ❌ Missing Formats: ${summary.formatStatus.missingFormats}`);
    console.log(`   🔗 Incorrect Format URLs: ${summary.formatStatus.incorrectFormatUrls}`);

    // Save detailed results
    const outputData = {
      timestamp,
      summary,
      matches: this.cloudinaryToStrapiMatches,
      unmatchedCloudinary: this.unmatchedCloudinaryImages,
      unmatchedStrapi: this.unmatchedStrapiFiles,
      auditResults: this.auditResults
    };

    const defaultFilename = `comprehensive-audit-${timestamp}.${format === 'csv' ? 'csv' : 'json'}`;
    const filename = outputFile || defaultFilename;

    if (format === 'csv') {
      await this.saveAsCSV(filename, this.auditResults);
    } else {
      await this.saveAsJSON(filename, outputData);
    }

    console.log(`\n💾 Detailed audit saved to: ${filename}`);
    return filename;
  }

  /**
   * Save results as JSON
   */
  async saveAsJSON(filename, data) {
    const fullPath = path.resolve(filename);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
  }

  /**
   * Save results as CSV
   */
  async saveAsCSV(filename, data) {
    const headers = [
      'matchType', 'matchConfidence', 'issues',
      'currentPublicId', 'currentPath', 'currentFilename',
      'strapiId', 'strapiName', 'strapiUrl', 'strapiProvider', 'strapiFolderId', 'strapiFolderName',
      'width', 'height', 'bytes', 'format', 'createdAt', 'secureUrl',
      'detectedProject', 'detectedFormat',
      'proposedCloudinaryPath', 'proposedCloudinaryFolder', 'proposedCloudinaryFilename',
      'proposedStrapiFolderId', 'proposedStrapiFolderName', 'proposedStrapiFolderPath',
      'actionRequired', 'priority', 'isOrganized', 'isUsingCloudinary', 'hasCorrectFormats', 'needsReview'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(item => 
        headers.map(header => {
          let value = item[header];
          if (value === null || value === undefined) return '';
          if (Array.isArray(value)) value = value.join(';');
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return value;
        }).join(',')
      )
    ].join('\n');

    const fullPath = path.resolve(filename);
    fs.writeFileSync(fullPath, csvContent);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'json';
  const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || null;
  const testMode = args.includes('--test-mode');

  console.log('🎯 COMPREHENSIVE CLOUDINARY-STRAPI MEDIA AUDIT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (testMode) {
    console.log('🧪 Running in TEST MODE - limited scope for safety');
  }

  const auditor = new MediaAuditor(testMode);

  try {
    // Fetch all data
    console.log('📡 Fetching data from both Cloudinary and Strapi...');
    await Promise.all([
      auditor.fetchAllCloudinaryImages(),
      auditor.fetchStrapiFolders(),
      auditor.fetchStrapiMediaFiles()
    ]);
    
    // Discover Cloudinary folder structure dynamically
    await auditor.discoverCloudinaryFolders();
    
    // Create dynamic folder mapping
    await auditor.createFolderMapping();
    
    // Create pairwise matching
    await auditor.createPairwiseMatching();
    
    // Perform comprehensive audit
    await auditor.auditAllImages();
    
    // Output results
    const outputFilename = await auditor.outputResults(format, outputFile);
    
    console.log('\n✅ COMPREHENSIVE AUDIT COMPLETE!');
    console.log(`📄 Full report: ${outputFilename}`);
    console.log('\n🎯 Next Steps:');
    console.log('   1. Review the detailed audit file');
    console.log('   2. Focus on Priority 1 items (files using local storage)');
    console.log('   3. Address Priority 2 items (URL and format issues)');
    console.log('   4. Create Strapi references for unmatched Cloudinary images');
    console.log('   5. Clean up orphaned Strapi files');
    console.log('\n📋 Key Actions to Take:');
    console.log('   • MIGRATE_TO_CLOUDINARY: Update Strapi files to reference Cloudinary URLs');
    console.log('   • UPDATE_FORMAT_URLS: Fix format URLs to point to Cloudinary');
    console.log('   • CREATE_STRAPI_REFERENCE: Add missing Cloudinary images to Strapi');
    console.log('   • DELETE_LOCAL_FILE: Remove unnecessary local files');
    
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    if (error.response?.data) {
      console.error('📄 Error details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MediaAuditor;
