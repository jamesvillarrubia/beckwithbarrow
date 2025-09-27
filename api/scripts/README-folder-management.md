# Strapi Media Library Folder Management

This guide explains how to create and manage folders in your Strapi Cloud instance's Media Library via the API.

## 🚀 Quick Start

### Option 1: Using Media Library Handler Plugin (Recommended)

The Media Library Handler plugin provides full API access to folder management in Strapi.

#### Installation

```bash
# Install the plugin
pnpm add strapi-plugin-media-library-handler

# Plugin is already configured in config/plugins.ts
# Restart your Strapi server
pnpm dev
```

#### Usage

```bash
# List all folders
node scripts/folder-management.js list

# Create a new folder
node scripts/folder-management.js create "Project Alpha" "Alpha project files"

# Create organized folder structure
node scripts/folder-management.js create-structure

# Organize existing files by name patterns
node scripts/folder-management.js organize
```

### Option 2: Alternative Approaches (No Plugin Required)

If you prefer not to install additional plugins, you can organize your media using these approaches:

#### 1. Filename-Based Organization

Your existing `create-projects-api.js` script already uses this approach:

```bash
# This groups files by prefix (e.g., "agricola_*.jpg" → "agricola" folder)
node scripts/create-projects-api.js list-folders
```

#### 2. Custom Folder Structure via API

Create a script that uses file naming conventions to simulate folders:

```javascript
// Example: Group files by prefix and create projects
const files = await getMediaByFolder('agricola');
// This finds all files starting with "agricola_"
```

## 📁 Available Commands

### Folder Management Commands

| Command | Description | Example |
|---------|-------------|---------|
| `list` | List all folders in tree structure | `node folder-management.js list` |
| `create <name> [desc]` | Create a new folder | `node folder-management.js create "Projects"` |
| `create-structure` | Create organized folder structure | `node folder-management.js create-structure` |
| `organize` | Organize files by name patterns | `node folder-management.js organize` |
| `update <id> <name> [desc]` | Update folder name/description | `node folder-management.js update 1 "New Name"` |
| `delete <id>` | Delete a folder | `node folder-management.js delete 1` |
| `files <id>` | List files in a folder | `node folder-management.js files 1` |

### Project Creation Commands

| Command | Description | Example |
|---------|-------------|---------|
| `list-folders` | List available media folders | `node create-projects-api.js list-folders` |
| `create-sample <folder> <title>` | Create project from folder | `node create-projects-api.js create-sample agricola "Agricola House"` |
| `create-all-projects` | Create projects for all folders | `node create-projects-api.js create-all-projects` |

## 🏗️ Folder Structure Examples

### Standard Architecture Firm Structure

```
Media Library/
├── Projects/
│   ├── Residential/
│   │   ├── agricola/
│   │   ├── jenks/
│   │   └── waller/
│   ├── Commercial/
│   │   ├── office-building/
│   │   └── retail-space/
│   └── Mixed-Use/
│       └── downtown-development/
├── Branding/
│   ├── Logos/
│   └── Stationery/
├── Portfolio/
└── Archive/
```

### Auto-Generated Structure

When using the `organize` command, folders are created based on your file naming patterns:

```
Files: agricola_01.jpg, agricola_02.jpg, jenks_01.jpg
Result:
├── agricola/ (2 files)
└── jenks/ (1 file)
```

## 🔧 Configuration

### Environment Setup

Ensure your `strapi-cloud.env` file is configured:

```bash
export STRAPI_CLOUD_BASE_URL="https://your-project.strapiapp.com"
export STRAPI_CLOUD_API_TOKEN="your-api-token"
export STRAPI_CLOUD_PROJECT_ID="your-project-id"
```

### Plugin Configuration

The Media Library Handler plugin is automatically configured in `config/plugins.ts`:

```typescript
export default ({ env }) => ({
  // ... other plugins
  mediaLibraryHandler: {
    enabled: true,
    config: {
      // Optional: Configure permissions
      permissions: {
        create: ['authenticated'],
        read: ['public'],
        update: ['authenticated'],
        delete: ['authenticated']
      }
    }
  }
});
```

## 📊 API Endpoints

When the Media Library Handler plugin is installed, these endpoints become available:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/media/folders` | Create a new folder |
| `GET` | `/api/media/folders` | List all folders |
| `GET` | `/api/media/folders/:id` | Get folder details |
| `PUT` | `/api/media/folders/:id` | Update folder |
| `DELETE` | `/api/media/folders/:id` | Delete folder |

### Example API Calls

```bash
# Create folder
curl -X POST "${STRAPI_URL}/api/media/folders" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"data": {"name": "New Project", "description": "Project files"}}'

# List folders
curl -X GET "${STRAPI_URL}/api/media/folders" \
  -H "Authorization: Bearer ${API_TOKEN}"
```

## 🚨 Troubleshooting

### Common Issues

1. **Plugin not found**: Ensure the plugin is installed and Strapi is restarted
2. **Permission denied**: Check your API token has Media Library permissions
3. **Rate limiting**: Add delays between API calls for bulk operations
4. **Folder not found**: Verify folder ID exists using the `list` command

### Debug Commands

```bash
# Check if plugin is working
node folder-management.js list

# Test API connection
node create-projects-api.js list-folders

# Verify environment variables
echo $STRAPI_CLOUD_API_TOKEN
```

## 💡 Best Practices

1. **Naming Conventions**: Use consistent file naming (e.g., `project-name_01.jpg`)
2. **Folder Hierarchy**: Keep folder structure shallow (max 3-4 levels)
3. **Bulk Operations**: Use delays between API calls to avoid rate limits
4. **Backup First**: Always backup your media before bulk operations
5. **Test Small**: Test with a few files before organizing large collections

## 🔄 Workflow Examples

### Complete Setup Workflow

```bash
# 1. Install plugin
node scripts/install-media-library-handler.js

# 2. Restart Strapi
pnpm dev

# 3. Create folder structure
node scripts/folder-management.js create-structure

# 4. Organize existing files
node scripts/folder-management.js organize

# 5. Create projects from organized folders
node scripts/create-projects-api.js create-all-projects
```

### Daily Usage Workflow

```bash
# List current folders
node scripts/folder-management.js list

# Create new project folder
node scripts/folder-management.js create "New Project" "Project description"

# Upload files to folder (via Strapi admin or API)
# Then create project entry
node scripts/create-projects-api.js create-sample "new-project" "New Project Title"
```
