#!/usr/bin/env node

/**
 * Delete All Media Library Assets from Strapi Cloud API
 * 
 * This script connects to your Strapi Cloud instance and deletes all media library assets.
 * It includes safety features like dry-run mode, confirmation prompts, and backup creation.
 * 
 * Usage:
 *   node scripts/delete-cloud-media.js [--dry-run] [--force] [--help]
 * 
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 *   --force      Skip confirmation prompts
 *   --help       Show this help message
 * 
 * Environment:
 *   Requires strapi-cloud.env file with:
 *   - STRAPI_CLOUD_BASE_URL
 *   - STRAPI_CLOUD_API_TOKEN
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables
require('dotenv').config({ path: './strapi-cloud.env' });

// Configuration
const CONFIG = {
    baseUrl: process.env.STRAPI_CLOUD_BASE_URL,
    apiToken: process.env.STRAPI_CLOUD_API_TOKEN,
    batchSize: 50, // Number of files to delete in each batch
    delayBetweenBatches: 1000, // Delay in milliseconds between batches
    maxRetries: 3,
    retryDelay: 2000
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Helper functions for colored output
const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    progress: (msg) => console.log(`${colors.cyan}[PROGRESS]${colors.reset} ${msg}`)
};

// Check if required environment variables are set
function checkEnvironment() {
    if (!CONFIG.baseUrl) {
        log.error('STRAPI_CLOUD_BASE_URL not set in strapi-cloud.env');
        process.exit(1);
    }
    
    if (!CONFIG.apiToken) {
        log.error('STRAPI_CLOUD_API_TOKEN not set in strapi-cloud.env');
        process.exit(1);
    }
    
    log.success('Environment configuration loaded');
    log.info(`Target URL: ${CONFIG.baseUrl}/api`);
}

// Create axios instance with authentication
function createApiClient() {
    return axios.create({
        baseURL: `${CONFIG.baseUrl}/api`,
        headers: {
            'Authorization': `Bearer ${CONFIG.apiToken}`,
            'Content-Type': 'application/json'
        },
        timeout: 30000
    });
}

// Fetch all media files from the API
async function fetchAllMediaFiles(apiClient) {
    log.info('Fetching all media files from Strapi Cloud...');
    
    let allFiles = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
        try {
            log.progress(`Fetching page ${page}...`);
            const response = await apiClient.get('/upload/files', {
                params: {
                    'pagination[page]': page,
                    'pagination[pageSize]': 100,
                    'sort': 'id:asc'
                }
            });
            
            // Handle both array response and object with data property
            let files = [];
            if (Array.isArray(response.data)) {
                files = response.data;
            } else if (response.data.data) {
                files = response.data.data;
            } else {
                files = [];
            }
            
            allFiles = allFiles.concat(files);
            
            log.progress(`Fetched ${files.length} files from page ${page} (total: ${allFiles.length})`);
            
            // Check if there are more pages
            // If response is an array, we got all files at once
            if (Array.isArray(response.data)) {
                hasMore = false;
            } else {
                const pagination = response.data.meta?.pagination;
                hasMore = pagination && page < pagination.pageCount;
            }
            page++;
            
        } catch (error) {
            log.error(`Failed to fetch page ${page}: ${error.message}`);
            if (error.response) {
                log.error(`Response status: ${error.response.status}`);
                log.error(`Response data: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }
    
    log.success(`Successfully fetched ${allFiles.length} media files`);
    return allFiles;
}

// Create a backup of the media files list
function createBackup(files) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = './backups/media-deletion';
    const backupFile = `${backupDir}/media-files-backup-${timestamp}.json`;
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupData = {
        timestamp: new Date().toISOString(),
        totalFiles: files.length,
        files: files.map(file => ({
            id: file.id,
            name: file.name,
            url: file.url,
            mime: file.mime,
            size: file.size,
            hash: file.hash,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt
        }))
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    log.success(`Backup created: ${backupFile}`);
    return backupFile;
}

// Check if a file exists before attempting to delete
async function checkFileExists(apiClient, file) {
    try {
        await apiClient.get(`/upload/files/${file.id}`);
        return true;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return false; // File doesn't exist
        }
        throw error; // Re-throw other errors
    }
}

// Delete a single file with retry logic
async function deleteFile(apiClient, file, retryCount = 0) {
    try {
        await apiClient.delete(`/upload/files/${file.id}`);
        return { success: true, file };
    } catch (error) {
        // If file doesn't exist (404), treat as successful deletion since we want to clean up orphaned refs
        if (error.response && error.response.status === 404) {
            log.warning(`File ${file.id} (${file.name}) no longer exists (orphaned reference), marking as deleted`);
            return { success: true, file, orphaned: true };
        }
        
        if (retryCount < CONFIG.maxRetries) {
            log.warning(`Failed to delete file ${file.id} (${file.name}), retrying... (${retryCount + 1}/${CONFIG.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
            return deleteFile(apiClient, file, retryCount + 1);
        } else {
            log.error(`Failed to delete file ${file.id} (${file.name}) after ${CONFIG.maxRetries} retries: ${error.message}`);
            return { success: false, file, error: error.message };
        }
    }
}

// Delete files in batches
async function deleteFilesInBatches(apiClient, files, isDryRun = false) {
    const totalFiles = files.length;
    let deletedCount = 0;
    let orphanedCount = 0;
    let failedCount = 0;
    const failedFiles = [];
    
    log.info(`Starting deletion of ${totalFiles} files in batches of ${CONFIG.batchSize}...`);
    
    for (let i = 0; i < files.length; i += CONFIG.batchSize) {
        const batch = files.slice(i, i + CONFIG.batchSize);
        const batchNumber = Math.floor(i / CONFIG.batchSize) + 1;
        const totalBatches = Math.ceil(files.length / CONFIG.batchSize);
        
        log.progress(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)...`);
        
        if (isDryRun) {
            log.info(`[DRY RUN] Would delete files: ${batch.map(f => `${f.id}:${f.name}`).join(', ')}`);
            deletedCount += batch.length;
        } else {
            // Process batch in parallel
            const deletePromises = batch.map(file => deleteFile(apiClient, file));
            const results = await Promise.all(deletePromises);
            
            // Count results
            results.forEach(result => {
                if (result.success) {
                    if (result.orphaned) {
                        orphanedCount++;
                    } else {
                        deletedCount++;
                    }
                } else {
                    failedCount++;
                    failedFiles.push(result);
                }
            });
        }
        
        // Add delay between batches to avoid rate limiting
        if (i + CONFIG.batchSize < files.length && !isDryRun) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
        }
    }
    
    return { deletedCount, orphanedCount, failedCount, failedFiles };
}

// Show help message
function showHelp() {
    console.log(`
Delete All Media Library Assets from Strapi Cloud API

Usage: node scripts/delete-cloud-media.js [OPTIONS]

Options:
  --dry-run    Show what would be deleted without actually deleting
  --force      Skip confirmation prompts
  --help       Show this help message

Environment:
  Requires strapi-cloud.env file with:
  - STRAPI_CLOUD_BASE_URL
  - STRAPI_CLOUD_API_TOKEN

Examples:
  node scripts/delete-cloud-media.js --dry-run    # Preview what would be deleted
  node scripts/delete-cloud-media.js --force      # Delete all files without confirmation
  node scripts/delete-cloud-media.js               # Delete with confirmation prompt

Safety Features:
  - Creates backup of file list before deletion
  - Batch processing to avoid overwhelming the API
  - Retry logic for failed deletions
  - Detailed logging and progress tracking
  - Dry-run mode for testing
`);
}

// Main execution function
async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const isForce = args.includes('--force');
    const showHelpFlag = args.includes('--help') || args.includes('-h');
    
    if (showHelpFlag) {
        showHelp();
        return;
    }
    
    log.info('=== Strapi Cloud Media Deletion ===');
    
    // Check environment
    checkEnvironment();
    
    // Create API client
    const apiClient = createApiClient();
    
    try {
        // Fetch all media files
        const files = await fetchAllMediaFiles(apiClient);
        
        if (files.length === 0) {
            log.success('No media files found to delete');
            return;
        }
        
        // Create backup
        if (!isDryRun) {
            createBackup(files);
        }
        
        // Show summary
        log.info(`Found ${files.length} media files to delete`);
        log.info(`Total size: ${files.reduce((sum, file) => sum + (file.size || 0), 0)} bytes`);
        
        // Show some examples
        if (files.length > 0) {
            log.info('Sample files:');
            files.slice(0, 5).forEach(file => {
                log.info(`  - ${file.id}: ${file.name} (${file.mime})`);
            });
            if (files.length > 5) {
                log.info(`  ... and ${files.length - 5} more files`);
            }
        }
        
        // Confirmation prompt (unless force or dry-run)
        if (!isForce && !isDryRun) {
            console.log('\n' + '='.repeat(60));
            log.warning('⚠️  WARNING: This will permanently delete ALL media files!');
            log.warning('⚠️  This action cannot be undone!');
            console.log('='.repeat(60));
            
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const answer = await new Promise(resolve => {
                rl.question('\nAre you absolutely sure you want to continue? Type "DELETE" to confirm: ', resolve);
            });
            
            rl.close();
            
            if (answer !== 'DELETE') {
                log.info('Deletion cancelled by user');
                return;
            }
        }
        
        // Perform deletion
        const startTime = Date.now();
        const results = await deleteFilesInBatches(apiClient, files, isDryRun);
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        // Show results
        console.log('\n' + '='.repeat(60));
        log.success('=== Deletion Complete ===');
        log.info(`Duration: ${duration} seconds`);
        
        if (isDryRun) {
            log.info(`[DRY RUN] Would have deleted: ${results.deletedCount} files`);
        } else {
            log.info(`Successfully deleted: ${results.deletedCount} files`);
            if (results.orphanedCount > 0) {
                log.info(`Cleaned up orphaned references: ${results.orphanedCount} files`);
            }
            if (results.failedCount > 0) {
                log.warning(`Failed to delete: ${results.failedCount} files`);
                log.warning('Check the logs above for details on failed deletions');
            }
        }
        
        if (results.failedFiles.length > 0) {
            log.error('Failed files:');
            results.failedFiles.forEach(failure => {
                log.error(`  - ${failure.file.id}: ${failure.file.name} (${failure.error})`);
            });
        }
        
    } catch (error) {
        log.error(`Script failed: ${error.message}`);
        if (error.response) {
            log.error(`API Response: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        log.error(`Unhandled error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = { main, deleteFilesInBatches, fetchAllMediaFiles };
