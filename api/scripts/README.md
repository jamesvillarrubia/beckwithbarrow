# Scripts Directory Organization

This directory contains various scripts for managing the Beckwith Barrow project's media assets and deployment. Scripts are organized by purpose and reusability.

## 🔧 Core Utilities (Keep - Reusable)

### Media Management
- **`folder-management.js`** - Comprehensive Strapi Media Library folder management
  - Create, list, update, delete folders
  - Organize files by patterns
  - **Status**: ✅ Production-ready, well-documented
  
- **`create-media-folders.js`** - Simple folder creation utility
  - **Status**: ✅ Keep for quick folder operations
  - **Note**: Overlaps with folder-management.js but simpler interface

- **`verify-cloudinary.js`** - Cloudinary connection testing
  - **Status**: ✅ Keep for troubleshooting

### Deployment & Infrastructure
- **`cloud-deploy.sh`** - Strapi Cloud deployment automation
  - **Status**: ✅ Production deployment script
  
- **`cloud-transfer.sh`** - Data transfer between environments
  - **Status**: ✅ Keep for environment sync

- **`backup.sh`** - Local backup creation
  - **Status**: ✅ Essential backup utility

- **`backup-cleanup.sh`** - Backup maintenance
  - **Status**: ✅ Keep for housekeeping

- **`cloud-backup.sh`** - Cloud backup automation
  - **Status**: ✅ Production backup script

### Development
- **`seed.js`** - Database seeding for development
  - **Status**: ✅ Development utility

## 🚧 Migration Scripts (Archive - One-time use)

These scripts were created for the Cloudinary-to-Strapi migration project:

### Completed Migration Scripts
- **`cleanup-incorrect-migration.js`** - ✅ Completed - cleaned up wrong approach
- **`cloudinary-to-strapi-migration.js`** - ❌ Wrong approach (downloads/reuploads)
- **`cloudinary-to-strapi-sync.js`** - ❌ Also downloads/reuploads  
- **`import-cloudinary-files.js`** - ❌ Downloads files instead of referencing

### Analysis & Debug Scripts
- **`analyze-file-relationships.js`** - One-time analysis
- **`debug-strapi-files.js`** - One-time debugging
- **`compare-cloud-local-files.js`** - One-time comparison

### File Organization Scripts  
- **`cloudinary-folder-reorganizer.js`** - Reorganizes Cloudinary folders
- **`cloudinary-cleanup.js`** - Cleans up unused Cloudinary files
- **`delete-cloud-media.js`** - Mass deletion utility
- **`extract-cloudinary-urls.js`** - URL extraction utility
- **`find-phantom-references.js`** - Find orphaned references
- **`compress-large-images.js`** - Image optimization

## 📁 Recommended Organization

```
scripts/
├── README.md                           # This file
├── core/                              # Production utilities
│   ├── folder-management.js
│   ├── create-media-folders.js
│   ├── verify-cloudinary.js
│   ├── seed.js
│   ├── backup.sh
│   ├── backup-cleanup.sh
│   ├── cloud-backup.sh
│   ├── cloud-deploy.sh
│   └── cloud-transfer.sh
└── archive/                           # One-time migration scripts
    ├── migration/
    │   ├── cleanup-incorrect-migration.js
    │   ├── cloudinary-to-strapi-migration.js
    │   ├── cloudinary-to-strapi-sync.js
    │   └── import-cloudinary-files.js
    ├── analysis/
    │   ├── analyze-file-relationships.js
    │   ├── debug-strapi-files.js
    │   └── compare-cloud-local-files.js
    └── maintenance/
        ├── cloudinary-folder-reorganizer.js
        ├── cloudinary-cleanup.js
        ├── delete-cloud-media.js
        ├── extract-cloudinary-urls.js
        ├── find-phantom-references.js
        └── compress-large-images.js
```

## 🎯 Next Steps

1. ✅ **Create proper Cloudinary reference migration script** (`cloudinary-reference-migration.js`)
2. ✅ **Archive completed one-time scripts** 
3. ✅ **Keep core utilities in main scripts directory**
4. **Document usage patterns for each core utility**

## 🚀 Current Solution

### Cloudinary Reference Migration
The **correct** approach is now implemented in `cloudinary-reference-migration.js`:

```bash
# Test with single image first
node cloudinary-reference-migration.js test haythorne

# Validate current state
node cloudinary-reference-migration.js validate

# Migrate specific folder
node cloudinary-reference-migration.js migrate agricola

# Migrate all folders
node cloudinary-reference-migration.js migrate all
```

**Key Features:**
- ✅ Creates Strapi media entries that **reference** Cloudinary URLs
- ✅ **NO file downloads or re-uploads** - images stay in Cloudinary
- ✅ Maintains folder organization in Strapi
- ✅ Handles multiple image formats (thumbnails, small versions)
- ✅ Idempotent - safe to run multiple times
- ✅ Test mode for validation
- ✅ Comprehensive error handling and logging

## 🚨 Migration Status

❌ **Current Issue**: All existing migration scripts download images from Cloudinary and re-upload to Strapi Cloud storage.

✅ **Required Solution**: Create Strapi media entries that REFERENCE Cloudinary URLs directly, keeping images in Cloudinary as CDN.

See `../MIGRATION-PLAN.md` for detailed requirements.
