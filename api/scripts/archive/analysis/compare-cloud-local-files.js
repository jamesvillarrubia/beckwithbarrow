#!/usr/bin/env node

/**
 * Compare cloud API file list with local SQLite database
 * This script extracts file data from the cloud API response and compares it with local database
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Load environment variables
require('dotenv').config({ path: './strapi-cloud.env' });

async function compareCloudLocalFiles() {
    console.log('🔍 Comparing Cloud API files with local SQLite database...\n');

    try {
        // Read cloud files data
        const cloudFilesPath = './cloud-files-raw.json';
        if (!fs.existsSync(cloudFilesPath)) {
            console.error('❌ Cloud files data not found. Please run the API call first.');
            return;
        }

        const cloudDataRaw = fs.readFileSync(cloudFilesPath, 'utf8');
        
        // The API response is missing the JSON wrapper, let's fix it
        let cloudData;
        try {
            cloudData = JSON.parse(cloudDataRaw);
            console.log('✅ Successfully parsed raw JSON');
        } catch (error) {
            // If parsing fails, try to wrap it in a proper JSON structure
            console.log('⚠️  Raw response is not valid JSON, attempting to fix...');
            console.log('Error:', error.message);
            // The response starts with file data, so we need to wrap it properly
            const fixedJson = `{"data": [${cloudDataRaw}]}`;
            try {
                cloudData = JSON.parse(fixedJson);
                console.log('✅ Successfully parsed fixed JSON');
            } catch (fixError) {
                console.error('❌ Failed to parse even fixed JSON:', fixError.message);
                return;
            }
        }
        
        // Handle both array and object formats
        const cloudFiles = Array.isArray(cloudData) ? cloudData : (cloudData.data || []);
        console.log(`📊 Cloud API returned ${cloudFiles.length} files`);

        // Connect to local SQLite database
        const dbPath = './.tmp/data.db';
        if (!fs.existsSync(dbPath)) {
            console.error('❌ Local database not found at:', dbPath);
            return;
        }

        const db = new Database(dbPath);
        console.log('✅ Connected to local SQLite database');

        // Get local files data
        const localFiles = db.prepare('SELECT * FROM files ORDER BY id').all();
        console.log(`📊 Local database has ${localFiles.length} files`);

        // Extract cloud file IDs and names
        const cloudFileIds = new Set();
        const cloudFileNames = new Set();
        const cloudFileHashes = new Set();

        cloudFiles.forEach(file => {
            if (file.id) cloudFileIds.add(file.id);
            if (file.name) cloudFileNames.add(file.name);
            if (file.hash) cloudFileHashes.add(file.hash);
        });

        // Extract local file IDs and names
        const localFileIds = new Set();
        const localFileNames = new Set();
        const localFileHashes = new Set();

        localFiles.forEach(file => {
            if (file.id) localFileIds.add(file.id);
            if (file.name) localFileNames.add(file.name);
            if (file.hash) localFileHashes.add(file.hash);
        });

        // Compare IDs
        const cloudOnlyIds = [...cloudFileIds].filter(id => !localFileIds.has(id));
        const localOnlyIds = [...localFileIds].filter(id => !cloudFileIds.has(id));
        const commonIds = [...cloudFileIds].filter(id => localFileIds.has(id));

        // Compare names
        const cloudOnlyNames = [...cloudFileNames].filter(name => !localFileNames.has(name));
        const localOnlyNames = [...localFileNames].filter(name => !cloudFileNames.has(name));

        // Compare hashes
        const cloudOnlyHashes = [...cloudFileHashes].filter(hash => !localFileHashes.has(hash));
        const localOnlyHashes = [...localFileHashes].filter(hash => !cloudFileHashes.has(hash));

        console.log('\n📈 COMPARISON RESULTS:');
        console.log('='.repeat(50));
        
        console.log(`\n🆔 ID Comparison:`);
        console.log(`   Cloud only IDs: ${cloudOnlyIds.length}`);
        console.log(`   Local only IDs: ${localOnlyIds.length}`);
        console.log(`   Common IDs: ${commonIds.length}`);

        console.log(`\n📝 Name Comparison:`);
        console.log(`   Cloud only names: ${cloudOnlyNames.length}`);
        console.log(`   Local only names: ${localOnlyNames.length}`);

        console.log(`\n🔗 Hash Comparison:`);
        console.log(`   Cloud only hashes: ${cloudOnlyHashes.length}`);
        console.log(`   Local only hashes: ${localOnlyHashes.length}`);

        // Show some examples
        if (cloudOnlyIds.length > 0) {
            console.log(`\n🔍 Sample Cloud-only IDs: ${cloudOnlyIds.slice(0, 5).join(', ')}`);
        }

        if (localOnlyIds.length > 0) {
            console.log(`\n🔍 Sample Local-only IDs: ${localOnlyIds.slice(0, 5).join(', ')}`);
        }

        if (cloudOnlyNames.length > 0) {
            console.log(`\n🔍 Sample Cloud-only names: ${cloudOnlyNames.slice(0, 5).join(', ')}`);
        }

        if (localOnlyNames.length > 0) {
            console.log(`\n🔍 Sample Local-only names: ${localOnlyNames.slice(0, 5).join(', ')}`);
        }

        // Check for specific ID 1805 that was mentioned earlier
        const id1805InCloud = cloudFileIds.has(1805);
        const id1805InLocal = localFileIds.has(1805);
        
        console.log(`\n🎯 ID 1805 Status:`);
        console.log(`   In Cloud: ${id1805InCloud ? '✅ Yes' : '❌ No'}`);
        console.log(`   In Local: ${id1805InLocal ? '✅ Yes' : '❌ No'}`);

        // Show ID ranges
        const cloudIdRange = cloudFileIds.size > 0 ? 
            `Range: ${Math.min(...cloudFileIds)} - ${Math.max(...cloudFileIds)}` : 'No IDs';
        const localIdRange = localFileIds.size > 0 ? 
            `Range: ${Math.min(...localFileIds)} - ${Math.max(...localFileIds)}` : 'No IDs';

        console.log(`\n📊 ID Ranges:`);
        console.log(`   Cloud: ${cloudIdRange}`);
        console.log(`   Local: ${localIdRange}`);

        // Check for files with missing formats
        const localFilesWithEmptyFormats = localFiles.filter(file => 
            !file.formats || file.formats === 'null' || file.formats === ''
        );
        
        console.log(`\n🔧 Local Files with Empty/Missing Formats: ${localFilesWithEmptyFormats.length}`);
        if (localFilesWithEmptyFormats.length > 0) {
            console.log(`   Sample IDs: ${localFilesWithEmptyFormats.slice(0, 5).map(f => f.id).join(', ')}`);
        }

        db.close();
        console.log('\n✅ Comparison complete!');

    } catch (error) {
        console.error('❌ Error during comparison:', error.message);
        console.error(error.stack);
    }
}

// Run the comparison
compareCloudLocalFiles();
