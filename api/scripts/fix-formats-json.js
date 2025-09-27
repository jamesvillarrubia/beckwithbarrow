#!/usr/bin/env node

/**
 * Fix Formats JSON Script
 * 
 * This script fixes the formats column in the files table by generating
 * proper format JSON structures based on existing file data.
 * 
 * The formats JSON should contain different image sizes (thumbnail, small, medium, large)
 * with their respective dimensions, URLs, and metadata.
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../.tmp/data.db');

// Color logging functions
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Generate formats JSON based on file dimensions and URL
function generateFormats(file) {
    const { name, ext, url, width, height, mime, hash, size: originalSizeKB } = file;
    
    // Parse the URL to extract base URL
    // Original: https://domain.com/filename_hash.ext
    // Target:   https://domain.com/size_filename_hash.ext
    const urlParts = url.split('/');
    const filename = urlParts.pop(); // Get the filename with hash
    const baseUrl = urlParts.join('/') + '/'; // Reconstruct base URL with trailing slash
    
    const formats = {};
    
    // Define standard Strapi image sizes
    const sizes = [
        { name: 'thumbnail', width: 245, height: Math.round((245 / width) * height) },
        { name: 'small', width: 500, height: Math.round((500 / width) * height) },
        { name: 'medium', width: 750, height: Math.round((750 / width) * height) },
        { name: 'large', width: 1000, height: Math.round((1000 / width) * height) }
    ];
    
    // Calculate original pixel count for scaling
    const originalPixels = width * height;
    const originalSizeBytes = Math.round(originalSizeKB * 1024);
    
    // Only generate formats for sizes smaller than the original
    sizes.forEach(size => {
        if (size.width < width) {
            // Create the resized filename: size_originalfilename
            const resizedFilename = `${size.name}_${filename}`;
            
            // Calculate size based on pixel ratio (more accurate than rough estimate)
            const resizedPixels = size.width * size.height;
            const pixelRatio = resizedPixels / originalPixels;
            
            // File size generally scales with pixel count, but not linearly
            // Use square root of pixel ratio for more realistic compression
            const sizeRatio = Math.sqrt(pixelRatio);
            const estimatedSizeBytes = Math.round(originalSizeBytes * sizeRatio);
            const estimatedSizeKB = Math.round((estimatedSizeBytes / 1024) * 100) / 100; // Round to 2 decimals
            
            // Create the hash for the resized image
            const resizedHash = `${size.name}_${hash}`;
            
            formats[size.name] = {
                ext: ext,
                url: `${baseUrl}${resizedFilename}`,
                hash: resizedHash,
                mime: mime,
                name: `${size.name}_${name}`,
                path: null,
                size: estimatedSizeKB,
                width: size.width,
                height: size.height,
                sizeInBytes: estimatedSizeBytes
            };
        }
    });
    
    return Object.keys(formats).length > 0 ? JSON.stringify(formats) : null;
}

// Main function
function fixFormats() {
    try {
        const db = new Database(dbPath);
        log('blue', 'Connected to SQLite database');

        // Get all files with empty or null formats, or force update all if requested
        const forceUpdate = process.argv.includes('--force');
        const whereClause = forceUpdate 
            ? "WHERE name != 'test.png'" // Skip test.png as it's our reference
            : "WHERE formats IS NULL OR formats = '' OR formats = 'null'";
            
        const query = db.prepare(`
            SELECT id, name, ext, mime, width, height, url, hash, size
            FROM files 
            ${whereClause}
        `);
        
        const rows = query.all();
        const updateType = forceUpdate ? "files to update with better size calculations" : "files with missing formats";
        log('yellow', `Found ${rows.length} ${updateType}`);

        if (rows.length === 0) {
            log('green', 'No files need format fixes');
            db.close();
            return;
        }

        // Prepare update statement
        const updateStmt = db.prepare(`
            UPDATE files 
            SET formats = ? 
            WHERE id = ?
        `);

        // Process each file
        let updated = 0;

        rows.forEach((file) => {
            try {
                const formats = generateFormats(file);
                
                if (formats) {
                    updateStmt.run(formats, file.id);
                    updated++;
                    log('green', `✓ Updated formats for: ${file.name}`);
                } else {
                    log('yellow', `⚠ Skipped ${file.name} (no formats needed)`);
                }
            } catch (error) {
                log('red', `Error updating file ${file.name}: ${error.message}`);
            }
        });

        log('blue', `\nProcessing complete:`);
        log('green', `  - ${updated} files updated successfully`);
        log('yellow', `  - ${rows.length - updated} files skipped or had errors`);
        
        db.close();
        log('blue', 'Database connection closed');
        
    } catch (error) {
        log('red', `Database error: ${error.message}`);
        throw error;
    }
}

// Run the script
if (require.main === module) {
    log('blue', '=== Fix Formats JSON Script ===');
    log('blue', 'Fixing empty formats columns in files table...\n');
    
    try {
        fixFormats();
        log('green', '\n=== Script completed successfully ===');
        process.exit(0);
    } catch (error) {
        log('red', `\n=== Script failed ===`);
        log('red', error.message);
        process.exit(1);
    }
}

module.exports = { fixFormats, generateFormats };