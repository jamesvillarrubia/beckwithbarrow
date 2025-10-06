
#### API Specification: Create Folder
```bash
POST {STRAPI_BASE_URL}/api/media/folders
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "agricola",
  "parentId": 147
}
```

**Note**: `parentId: 147` refers to the "Project Photos" folder in Strapi

**Response (201):**
```json
{
  "id": 456,
  "name": "agricola",
  "parent": null,
  "createdAt": "2025-05-05T12:34:56.789Z",
  "updatedAt": "2025-05-05T12:34:56.789Z",
  "publishedAt": "2025-05-05T12:34:56.789Z"
}
```

#### Implementation Example:
```javascript
// Create Strapi folder with exact Cloudinary name
const createStrapiFolder = async (folderName) => {
  const response = await strapiApi.post('/api/media/folders', {
    name: folderName,  // Exact match to Cloudinary (e.g., 'agricola', 'buhn')
    parentId: 147      // Under "Project Photos" folder
  });
  
  return {
    id: response.data.id,
    name: response.data.name,
    cloudinaryName: folderName,
    parentId: 147
  };
};

// Create all missing folders
for (const [cloudinaryFolder, mapping] of this.folderMapping) {
  if (mapping.status === 'NEEDS_CREATION') {
    const newFolder = await createStrapiFolder(cloudinaryFolder);
    console.log(`✅ Created Strapi folder: ${newFolder.name} (ID: ${newFolder.id})`);
  }
}
```

### Step 4: Complete Folder Creation Workflow

#### Full Implementation for Creating Missing Folders:
```javascript
/**
 * Create all missing Strapi folders to match Cloudinary structure
 */
async function createMissingStrapiFolders(auditor) {
  console.log('📁 Creating missing Strapi folders...');
  
  const createdFolders = [];
  
  for (const [cloudinaryFolder, mapping] of auditor.folderMapping) {
    if (mapping.status === 'NEEDS_CREATION') {
      try {
        console.log(`   Creating folder: ${cloudinaryFolder}`);
        
        const response = await strapiApi.post('/api/media/folders', {
          name: cloudinaryFolder,  // Exact Cloudinary name
          parentId: 147           // Under "Project Photos" folder
        });
        
        const newFolder = {
          id: response.data.id,
          name: response.data.name,
          cloudinaryName: cloudinaryFolder,
          createdAt: response.data.createdAt
        };
        
        createdFolders.push(newFolder);
        console.log(`   ✅ Created: ${newFolder.name} (ID: ${newFolder.id})`);
        
        // Update the mapping with the new folder ID
        mapping.strapiId = newFolder.id;
        mapping.status = 'CREATED';
        
      } catch (error) {
        console.error(`   ❌ Failed to create folder ${cloudinaryFolder}:`, error.message);
      }
    }
  }
  
  console.log(`✅ Folder creation complete: ${createdFolders.length} folders created`);
  return createdFolders;
}
```

#### Expected Results:
Based on the audit results, we need to create **20 Strapi folders**:
- `agricola`, `buhn`, `butler`, `dineen`, `freedman`
- `gunther`, `haythorne`, `hetherington`, `holm`, `jenks`
- `krant`, `logos`, `o5a`, `onota`, `other`
- `rowntree`, `seidman`, `strauss_weinberg`, `turell`, `waller`

### Step 5: Map Folders to Projects (Optional)
```javascript
// Link folders to projects for content management
const folderProjectMapping = {
  'agricola': 'Agricola Modern House',
  'buhn': 'Buhn Residence',
  'butler': 'Butler House',
  // ... etc
};
```

## REQUIRED ACTIONS
1. **DELETE** all incorrectly migrated images from Strapi Cloud storage
2. **CREATE** new script that creates Strapi media entries pointing to Cloudinary URLs
3. **PRESERVE** folder organization in Strapi
4. **MAINTAIN** Cloudinary as image storage/CDN

## SCRIPT REQUIREMENTS
- Create media entries via Strapi API
- Use Cloudinary URLs as `url` field
- Assign to correct folders
- Set proper metadata (alt text, etc.)
- DO NOT download/re-upload images
- confirm that the formats column in the files table references cloudinary correctly.
- make sure the cloudinary formats are stored in a logical way under each cloudinary subfolder Like /beckwithbarrow/agricola/image_001.png should have alternative version in /beckwithbarrow/agricola/thumbnails/thumbnail_image_001.png and /beckwithbarrow/agricola/small/small_image_001.png
- should be testable or be able to be limited to 1 image or 1 folder at each step to limit damage or disruption to produciton.
- should be able to run tests against cloudinary's folder and image structure AND against the strapi instance to see what the current state is and if it is correct.
- should be idempotent, so we don't have to delete everything and redo everything everytime.

## STRAPI MEDIA API IMPLEMENTATION

### Creating URL-Based Media Files

Since we cannot upload actual files (we want to reference Cloudinary URLs), we need to use a workaround approach:

#### Method 1: Create with Minimal File + Update URLs
1. **Upload a tiny placeholder file** (1x1 pixel) to create the media entry
2. **Immediately update** the entry with Cloudinary URLs and metadata
3. **Delete the placeholder** from Strapi storage (keep the database entry)

#### Method 2: Direct Database Insert (Advanced)
1. **Directly insert** into Strapi's database tables
2. **Bypass** Strapi's upload validation
3. **Set provider** to 'cloudinary' and URLs to Cloudinary

### Implementation Strategy

#### Step 1: Create Media Entry with Placeholder
```bash
# Upload minimal placeholder file
curl --location 'https://striking-ball-b079f8c4b0.strapiapp.com/api/media/files' \
--header 'Authorization: Bearer ${STRAPI_CLOUD_API_TOKEN}' \
--form 'file=@placeholder.jpg' \
--form 'folderId=160' \
--form 'alternativeText="Agricola Modern House - Image 001"'
```

#### Step 2: Update with Cloudinary URLs
```bash
# Update the media entry with Cloudinary URLs
curl --location --request POST 'https://striking-ball-b079f8c4b0.strapiapp.com/api/media/files/321' \
--header 'Authorization: Bearer ${STRAPI_CLOUD_API_TOKEN}' \
--header 'Content-Type: application/json' \
--data '{
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
}'
```

### Format URL Generation

Each Cloudinary image will have 4 format variants:

#### Thumbnail (Max 156x156)
- **URL**: `https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_156,h_156,q_auto:good/v{version}/{public_id}.{format}`
- **Purpose**: Small previews, grid thumbnails
- **Behavior**: Shows full image, maintains aspect ratio

#### Small (Max 500x500)
- **URL**: `https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_500,h_500,q_auto:good/v{version}/{public_id}.{format}`
- **Purpose**: Small content images
- **Behavior**: Shows full image, maintains aspect ratio

#### Medium (Max 750x750)
- **URL**: `https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_750,h_750,q_auto:good/v{version}/{public_id}.{format}`
- **Purpose**: Medium content images
- **Behavior**: Shows full image, maintains aspect ratio

#### Large (Max 1000x1000)
- **URL**: `https://res.cloudinary.com/dqeqavdd8/image/upload/c_limit,w_1000,h_1000,q_auto:good/v{version}/{public_id}.{format}`
- **Purpose**: Large content images
- **Behavior**: Shows full image, maintains aspect ratio

### Migration Script Workflow (Cloudinary-First Approach)

1. **Audit Cloudinary Structure (Source of Truth)**
   - Fetch all images from `beckwithbarrow/` folder structure
   - Identify all subfolders and their contents
   - Document the complete Cloudinary hierarchy

2. **Audit Strapi Structure (Target)**
   - Fetch all existing Strapi media files
   - Identify existing folders and their IDs
   - Create mapping between Cloudinary and Strapi folders

3. **Create Missing Strapi Folders**
   - For Cloudinary folders without Strapi equivalents:
     - Create new Strapi folders to match Cloudinary structure
     - Use Cloudinary folder names as Strapi folder names
     - Maintain hierarchical structure

4. **Process Each Cloudinary Image**
   - For every image in Cloudinary:
     - Check if it exists in Strapi (by filename matching)
     - If NOT in Strapi: Create new Strapi reference
       - Upload tiny placeholder file
       - Update with Cloudinary URLs and metadata
       - Assign to correct Strapi folder
     - If EXISTS in Strapi: Update existing reference
       - Update URLs to point to Cloudinary
       - Update format URLs to use Cloudinary transformations
       - Update provider metadata

5. **Cleanup and Verification**
   - Remove local storage files (optional)
   - Verify all Cloudinary images have Strapi references
   - Test all format URLs work correctly
   - Update any broken links

### Key Principles

- **Cloudinary is Source of Truth**: Every image in Cloudinary should have a Strapi reference
- **Folder Structure Mirroring**: Strapi folders should match Cloudinary folder structure
- **No Data Loss**: All Cloudinary images must be represented in Strapi
- **Format Consistency**: All formats use Cloudinary transformations
- **Idempotent Process**: Can be run multiple times safely


## Example CURL requests fro accessing Cloudinary
```
curl --location 'https://api.cloudinary.com/v1_1/dqeqavdd8/folders/' 

curl --location 'https://api.cloudinary.com/v1_1/dqeqavdd8/folders/beckwithbarrow' 

curl --location 'https://api.cloudinary.com/v1_1/{cloud_name}/folders/beckwithbarrow/agricola' \
--header 'Authorization: Basic {base64_encoded_credentials}'

curl --location 'https://api.cloudinary.com/v1_1/{cloud_name}/resources/by_asset_folder?asset_folder=beckwithbarrow%2Fagricola' \
--header 'Authorization: Basic {base64_encoded_credentials}'

curl --location --globoff --request POST 'https://api.cloudinary.com/v1_1/{cloud_name}/folders/new_test_folder' \
--header 'Authorization: Basic {base64_encoded_credentials}'

curl --location --request PUT 'https://api.cloudinary.com/v1_1/{cloud_name}/resources/{public_id}' \
--header 'Authorization: Basic {base64_encoded_credentials}' \
--form 'asset_folder="beckwithbarrow/buhn"'
```

## Example CURL requests for Strapi

assume all have a bearer token that uses the STRAPI_CLOUD_API_TOKEN in the strapi-cloud.env file

#### Gets the list of projects in json
```
curl --location 'https://striking-ball-b079f8c4b0.strapiapp.com/api/projects'
```

### Gets the root folders list
```
curl --location 'https://striking-ball-b079f8c4b0.strapiapp.com/api/media/folders' 
```

### Gets the folders structure
```
curl --location 'https://striking-ball-b079f8c4b0.strapiapp.com/api/media/folders-structure'
```
```
[
    {
        "id": 177,
        "name": "Branding",
        "children": [
            {
                "id": 148,
                "name": "logos",
                "children": []
            }
        ]
    },
    {
        "id": 147,
        "name": "Project Photos",
        "children": [
            {
                "id": 160,
                "name": "Agricola Modern House",
                "children"
                ...
```
### Gets the files in a folder:
```
https://striking-ball-b079f8c4b0.strapiapp.com/api/media/files?folderId=160
```
```
[
    {
        "id": 2593,
        "documentId": "s37uto6sh4vohq4ys7bw111x",
        "name": "haythorne_0109_2833091ad0.jpg",
        "alternativeText": "Haythorne House - haythorne_0109_2833091ad0",
        "caption": null,
        "width": 1616,
        "height": 2364,
        "formats": {
            "large": {
                "ext": ".jpg",
                "url": "https://striking-ball-b079f8c4b0.media.strapiapp.com/large_haythorne_0109_2833091ad0_8767d328d6.jpg",
                "hash": "large_haythorne_0109_2833091ad0_8767d328d6",
                "mime": "image/jpeg",
                "name": "large_haythorne_0109_2833091ad0.jpg",
                "path": null,
                "size": 74.5,
                "width": 684,
                "height": 1000,
                "sizeInBytes": 74496
            },
            "small": {
                "ext": ".jpg",
                "url": "https://striking-ball-b079f8c4b0.media.strapiapp.com/small_haythorne_0109_2833091ad0_8767d328d6.jpg",
                "hash": "small_haythorne_0109_2833091ad0_8767d328d6",
                "mime": "image/jpeg",
                "name": "small_haythorne_0109_2833091ad0.jpg",
                "path": null,
                "size": 24.96,
                "width": 342,
                "height": 500,
                "sizeInBytes": 24960
            },
            "medium": {
                "ext": ".jpg",
                "url": "https://striking-ball-b079f8c4b0.media.strapiapp.com/medium_haythorne_0109_2833091ad0_8767d328d6.jpg",
                "hash": "medium_haythorne_0109_2833091ad0_8767d328d6",
                "mime": "image/jpeg",
                "name": "medium_haythorne_0109_2833091ad0.jpg",
                "path": null,
                "size": 46.02,
                "width": 513,
                "height": 750,
                "sizeInBytes": 46019
            },
            "thumbnail": {
                "ext": ".jpg",
                "url": "https://striking-ball-b079f8c4b0.media.strapiapp.com/thumbnail_haythorne_0109_2833091ad0_8767d328d6.jpg",
                "hash": "thumbnail_haythorne_0109_2833091ad0_8767d328d6",
                "mime": "image/jpeg",
                "name": "thumbnail_haythorne_0109_2833091ad0.jpg",
                "path": null,
                "size": 4.16,
                "width": 107,
                "height": 156,
                "sizeInBytes": 4162
            }
        },
        "hash": "haythorne_0109_2833091ad0_8767d328d6",
        "ext": ".jpg",
        "mime": "image/jpeg",
        "size": 302.2,
        "url": "https://striking-ball-b079f8c4b0.media.strapiapp.com/haythorne_0109_2833091ad0_8767d328d6.jpg",
        "previewUrl": null,
        "provider": "strapi-provider-upload-strapi-cloud",
        "provider_metadata": null,
        "folderPath": "/31/36",
        "createdAt": "2025-09-29T13:00:00.435Z",
        "updatedAt": "2025-09-29T13:00:00.435Z",
        "publishedAt": "2025-09-29T13:00:00.438Z",
        "locale": null,
        "folder": {
            "id": 163,
            "documentId": "rs0a74ye37lsmdddol26ca4r",
            "name": "Haythorne House",
            "pathId": 36,
            "path": "/31/36",
            "createdAt": "2025-09-27T19:59:29.402Z",
            "updatedAt": "2025-09-27T19:59:29.402Z",
            "publishedAt": "2025-09-27T19:59:29.402Z",
            "locale": null
        }
    }
]
