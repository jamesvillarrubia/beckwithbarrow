# Modular Cloudinary-Strapi Migration System

A clean, modular migration system for syncing Cloudinary assets with Strapi media library. Each step is now a separate module for better maintainability and debugging.

## 🏗️ **Structure**

```
scripts/migration/
├── index.js                    # Main orchestrator
├── utils.js                    # Shared utilities
├── steps/                      # Individual step modules
│   ├── step0-cleanup-existing-assets.js
│   ├── step1-discover-cloudinary-folders.js
│   ├── step2-discover-strapi-folders.js
│   ├── step3-create-folder-mapping.js
│   ├── step4-create-missing-folders.js
│   ├── step5-verify-folder-structure.js
│   ├── step6-discover-cloudinary-images.js
│   ├── step7-validate-cloudinary-urls.js
│   ├── step8-create-strapi-media-references.js
│   ├── step9-verify-media-references.js
│   └── step10-cleanup-duplicates.js
└── README.md                   # This file
```

## 🎯 **Step Overview**

### **Step 0: Cleanup Existing Assets** 🗑️
- **Purpose**: Optional cleanup to remove all existing Strapi media files
- **When to use**: When starting fresh or clearing existing data
- **Output**: Clean Strapi media library

### **Step 1: Discover Cloudinary Folders** 🔍
- **Purpose**: Discovers all folders in Cloudinary account
- **What it does**: Fetches folder structure and asset counts
- **Output**: List of Cloudinary folders with metadata

### **Step 2: Discover Strapi Folders** 📁
- **Purpose**: Discovers existing folders in Strapi
- **What it does**: Fetches Strapi folder hierarchy
- **Output**: List of existing Strapi folders

### **Step 3: Create Folder Mapping** 🔗
- **Purpose**: Maps Cloudinary folders to Strapi folders
- **What it does**: Identifies existing vs missing folders
- **Output**: Mapping between Cloudinary and Strapi folders

### **Step 4: Create Missing Folders** 🆕
- **Purpose**: Creates missing folders in Strapi
- **What it does**: Creates folders that exist in Cloudinary but not Strapi
- **Output**: New folders created in Strapi

### **Step 5: Verify Folder Structure** ✅
- **Purpose**: Confirms folder structure is correct
- **What it does**: Re-fetches and verifies folder hierarchy
- **Output**: Verification that folders are properly created

### **Step 6: Discover Cloudinary Images** 📸
- **Purpose**: Discovers all images in Cloudinary
- **What it does**: Fetches image metadata and URLs
- **Output**: List of Cloudinary images with metadata

### **Step 7: Validate Cloudinary URLs** 🔍
- **Purpose**: Validates Cloudinary URLs before creating Strapi references
- **What it does**: Tests URLs for accessibility (404 detection)
- **Output**: Valid vs invalid images, saves invalid URLs to file

### **Step 8: Create Strapi Media References** 📸
- **Purpose**: Creates/updates Strapi media entries for validated images
- **What it does**: Creates new media or updates existing ones
- **Output**: Strapi media entries referencing Cloudinary images

### **Step 9: Verify Media References** ✅
- **Purpose**: Validates existing Strapi media references
- **What it does**: Tests Cloudinary URLs in existing Strapi entries
- **Output**: Validation report and broken URL list

### **Step 10: Cleanup Duplicate Media Files** 🗑️
- **Purpose**: Removes duplicate media entries from Strapi
- **What it does**: Groups by base name, keeps oldest, deletes newer duplicates
- **Output**: Clean Strapi media library without duplicates

## 🚀 **Usage**

### **Run All Steps**
```bash
source strapi-cloud.env && node scripts/migrate.js
```

### **Run Specific Step**
```bash
source strapi-cloud.env && node scripts/migrate.js --step=7
```

### **Dry Run Mode**
```bash
source strapi-cloud.env && node scripts/migrate.js --dry-run
```

### **Cleanup and Start Fresh**
```bash
source strapi-cloud.env && node scripts/migrate.js --step=0
```

## 🎯 **Key Features**

- **Modular Design**: Each step is a separate, focused module
- **Clear Separation**: URL validation (Step 7) vs media creation (Step 8)
- **Parallel Processing**: Fast batch processing for large datasets
- **Error Handling**: Continues processing even if individual items fail
- **Data Persistence**: Saves progress and results between steps
- **Comprehensive Logging**: Detailed progress and error reporting
- **Dry Run Mode**: Test what would happen without making changes

## 🔧 **Environment Variables**

Required environment variables (loaded from `.env`, `strapi-cloud.env`, `cloudinary.env`):

- `CLOUDINARY_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_KEY` - Your Cloudinary API key
- `CLOUDINARY_SECRET` - Your Cloudinary API secret
- `STRAPI_CLOUD_BASE_URL` - Your Strapi Cloud base URL
- `STRAPI_CLOUD_API_TOKEN` - Your Strapi Cloud API token (with delete permissions)

## 📊 **Output Files**

The migration process creates several output files:

- `invalid-cloudinary-urls.json` - Images with broken Cloudinary URLs
- `broken-strapi-urls.json` - Strapi entries with broken Cloudinary links
- `failed-images.json` - Images that failed processing

## 🛠️ **Development**

Each step module exports a single function that:
- Takes required parameters (API clients, data, options)
- Returns processed data or results
- Handles errors gracefully
- Provides detailed logging

### **Adding New Steps**

1. Create a new file in `steps/` directory
2. Export a function with descriptive name
3. Import and call in `index.js`
4. Add to the step execution logic

### **Modifying Existing Steps**

Each step is self-contained, so you can modify individual steps without affecting others. The modular structure makes debugging and maintenance much easier.

## ✅ **Benefits of Modular Structure**

- **Easier Debugging**: Run individual steps to isolate issues
- **Better Maintainability**: Each step is focused and self-contained
- **Cleaner Code**: No more monolithic 1000+ line files
- **Reusable Components**: Steps can be used independently
- **Better Testing**: Each step can be tested in isolation
- **Clearer Documentation**: Each step has a single responsibility
