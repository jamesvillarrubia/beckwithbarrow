# Strapi Backup System

This directory contains scripts and utilities for backing up and restoring Strapi data from both **local installations** and **Strapi Cloud**.

## Available Commands

### Local Backup Commands

```bash
# Full local backup with manifest and cleanup (recommended)
pnpm backup

# Quick local backup without extra features
pnpm backup:quick

# Verbose local backup with detailed output
pnpm backup:verbose

# Silent local backup with minimal output
pnpm backup:silent

# List all available local backups
pnpm backup:list
```

### Strapi Cloud Backup Commands

```bash
# Full cloud backup (requires configuration)
pnpm backup:cloud

# Verbose cloud backup with detailed output
pnpm backup:cloud:verbose

# Show cloud backup configuration help
pnpm backup:cloud:config

# List all available cloud backups
pnpm backup:cloud:list
```

### Restore Commands

```bash
# Restore from a backup (interactive - will prompt for file)
pnpm restore

# Restore from specific backup file
pnpm strapi import --file backups/strapi-backup-20250926-162937 --no-encrypt
```

## Strapi Cloud Configuration

### Setup Required Environment Variables

Before using cloud backup commands, you need to configure your Strapi Cloud credentials:

```bash
# Method 1: Set environment variables directly
export STRAPI_CLOUD_API_TOKEN="your-api-token-here"
export STRAPI_CLOUD_PROJECT_ID="your-project-id-here"  
export STRAPI_CLOUD_BASE_URL="https://your-project.strapiapp.com"

# Method 2: Use the configuration file
cp strapi-cloud.env.example strapi-cloud.env
# Edit strapi-cloud.env with your actual values
source strapi-cloud.env
```

### Getting Your Strapi Cloud Credentials

1. **Login** to your [Strapi Cloud Dashboard](https://cloud.strapi.io)
2. **API Token**: Go to Settings → API Tokens → Create or copy existing token
3. **Project ID**: Found in Project Settings or URL
4. **Base URL**: Your project's public URL (e.g., `https://my-project.strapiapp.com`)

### Test Your Configuration

```bash
# Check if configuration is correct
pnpm backup:cloud:config
```

## Backup Features

### What Gets Backed Up
- ✅ **Schemas**: Content types and components
- ✅ **Entities**: All your content data
- ✅ **Assets**: Uploaded files and media
- ✅ **Links**: Relationships between content
- ✅ **Configuration**: Strapi settings

### Backup Organization
- **Location**: `./backups/` directory
- **Naming**: `strapi-backup-YYYYMMDD-HHMMSS.tar.gz`
- **Manifest**: JSON file with backup metadata
- **Cleanup**: Automatically keeps last 10 backups

### Backup Script Features
- 🎨 **Colored output** for better readability
- 📊 **Detailed statistics** about backup contents
- 🧹 **Automatic cleanup** of old backups
- 📋 **Manifest generation** with metadata
- ⚡ **Multiple backup modes** (verbose, silent, quick)

## File Structure

```
api/
├── scripts/
│   ├── backup.sh              # Main backup script
│   └── README-backup.md       # This documentation
├── backups/
│   ├── strapi-backup-YYYYMMDD-HHMMSS.tar.gz     # Backup files
│   └── strapi-backup-YYYYMMDD-HHMMSS-manifest.json # Metadata
└── package.json               # Contains backup scripts
```

## Backup Manifest

Each backup includes a JSON manifest with:
- Backup name and timestamp
- Node.js and Strapi versions
- Backup file size
- Restore command
- Creation date (ISO format)

## Usage Examples

### Daily Backup
```bash
# Add to your daily routine
pnpm backup
```

### Pre-deployment Backup
```bash
# Before making major changes
pnpm backup:verbose
```

### Quick Backup During Development
```bash
# Fast backup without cleanup
pnpm backup:quick
```

### Check Available Backups
```bash
# List all backups with details
pnpm backup:list
```

### Restore from Backup
```bash
# Interactive restore
pnpm restore

# Or restore specific backup
pnpm strapi import --file backups/strapi-backup-20250926-162937 --no-encrypt
```

## Automation

### Cron Job Example
Add to your crontab for automated daily backups:
```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/your/project/api && pnpm backup:silent
```

### Git Hooks
Add to `.git/hooks/pre-push` for pre-deployment backups:
```bash
#!/bin/bash
cd api && pnpm backup:silent
```

## Troubleshooting

### Common Issues

**Permission Denied**
```bash
chmod +x scripts/backup.sh
```

**No Backups Directory**
```bash
mkdir -p backups
```

**Backup Too Large**
- Consider excluding assets: `--exclude files`
- Use compression: `--no-compress` flag removal

**Restore Failed**
- Ensure backup file exists and is not corrupted
- Check Strapi version compatibility
- Verify database permissions

## Security Notes

- Backups are **not encrypted** by default for easier handling
- Store backups in secure locations for production
- Consider encrypting backups for sensitive data
- Regular backup rotation prevents disk space issues

## Version Compatibility

This backup system works with:
- ✅ Strapi v5.x (current)
- ✅ Node.js v18+ 
- ✅ All package managers (npm, yarn, pnpm)

For older Strapi versions, check the official documentation for export/import command differences.
