# Backup System Redesign - Clean Up the Chaos

## 🚨 Current Problem

The backup system is a complete mess with overlapping, confusing backup types:

### Current Chaos:
- `quick-backup-*` - Fast backup without cleanup
- `strapi-backup-*` - Main backup script output  
- `strapi-backup-no-files-*` - Content-only backup
- `strapi-backup-with-assets-*` - Full backup (redundant naming)
- `pre-transfer-*` - Auto-created before transfers
- `pre-deploy-*` - Auto-created before deploys
- `strapi-cloud-backup-*` - Downloaded from cloud

**Result**: Confusing, inconsistent, hard to manage, storage waste

## 🎯 Proposed Solution: Unified Backup System

### Single Naming Convention:
```
{source}-{type}-{timestamp}.tar.gz
```

**Examples**:
```
local-full-20250927-143022.tar.gz       # Full local backup
local-content-20250927-143022.tar.gz    # Local content-only  
local-media-20250927-143022.tar.gz      # Local media-only
cloud-full-20250927-143022.tar.gz       # Downloaded from cloud
auto-pre-transfer-20250927-143022.tar.gz # Auto before transfer
auto-pre-deploy-20250927-143022.tar.gz   # Auto before deploy
```

### Backup Types Explained:

**Source Types**:
- `local-*` - Backup OF local Strapi instance
- `cloud-*` - Backup OF cloud Strapi instance  
- `auto-*` - Automatic safety backup

**Content Types**:
- `*-full-*` - Complete backup (content + media)
- `*-content-*` - Content only (no media files)
- `*-media-*` - Media files only (no content)

**Special Prefixes**:
- `auto-pre-transfer-*` - Created automatically before transfers
- `auto-pre-deploy-*` - Created automatically before deploys

### Directory Structure:
```
api/backups/
├── local/                    # Local Strapi backups
│   ├── local-full-*.tar.gz
│   ├── local-content-*.tar.gz
│   └── local-media-*.tar.gz
├── cloud/                    # Cloud Strapi backups  
│   ├── cloud-full-*.tar.gz
│   ├── cloud-content-*.tar.gz
│   └── cloud-media-*.tar.gz
├── auto/                     # Automatic safety backups
│   ├── auto-pre-transfer-*.tar.gz
│   └── auto-pre-deploy-*.tar.gz
└── archive/                  # Old backups (optional)
    └── [moved old backups]
```

## 🛠️ Implementation Plan

### 1. Update Backup Scripts

**Main Backup Script** (`scripts/backup.sh`):
```bash
# Replace current naming with:
BACKUP_NAME="local-${BACKUP_TYPE}-${TIMESTAMP}"
```

**Cloud Backup Script** (`scripts/cloud-backup.sh`):
```bash
# Replace current naming with:  
BACKUP_NAME="cloud-${BACKUP_TYPE}-${TIMESTAMP}"
```

**Transfer/Deploy Scripts**:
```bash
# Replace pre-transfer backups with:
BACKUP_NAME="auto-pre-transfer-${TIMESTAMP}"

# Replace pre-deploy backups with:
BACKUP_NAME="auto-pre-deploy-${TIMESTAMP}"
```

### 2. Update Package.json Scripts

```json
{
  "backup:local": "./scripts/backup.sh --type=full",
  "backup:local:content": "./scripts/backup.sh --type=content", 
  "backup:local:media": "./scripts/backup.sh --type=media",
  "backup:local:quick": "./scripts/backup.sh --type=full --no-manifest --no-cleanup",
  
  "backup:cloud": "./scripts/cloud-backup.sh --type=full",
  "backup:cloud:content": "./scripts/cloud-backup.sh --type=content",
  
  "backup:list:local": "ls -la backups/local/",
  "backup:list:cloud": "ls -la backups/cloud/",
  "backup:list:auto": "ls -la backups/auto/",
  "backup:list": "find backups/ -name '*.tar.gz' -type f -exec ls -la {} \\;",
  
  "backup:cleanup": "./scripts/backup-cleanup.sh",
  "backup:cleanup:local": "./scripts/backup-cleanup.sh --local-only",
  "backup:cleanup:cloud": "./scripts/backup-cleanup.sh --cloud-only"
}
```

### 3. Retention Policies

**Default Retention**:
- `local-*`: Keep last 10 backups
- `cloud-*`: Keep last 5 backups  
- `auto-*`: Keep last 20 backups (more safety backups)

**Cleanup Script** (`scripts/backup-cleanup.sh`):
- Separate cleanup for each backup type
- Configurable retention counts
- Safe cleanup with confirmation

### 4. Migration Plan

**Step 1**: Create new directory structure
**Step 2**: Move existing backups to appropriate locations
**Step 3**: Update all scripts to use new naming
**Step 4**: Test new system
**Step 5**: Clean up old inconsistent backups

## 📋 New Command Examples

```bash
# Local backups
pnpm backup:local                    # Full local backup
pnpm backup:local:content           # Content-only local backup  
pnpm backup:local:quick             # Fast backup, no extras

# Cloud backups
pnpm backup:cloud                   # Download full cloud backup
pnpm backup:cloud:content          # Download content-only

# List backups
pnpm backup:list                    # All backups
pnpm backup:list:local             # Local backups only
pnpm backup:list:auto              # Auto-generated backups

# Cleanup
pnpm backup:cleanup                # Clean all old backups
pnpm backup:cleanup:local         # Clean local backups only
```

## 🔧 Benefits of New System

1. **Clear naming** - Know exactly what each backup contains
2. **Organized storage** - Separate directories by source/purpose  
3. **Consistent retention** - Predictable cleanup policies
4. **Easy discovery** - Find backups by type quickly
5. **No confusion** - Eliminate overlapping/redundant names
6. **Better automation** - Scripts work together cleanly

## 🚀 Ready to Implement?

This redesign will:
- ✅ Eliminate all naming confusion
- ✅ Organize backups logically  
- ✅ Standardize retention policies
- ✅ Make backup purpose crystal clear
- ✅ Reduce storage waste
- ✅ Improve backup discovery

Should we proceed with implementation?
