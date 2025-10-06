# API Specification: Cloudinary & Strapi Media Management

## Overview

This document provides a comprehensive specification for managing media files across Cloudinary (source of truth) and Strapi (content management). The system uses Cloudinary for image storage and CDN, while Strapi manages metadata, organization, and content relationships.

## Authentication

### Cloudinary API
- **Method**: Basic Authentication
- **Format**: `Authorization: Basic {base64_encoded_credentials}`
- **Credentials**: `{api_key}:{api_secret}` encoded in base64

### Strapi API
- **Method**: Bearer Token
- **Format**: `Authorization: Bearer {STRAPI_CLOUD_API_TOKEN}`
- **Token**: Retrieved from `strapi-cloud.env` file

## Base URLs

### Cloudinary
- **Base URL**: `https://api.cloudinary.com/v1_1/{cloud_name}`
- **Cloud Name**: `dqeqavdd8`

### Strapi
- **Base URL**: `https://striking-ball-b079f8c4b0.strapiapp.com/api`
- **Media Endpoints**: `/api/media/*`

---

## Cloudinary API Endpoints

### 1. Folder Management

#### Get Root Folders
```bash
GET https://api.cloudinary.com/v1_1/dqeqavdd8/folders/
Authorization: Basic {base64_encoded_credentials}
```

**Response:**
```json
{
  "folders": [
    {
      "name": "beckwithbarrow",
      "path": "beckwithbarrow"
    }
  ]
}
```

#### Get Folder Contents
```bash
GET https://api.cloudinary.com/v1_1/dqeqavdd8/folders/beckwithbarrow
Authorization: Basic {base64_encoded_credentials}
```

**Response:**
```json
{
  "folders": [
    {
      "name": "agricola",
      "path": "beckwithbarrow/agricola"
    },
    {
      "name": "buhn", 
      "path": "beckwithbarrow/buhn"
    }
  ]
}
```

#### Create Folder
```bash
POST https://api.cloudinary.com/v1_1/dqeqavdd8/folders/{folder_name}
Authorization: Basic {base64_encoded_credentials}
```

**Example:**
```bash
POST https://api.cloudinary.com/v1_1/dqeqavdd8/folders/beckwithbarrow/new_project
```

### 2. Resource Management

#### Get Resources by Folder
```bash
GET https://api.cloudinary.com/v1_1/dqeqavdd8/resources/by_asset_folder?asset_folder=beckwithbarrow%2Fagricola
Authorization: Basic {base64_encoded_credentials}
```

**Response:**
```json
{
  "resources": [
    {
      "public_id": "beckwithbarrow/agricola/agricola_001",
      "format": "jpg",
      "version": 1234567890,
      "resource_type": "image",
      "type": "upload",
      "created_at": "2025-01-01T12:00:00Z",
      "bytes": 1024000,
      "width": 1920,
      "height": 1080,
      "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
      "secure_url": "https://res.cloudinary.com/dqeqavdd8/image/upload/v1234567890/beckwithbarrow/agricola/agricola_001.jpg"
    }
  ]
}
```

#### Update Resource Folder
```bash
PUT https://api.cloudinary.com/v1_1/dqeqavdd8/resources/{public_id}
Authorization: Basic {base64_encoded_credentials}
Content-Type: application/x-www-form-urlencoded

asset_folder=beckwithbarrow%2Fnew_folder
```

---

## Strapi API Endpoints

### 1. Folder Management

#### Get All Folders
```bash
GET https://striking-ball-b079f8c4b0.strapiapp.com/api/media/folders
Authorization: Bearer {STRAPI_CLOUD_API_TOKEN}
```

**Response:**
```json
[
  {
    "id": 147,
    "name": "Project Photos",
    "path": "/147",
    "createdAt": "2025-01-01T12:00:00Z",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
]
```

#### Get Folder Structure (Hierarchical)
```bash
GET https://striking-ball-b079f8c4b0.strapiapp.com/api/media/folders-structure
Authorization: Bearer {STRAPI_CLOUD_API_TOKEN}
```

**Response:**
```json
[
  {
    "id": 147,
    "name": "Project Photos",
    "children": [
      {
        "id": 160,
        "name": "Agricola Modern House",
        "children": []
      }
    ]
  }
]
```

#### Create Folder
```bash
POST https://striking-ball-b079f8c4b0.strapiapp.com/api/media/folders
Authorization: Bearer {STRAPI_CLOUD_API_TOKEN}
Content-Type: application/json

{
  "name": "agricola",
  "parentId": 147
}
```

**Response:**
```json
{
  "id": 456,
  "name": "agricola",
  "parent": null,
  "createdAt": "2025-01-01T12:34:56.789Z",
  "updatedAt": "2025-01-01T12:34:56.789Z",
  "publishedAt": "2025-01-01T12:34:56.789Z"
}
```

#### Update Folder
```bash
PUT https://striking-ball-b079f8c4b0.strapiapp.com/api/media/folders/{folder_id}
Authorization: Bearer {STRAPI_CLOUD_API_TOKEN}
Content-Type: application/json

{
  "name": "updated_folder_name",
  "parentId": 147
}
```

### 2. Media File Management

#### Get Files in Folder
```bash
GET https://striking-ball-b079f8c4b0.strapiapp.com/api/media/files?folderId={folder_id}
Authorization: Bearer {STRAPI_CLOUD_API_TOKEN}
```

**Response:**
```json
[
  {
    "id": 2593,
    "documentId": "s37uto6sh4vohq4ys7bw111x",
    "name": "agricola_001.jpg",
    "alternativeText": "Agricola Modern House - Exterior View",
    "caption": "Modern architectural design",
    "width": 1920,
    "height": 1080,
    "formats": {
      "thumbnail": {
        "ext": ".jpg",
        "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_156,h_156,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
        "hash": "thumbnail_agricola_001",
        "mime": "image/jpeg",
        "name": "thumbnail_agricola_001.jpg",
        "width": 104,
        "height": 156,
        "sizeInBytes": 8500
      },
      "small": {
        "ext": ".jpg",
        "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_500,h_500,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
        "hash": "small_agricola_001",
        "mime": "image/jpeg",
        "name": "small_agricola_001.jpg",
        "width": 333,
        "height": 500,
        "sizeInBytes": 25000
      },
      "medium": {
        "ext": ".jpg",
        "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_750,h_750,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
        "hash": "medium_agricola_001",
        "mime": "image/jpeg",
        "name": "medium_agricola_001.jpg",
        "width": 500,
        "height": 750,
        "sizeInBytes": 45000
      },
      "large": {
        "ext": ".jpg",
        "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_1000,h_1000,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
        "hash": "large_agricola_001",
        "mime": "image/jpeg",
        "name": "large_agricola_001.jpg",
        "width": 667,
        "height": 1000,
        "sizeInBytes": 75000
      }
    },
    "hash": "agricola_001_8767d328d6",
    "ext": ".jpg",
    "mime": "image/jpeg",
    "size": 1024.5,
    "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
    "previewUrl": null,
    "provider": "cloudinary",
    "provider_metadata": {
      "public_id": "beckwithbarrow/agricola/agricola_001",
      "version": "1234567890",
      "signature": "abc123def456",
      "format": "jpg",
      "resource_type": "image"
    },
    "folderPath": "/160",
    "createdAt": "2025-01-01T12:00:00.435Z",
    "updatedAt": "2025-01-01T12:00:00.435Z",
    "publishedAt": "2025-01-01T12:00:00.438Z",
    "locale": null,
    "folder": {
      "id": 160,
      "documentId": "rs0a74ye37lsmdddol26ca4r",
      "name": "Agricola Modern House",
      "pathId": 36,
      "path": "/160",
      "createdAt": "2025-01-01T12:00:00.402Z",
      "updatedAt": "2025-01-01T12:00:00.402Z",
      "publishedAt": "2025-01-01T12:00:00.402Z",
      "locale": null
    }
  }
]
```

#### Create Media File (Placeholder Method)
```bash
POST https://striking-ball-b079f8c4b0.strapiapp.com/api/media/files
Authorization: Bearer {STRAPI_CLOUD_API_TOKEN}
Content-Type: multipart/form-data

file=@placeholder.jpg
folderId=160
alternativeText="Agricola Modern House - Image 001"
```

#### Update Media File with Cloudinary URLs
```bash
PUT https://striking-ball-b079f8c4b0.strapiapp.com/api/media/files/{file_id}
Authorization: Bearer {STRAPI_CLOUD_API_TOKEN}
Content-Type: application/json

{
  "name": "agricola_001.jpg",
  "alternativeText": "Agricola Modern House - Exterior View",
  "caption": "Modern architectural design with clean lines",
  "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
  "formats": {
    "thumbnail": {
      "ext": ".jpg",
      "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_156,h_156,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
      "hash": "thumbnail_agricola_001",
      "mime": "image/jpeg",
      "name": "thumbnail_agricola_001.jpg",
      "width": 104,
      "height": 156,
      "sizeInBytes": 8500
    },
    "small": {
      "ext": ".jpg",
      "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_500,h_500,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
      "hash": "small_agricola_001",
      "mime": "image/jpeg",
      "name": "small_agricola_001.jpg",
      "width": 333,
      "height": 500,
      "sizeInBytes": 25000
    },
    "medium": {
      "ext": ".jpg",
      "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_750,h_750,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
      "hash": "medium_agricola_001",
      "mime": "image/jpeg",
      "name": "medium_agricola_001.jpg",
      "width": 500,
      "height": 750,
      "sizeInBytes": 45000
    },
    "large": {
      "ext": ".jpg",
      "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_1000,h_1000,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
      "hash": "large_agricola_001",
      "mime": "image/jpeg",
      "name": "large_agricola_001.jpg",
      "width": 667,
      "height": 1000,
      "sizeInBytes": 75000
    }
  },
  "provider": "cloudinary",
  "provider_metadata": {
    "public_id": "beckwithbarrow/agricola/agricola_001",
    "version": "1234567890",
    "signature": "abc123def456",
    "format": "jpg",
    "resource_type": "image"
  }
}
```

#### Delete Media File
```bash
DELETE https://striking-ball-b079f8c4b0.strapiapp.com/api/media/files/{file_id}
Authorization: Bearer {STRAPI_CLOUD_API_TOKEN}
```

### 3. Custom Media Endpoints

#### Media Files Override Endpoint
```bash
POST https://striking-ball-b079f8c4b0.strapiapp.com/api/media-files
Authorization: Bearer {STRAPI_CLOUD_API_TOKEN}
Content-Type: application/json

{
  "name": "agricola_001.jpg",
  "alternativeText": "Agricola Modern House - Exterior View",
  "caption": "Modern architectural design",
  "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/v1234567890/beckwithbarrow/agricola/agricola_001.jpg",
  "formats": {
    "thumbnail": {
      "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_156,h_156,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg"
    },
    "small": {
      "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_500,h_500,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg"
    },
    "medium": {
      "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_750,h_750,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg"
    },
    "large": {
      "url": "https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_1000,h_1000,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg"
    }
  },
  "provider": "cloudinary",
  "provider_metadata": {
    "public_id": "beckwithbarrow/agricola/agricola_001",
    "version": "1234567890"
  },
  "folderId": 160
}
```

---

## Cloudinary Format URL Generation

### Standard Format URLs

All Cloudinary format URLs follow this pattern:
```
https://res.cloudinary.com/dqeqavdd8/image/upload/{transformations}/v{version}/{public_id}.{format}
```

#### Format Specifications

| Format | Transformations | Max Dimensions | Purpose |
|--------|----------------|----------------|---------|
| **Thumbnail** | `c_limit,w_156,h_156,q_auto:good` | 156x156 | Grid thumbnails, small previews |
| **Small** | `c_limit,w_500,h_500,q_auto:good` | 500x500 | Small content images |
| **Medium** | `c_limit,w_750,h_750,q_auto:good` | 750x750 | Medium content images |
| **Large** | `c_limit,w_1000,h_1000,q_auto:good` | 1000x1000 | Large content images |

#### Example Format URLs

For image: `beckwithbarrow/agricola/agricola_001.jpg` with version `1234567890`

```bash
# Original
https://res.cloudinary.com/dqeqavdd8/image/upload/v1234567890/beckwithbarrow/agricola/agricola_001.jpg

# Thumbnail
https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_156,h_156,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg

# Small
https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_500,h_500,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg

# Medium
https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_750,h_750,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg

# Large
https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_1000,h_1000,q_auto:good/v1234567890/beckwithbarrow/agricola/agricola_001.jpg
```

---

## API Usage Patterns

### 1. Folder Synchronization

**Process**: Sync Cloudinary folder structure to Strapi

```javascript
// 1. Get Cloudinary folders
const cloudinaryFolders = await getCloudinaryFolders('beckwithbarrow');

// 2. Get existing Strapi folders
const strapiFolders = await getStrapiFolders();

// 3. Create missing Strapi folders
for (const cloudinaryFolder of cloudinaryFolders) {
  if (!strapiFolders.find(f => f.name === cloudinaryFolder.name)) {
    await createStrapiFolder(cloudinaryFolder.name, 147); // Parent: Project Photos
  }
}
```

### 2. Media File Migration

**Process**: Create Strapi references for Cloudinary images

```javascript
// 1. Get Cloudinary images
const cloudinaryImages = await getCloudinaryImages('beckwithbarrow/agricola');

// 2. For each image, create Strapi reference
for (const image of cloudinaryImages) {
  // Create placeholder file
  const mediaEntry = await createStrapiMediaPlaceholder(image.name, folderId);
  
  // Update with Cloudinary URLs
  await updateStrapiMediaWithCloudinary(mediaEntry.id, image);
}
```

### 3. Format URL Generation

**Process**: Generate all format URLs for an image

```javascript
function generateFormatUrls(publicId, version, format) {
  const baseUrl = `https://res.cloudinary.com/dqeqavdd8/image/upload`;
  
  return {
    original: `${baseUrl}/v${version}/${publicId}.${format}`,
    thumbnail: `${baseUrl}/c_limit,w_156,h_156,q_auto:good/v${version}/${publicId}.${format}`,
    small: `${baseUrl}/c_limit,w_500,h_500,q_auto:good/v${version}/${publicId}.${format}`,
    medium: `${baseUrl}/c_limit,w_750,h_750,q_auto:good/v${version}/${publicId}.${format}`,
    large: `${baseUrl}/c_limit,w_1000,h_1000,q_auto:good/v${version}/${publicId}.${format}`
  };
}
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Cloudinary | Strapi | Description |
|------|------------|--------|-------------|
| 200 | ✅ Success | ✅ Success | Request successful |
| 201 | ✅ Created | ✅ Created | Resource created |
| 400 | ❌ Bad Request | ❌ Bad Request | Invalid request data |
| 401 | ❌ Unauthorized | ❌ Unauthorized | Invalid credentials |
| 403 | ❌ Forbidden | ❌ Forbidden | Insufficient permissions |
| 404 | ❌ Not Found | ❌ Not Found | Resource not found |
| 409 | ❌ Conflict | ❌ Conflict | Resource already exists |
| 500 | ❌ Server Error | ❌ Server Error | Internal server error |

### Error Response Format

#### Cloudinary Error Response
```json
{
  "error": {
    "message": "Invalid API key",
    "http_code": 401
  }
}
```

#### Strapi Error Response
```json
{
  "error": {
    "status": 401,
    "name": "UnauthorizedError",
    "message": "Invalid token"
  }
}
```

---

## Rate Limits

### Cloudinary
- **Free Tier**: 25,000 transformations/month
- **Paid Tier**: Based on plan
- **API Calls**: 1000 requests/hour

### Strapi
- **Cloud**: Based on plan
- **Self-hosted**: No built-in limits
- **Recommended**: Implement request throttling

---

## Testing and Validation

### Test Endpoints

#### Cloudinary Health Check
```bash
GET https://api.cloudinary.com/v1_1/dqeqavdd8/folders/
Authorization: Basic {base64_encoded_credentials}
```

#### Strapi Health Check
```bash
GET https://striking-ball-b079f8c4b0.strapiapp.com/api/media/folders
Authorization: Bearer {STRAPI_CLOUD_API_TOKEN}
```

### Validation Scripts

#### Folder Structure Validation
```javascript
async function validateFolderStructure() {
  const cloudinaryFolders = await getCloudinaryFolders('beckwithbarrow');
  const strapiFolders = await getStrapiFolders();
  
  const missing = cloudinaryFolders.filter(cf => 
    !strapiFolders.find(sf => sf.name === cf.name)
  );
  
  console.log(`Missing Strapi folders: ${missing.length}`);
  return missing;
}
```

#### Media File Validation
```javascript
async function validateMediaFiles(folderName) {
  const cloudinaryImages = await getCloudinaryImages(`beckwithbarrow/${folderName}`);
  const strapiFiles = await getStrapiFiles(folderId);
  
  const missing = cloudinaryImages.filter(ci => 
    !strapiFiles.find(sf => sf.name === ci.public_id.split('/').pop())
  );
  
  console.log(`Missing Strapi files in ${folderName}: ${missing.length}`);
  return missing;
}
```

---

## Migration Workflow

### 1. Pre-Migration Audit
```bash
# Check Cloudinary structure
curl -H "Authorization: Basic {credentials}" \
  "https://api.cloudinary.com/v1_1/dqeqavdd8/folders/beckwithbarrow"

# Check Strapi structure  
curl -H "Authorization: Bearer {token}" \
  "https://striking-ball-b079f8c4b0.strapiapp.com/api/media/folders-structure"
```

### 2. Folder Creation
```bash
# Create missing Strapi folders
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "agricola", "parentId": 147}' \
  "https://striking-ball-b079f8c4b0.strapiapp.com/api/media/folders"
```

### 3. Media File Migration
```bash
# Create media file with placeholder
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -F "file=@placeholder.jpg" \
  -F "folderId=160" \
  -F "alternativeText=Test Image" \
  "https://striking-ball-b079f8c4b0.strapiapp.com/api/media/files"

# Update with Cloudinary URLs
curl -X PUT \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{...cloudinary_urls...}' \
  "https://striking-ball-b079f8c4b0.strapiapp.com/api/media/files/{file_id}"
```

### 4. Post-Migration Validation
```bash
# Verify all files migrated
curl -H "Authorization: Bearer {token}" \
  "https://striking-ball-b079f8c4b0.strapiapp.com/api/media/files?folderId=160"
```

---

## Security Considerations

### API Key Management
- Store credentials in environment variables
- Use different keys for development/production
- Rotate keys regularly
- Never commit credentials to version control

### Access Control
- Implement proper authentication
- Use least-privilege access
- Monitor API usage
- Set up alerts for unusual activity

### Data Protection
- Encrypt sensitive data in transit
- Use HTTPS for all API calls
- Implement request validation
- Log all API interactions

---

## Performance Optimization

### Caching Strategy
- Cache folder structures
- Cache media metadata
- Use CDN for image delivery
- Implement request deduplication

### Batch Operations
- Process multiple files in batches
- Use parallel requests where possible
- Implement retry logic with exponential backoff
- Monitor rate limits

### Monitoring
- Track API response times
- Monitor error rates
- Set up alerts for failures
- Log performance metrics

---

This specification provides a comprehensive guide for managing media files across Cloudinary and Strapi, with clear endpoint definitions, usage patterns, and implementation guidelines.

