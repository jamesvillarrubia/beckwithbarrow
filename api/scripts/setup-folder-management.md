# Folder Management Setup Guide

## ✅ Installation Complete

The Media Library Handler plugin has been installed and configured. Here's what was done:

### 1. Plugin Installation
```bash
pnpm add strapi-plugin-media-library-handler
```

### 2. Plugin Configuration
Added to `config/plugins.ts`:
```typescript
mediaLibraryHandler: {
    enabled: true,
    config: {
        // Optional: Configure folder permissions
    }
}
```

## 🚀 Next Steps

### 1. Restart Strapi Server
```bash
pnpm dev
```

### 2. Test the Installation
```bash
# List existing folders (should work after restart)
node scripts/folder-management.js list
```

### 3. Create Your First Folder
```bash
# Create a test folder
node scripts/folder-management.js create "Test Folder" "Testing folder creation"

# Create organized structure
node scripts/folder-management.js create-structure
```

## 📋 Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `list` | List all folders | `node scripts/folder-management.js list` |
| `create <name> [desc]` | Create folder | `node scripts/folder-management.js create "Projects"` |
| `create-structure` | Create organized structure | `node scripts/folder-management.js create-structure` |
| `organize` | Organize files by patterns | `node scripts/folder-management.js organize` |
| `update <id> <name> [desc]` | Update folder | `node scripts/folder-management.js update 1 "New Name"` |
| `delete <id>` | Delete folder | `node scripts/folder-management.js delete 1` |
| `files <id>` | List files in folder | `node scripts/folder-management.js files 1` |

## 🔧 Troubleshooting

### Plugin Not Working?
1. Ensure Strapi server is restarted: `pnpm dev`
2. Check plugin is in `package.json`: `grep media-library-handler package.json`
3. Verify configuration in `config/plugins.ts`

### API Connection Issues?
1. Check environment variables: `echo $STRAPI_CLOUD_API_TOKEN`
2. Test basic API: `node scripts/create-projects-api.js list-folders`
3. Verify Strapi Cloud URL is correct

### Rate Limiting?
- Add delays between bulk operations
- Use `organize` command for large file collections
- Process in smaller batches

## 💡 Quick Workflow

```bash
# 1. Restart Strapi
pnpm dev

# 2. Create folder structure
node scripts/folder-management.js create-structure

# 3. Organize existing files
node scripts/folder-management.js organize

# 4. Create projects from organized folders
node scripts/create-projects-api.js create-all-projects
```

That's it! You now have full folder management capabilities via API.
