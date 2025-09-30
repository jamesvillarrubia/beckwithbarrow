# Step-by-Step Migration Usage Guide

## Overview
The step-by-step migration script breaks down the Cloudinary-to-Strapi migration into discrete, verifiable steps with clear logging and user confirmation.

## Usage Options

### 1. Run All Steps (Recommended)
```bash
source strapi-cloud.env && source cloudinary.env && node scripts/step-by-step-migration.js
```

### 2. Run Specific Step
```bash
# Run only step 1 (discover Cloudinary folders)
node scripts/step-by-step-migration.js --step=1

# Run only step 4 (create missing folders)
node scripts/step-by-step-migration.js --step=4
```

### 3. Dry Run (See what would happen)
```bash
# See what folders would be created without actually creating them
node scripts/step-by-step-migration.js --dry-run
```

### 4. Clear Data and Start Fresh
```bash
# Clear all saved migration data and start over
node scripts/step-by-step-migration.js --clear-data
```

### 5. Purge Existing Strapi Assets (Optional)
```bash
# Delete all existing Strapi media files before migration
node scripts/step-by-step-migration.js --purge-strapi

# Preview what would be deleted (dry run)
node scripts/step-by-step-migration.js --purge-strapi --dry-run
```

### 6. Data Persistence
The script automatically saves data between steps in `scripts/migration-data.json`. This allows you to:
- Run individual steps and maintain state
- Resume from where you left off
- Review saved data between sessions

## Step Breakdown

### Step 0: Cleanup Existing Strapi Assets (Optional)
- **Purpose**: Delete all existing media files from Strapi
- **Output**: List of files to be deleted
- **Action**: **MAKES CHANGES** - Deletes existing media files
- **Confirmation**: Review files to be deleted
- **Safety**: Use `--dry-run` to preview deletions
- **Usage**: Only runs with `--purge-strapi` flag or `--step=0`

### Step 1: Discover Cloudinary Folders
- **Purpose**: Fetch all folders from Cloudinary under `beckwithbarrow/`
- **Output**: List of 20 folders (agricola, buhn, butler, etc.)
- **Action**: Read-only, no changes made
- **Confirmation**: Review the folder list

### Step 2: Discover Strapi Folders  
- **Purpose**: Fetch current Strapi folder structure
- **Output**: List of existing Strapi folders with IDs
- **Action**: Read-only, no changes made
- **Confirmation**: Review the current structure

### Step 3: Create Folder Mapping
- **Purpose**: Compare Cloudinary vs Strapi folders
- **Output**: Shows which folders exist vs need creation
- **Action**: Analysis only, no changes made
- **Confirmation**: Review the mapping results

### Step 4: Create Missing Folders
- **Purpose**: Create new Strapi folders under "Project Photos"
- **Output**: Creates folders like `agricola`, `buhn`, `butler`, etc.
- **Action**: **MAKES CHANGES** - Creates new folders in Strapi
- **Confirmation**: Review creation results

### Step 5: Verify Folder Structure
- **Purpose**: Confirm all folders were created correctly
- **Output**: Shows final folder structure
- **Action**: Read-only, verification only
- **Confirmation**: Verify the structure looks correct

### Step 6: Discover Cloudinary Images
- **Purpose**: Fetch all images from Cloudinary folders
- **Output**: List of all Cloudinary images with metadata
- **Action**: Read-only, no changes made
- **Confirmation**: Review discovered images

### Step 7: Create Strapi Media References
- **Purpose**: Create Strapi media entries that reference Cloudinary URLs
- **Output**: Creates media references with Cloudinary URLs and formats
- **Action**: **MAKES CHANGES** - Creates new media entries in Strapi
- **Confirmation**: Review creation results

### Step 8: Verify Media References
- **Purpose**: Confirm all media references were created correctly
- **Output**: Shows final media structure and provider breakdown
- **Action**: Read-only, verification only
- **Confirmation**: Verify the media references look correct

## Safety Features

- **⏸️ Pause Between Steps**: Each step pauses for user confirmation
- **🧪 Dry Run Mode**: See what would happen without making changes
- **📊 Clear Logging**: Detailed output for each action
- **✅ Success/Failure Indicators**: Clear visual feedback
- **🛑 Early Exit**: Can stop at any step with Ctrl+C

## Expected Results

After running all steps, you should have:
- **20 new Strapi folders** under "Project Photos"
- **Exact name matching** with Cloudinary folders
- **Proper hierarchy**: Project Photos → individual project folders
- **No data loss** - all existing folders preserved

## Troubleshooting

### If Step 1 Fails:
- Check Cloudinary credentials in `cloudinary.env`
- Verify internet connection
- Check Cloudinary API limits

### If Step 2 Fails:
- Check Strapi credentials in `strapi-cloud.env`
- Verify Strapi API is accessible
- Check API token permissions

### If Step 4 Fails:
- Check Strapi API permissions
- Verify "Project Photos" folder exists (ID: 147)
- Check for duplicate folder names

## Next Steps

After folder creation is complete, the next phase will be:
1. **Create Strapi media references** for Cloudinary images
2. **Update existing references** to use Cloudinary URLs
3. **Clean up orphaned files**
