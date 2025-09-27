# AI Instructions for Beckwith Barrow Project

## ⚠️ CRITICAL: READ THIS BEFORE SUGGESTING ANY SCRIPTS

**DO NOT CREATE NEW SCRIPTS WITHOUT CHECKING THIS DOCUMENT FIRST**

This project already has a comprehensive set of scripts for data management operations. Before suggesting any new scripts, check if an existing script already handles the task.

## 🏗️ Project Overview

**Beckwith Barrow** is a portfolio website with:
- **Backend**: Strapi CMS (`/api` directory) - runs on localhost:1337
- **Frontend**: React app (`/frontend` directory) - runs on localhost:5173
- **Database**: Local SQLite for development, PostgreSQL for production
- **Cloud**: Strapi Cloud instance for production hosting
- **Media**: Images stored locally in `api/public/uploads/` and in Strapi Cloud

## 📋 Existing Scripts Inventory

### 🔄 Data Transfer Scripts (Bidirectional)

**Primary Script**: `scripts/cloud-transfer.sh`

**Purpose**: Transfer data between local Strapi and Strapi Cloud using Strapi's native transfer command

**Usage**:
```bash
# Push local data TO cloud (default behavior)
pnpm transfer:to-cloud                    # Full transfer
pnpm transfer:to-cloud:content-only       # Content only (no media files)
pnpm transfer:to-cloud:files-only         # Media files only
pnpm transfer:to-cloud:force              # Skip confirmation

# Pull cloud data TO local
pnpm transfer:from-cloud                  # Full transfer
pnpm transfer:from-cloud:content-only     # Content only (no media files)
pnpm transfer:from-cloud:force            # Skip confirmation

# Dry run (preview what would be transferred)
pnpm transfer:dry-run
```

**What it does**:
1. Creates automatic backup before transfer
2. Uses Strapi's native `strapi transfer` command
3. Supports both directions (local ↔ cloud)
4. Handles content-only, files-only, or full transfers
5. Requires `strapi-cloud.env` configuration

**Dedicated Direction Script**:
- `scripts/transfer-from-cloud.sh` - Pulls FROM cloud TO local (hardcoded direction)

### 💾 Backup Scripts (Local Operations)

**Primary Script**: `scripts/backup.sh`

**Purpose**: Create timestamped backups of LOCAL Strapi data

**Usage**:
```bash
pnpm backup                # Full backup with cleanup
pnpm backup:quick          # Quick backup without extras
pnpm backup:verbose        # Detailed output
pnpm backup:silent         # Minimal output
pnpm backup:list           # List all local backups
```

**What it does**:
1. Exports local Strapi data to `backups/strapi-backup-YYYYMMDD-HHMMSS.tar.gz`
2. Creates JSON manifest with metadata
3. Automatically cleans up old backups (keeps last 10)
4. Uses Strapi's `strapi export` command

**Output Location**: `api/backups/`

### ☁️ Cloud Backup Scripts

**Primary Script**: `scripts/cloud-backup.sh`

**Purpose**: Download and backup data FROM Strapi Cloud

**Usage**:
```bash
pnpm backup:cloud                # Full cloud backup
pnpm backup:cloud:verbose        # Detailed output
pnpm backup:cloud:config         # Show configuration help
```

**What it does**:
1. Downloads data from Strapi Cloud via API
2. Creates backup at `backups/cloud/strapi-cloud-backup-YYYYMMDD-HHMMSS.tar.gz`
3. Attempts Strapi Cloud CLI if available, falls back to API
4. Requires cloud credentials in environment

**Output Location**: `api/backups/cloud/`

### 🚀 Deployment Scripts

**Primary Script**: `scripts/cloud-deploy.sh`

**Purpose**: Deploy/push local data TO Strapi Cloud (similar to transfer but with deployment focus)

**Usage**:
```bash
pnpm deploy:cloud                # Deploy with confirmation
pnpm deploy:cloud:dry-run        # Preview deployment
pnpm deploy:cloud:help           # Show help
```

**What it does**:
1. Creates local AND cloud backups before deployment
2. Attempts Strapi transfer first, falls back to API
3. Designed for production deployments
4. More cautious than transfer scripts

### 🌱 Seed & Utility Scripts

**Data Seeding**: `scripts/seed.js`
- Creates initial content types and sample data
- Uploads media files and creates relationships
- Only runs on first setup (checks if already run)

**Project Creation**: `scripts/create-projects-api.js`
- Creates projects via Strapi Cloud API
- Handles media linking and categories
- Multiple commands for different scenarios

**Various Fix Scripts**:
- `scripts/clean-null-locale.js` - Fixes locale issues
- `scripts/fix-formats-json.js` - Repairs format configurations
- `scripts/fix-i18n-via-api.js` - Internationalization fixes
- `scripts/find-phantom-references.js` - Finds orphaned references

## 🔧 Configuration Requirements

### Local Development
- No special configuration needed
- Uses local SQLite database
- Media stored in `api/public/uploads/`

### Strapi Cloud Operations
**Required**: `api/strapi-cloud.env` file with:
```bash
export STRAPI_CLOUD_BASE_URL="https://your-project.strapiapp.com"
export STRAPI_CLOUD_TRANSFER_TOKEN="your-transfer-token"
export STRAPI_CLOUD_API_TOKEN="your-api-token"
export STRAPI_CLOUD_PROJECT_ID="your-project-id"
```

**Setup**:
```bash
cd api
cp strapi-cloud.env.example strapi-cloud.env
# Edit with your values
source strapi-cloud.env
```

## 📊 Operation Types Explained

### BACKUP vs TRANSFER vs DEPLOY vs SYNC

**BACKUP** (One-way: Source → Archive):
- Creates timestamped archive files
- For disaster recovery and versioning
- Does NOT modify the source
- Local: `backup.sh` → `backups/strapi-backup-*.tar.gz`
- Cloud: `cloud-backup.sh` → `backups/cloud/strapi-cloud-backup-*.tar.gz`

### ✅ BACKUP SYSTEM REDESIGNED AND IMPLEMENTED

**New Organized Backup System**:
- `local-{type}-*` - Local Strapi backups (full, content, media)
- `cloud-{type}-*` - Cloud Strapi backups (full, content, media)  
- `auto-pre-transfer-*` - Auto-created before transfers
- `auto-pre-deploy-*` - Auto-created before deploys

**Directory Structure**:
```
backups/
├── local/    # Local backups (keep 10)
├── cloud/    # Cloud backups (keep 5)
├── auto/     # Auto safety backups (keep 20)
└── archive/  # Old backups (manual)
```

**New Commands Available**:
- `pnpm backup` / `pnpm backup:content` / `pnpm backup:media`
- `pnpm backup:cloud` / `pnpm backup:cloud:content`
- `pnpm backup:list:local` / `pnpm backup:list:cloud` / `pnpm backup:list:auto`
- `pnpm backup:cleanup` / `pnpm backup:cleanup:dry-run`

**Legacy Note**: Old backups still exist with old naming but new system is fully operational.

**TRANSFER** (Bidirectional: A ↔ B):
- Moves data between two live instances
- Can go local → cloud OR cloud → local
- OVERWRITES destination data
- Uses Strapi's native transfer command
- Script: `cloud-transfer.sh` with direction flags

**DEPLOY** (One-way: Local → Cloud):
- Production-focused transfer from local to cloud
- Creates safety backups of both sides first
- More cautious than regular transfer
- Script: `cloud-deploy.sh`

**SYNC** (Not implemented):
- Would merge changes bidirectionally
- Currently not available in this project

### File Handling Options

**Full Transfer** (default):
- Transfers both content data AND media files
- Complete replication

**Content Only** (`--exclude-files`):
- Transfers schemas, entities, configuration
- Skips media files (images, uploads)
- Faster transfer, preserves existing media

**Files Only** (`--files-only`):
- Transfers ONLY media files
- Skips content data
- Useful for media synchronization

## 🚨 Common AI Mistakes to Avoid

### ❌ DON'T Create These (Already Exist):
- Backup scripts (use existing `backup.sh`)
- Transfer scripts (use existing `cloud-transfer.sh`)
- Cloud sync scripts (use transfer with direction flags)
- Database export scripts (use backup scripts)
- Media upload scripts (use transfer or deploy)

### ❌ DON'T Confuse These Terms:
- "Sync" ≠ "Transfer" (we don't have true sync)
- "Backup" ≠ "Transfer" (backup creates archives, transfer moves data)
- "Local backup" ≠ "Cloud backup" (different scripts and locations)
- "Deploy" ≠ "Transfer" (deploy is more cautious)

### ✅ DO Check First:
1. **Read this document completely**
2. **Check existing package.json scripts**
3. **Look in `scripts/` directory**
4. **Ask user to confirm if unsure**

### ✅ DO Suggest Existing Scripts:
- For backups: Point to `pnpm backup` or `pnpm backup:cloud`
- For data movement: Point to `pnpm transfer:*` commands
- For deployment: Point to `pnpm deploy:cloud`
- For seeding: Point to `pnpm seed:example`

## 🎯 When to Suggest New Scripts

**Only create new scripts if**:
1. No existing script handles the specific use case
2. User explicitly requests a new approach
3. Existing scripts are insufficient for the task
4. You've confirmed with the user that existing scripts won't work

**Examples of legitimate new scripts**:
- Database migration scripts
- Performance monitoring
- Custom data transformations
- Integration with new external services

## 📁 Directory Structure Reference

```
api/
├── scripts/                    # All automation scripts
│   ├── backup.sh              # Local backup (main)
│   ├── cloud-backup.sh        # Cloud backup
│   ├── cloud-deploy.sh        # Deploy to cloud
│   ├── cloud-transfer.sh      # Bidirectional transfer (main)
│   ├── transfer-from-cloud.sh # Pull from cloud
│   ├── seed.js                # Initial data seeding
│   ├── create-projects-api.js  # Project creation via API
│   └── [various fix scripts]
├── backups/                   # Local backup storage
│   └── cloud/                 # Cloud backup storage
├── public/uploads/            # Local media files
├── strapi-cloud.env          # Cloud credentials (not in repo)
└── strapi-cloud.env.example  # Template for cloud config
```

## 🔍 Debugging Common Issues

### Transfer/Deploy Issues:
1. Check `strapi-cloud.env` is sourced: `source strapi-cloud.env`
2. Verify tokens have correct permissions
3. Ensure local Strapi is running for some operations
4. Check network connectivity to Strapi Cloud

### Backup Issues:
1. Check `backups/` directory exists and is writable
2. Verify Strapi is running for local backups
3. For cloud backups, check API credentials

### Script Permission Issues:
```bash
chmod +x scripts/*.sh
```

## 📞 Getting Help

**For Users**:
- Check package.json for available npm/pnpm scripts
- Run scripts with `--help` flag when available
- Check `scripts/README-backup.md` for backup-specific help

**For AI Assistants**:
- Reference this document first
- Check existing scripts before creating new ones
- When in doubt, ask the user to clarify requirements
- Suggest existing solutions before proposing new ones

---

**Last Updated**: 2025-09-27
**Version**: 1.0
**Project**: Beckwith Barrow Portfolio Website
