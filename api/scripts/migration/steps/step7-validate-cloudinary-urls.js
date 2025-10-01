/**
 * STEP 7: DISCOVER EXISTING STRAPI MEDIA
 * 
 * Discovers existing Strapi media entries that reference Cloudinary.
 * This step identifies what's already in Strapi before syncing.
 */

const axios = require('axios');
const { logStepHeader, logResult, processInBatches, saveToFile } = require('../utils');

async function discoverExistingStrapiMedia(strapiApi, rl) {
  logStepHeader(7, 'DISCOVER EXISTING STRAPI MEDIA');
  
  try {
    console.log('🔍 Fetching existing Strapi media entries...');
    
    // Get all media files from Strapi
    const response = await strapiApi.get('/api/media/files', {
      params: {
        'pagination[pageSize]': 1000
      }
    });
    
    const allMedia = response.data || [];
    console.log(`📸 Found ${allMedia.length} total Strapi media files`);
    
    // Filter for Cloudinary media
    const cloudinaryMedia = allMedia.filter(m => m.provider === 'cloudinary');
    const otherMedia = allMedia.filter(m => m.provider !== 'cloudinary');
    
    console.log('\n📊 Media Provider Summary:');
    console.log(`   ☁️  Cloudinary: ${cloudinaryMedia.length}`);
    console.log(`   📁 Other: ${otherMedia.length}`);
    
    if (cloudinaryMedia.length > 0) {
      console.log('\n☁️  Existing Cloudinary Media in Strapi:');
      cloudinaryMedia.forEach(media => {
        console.log(`   📄 ${media.name} (${media.width}x${media.height}) - ${media.url}`);
      });
    }
    
    logResult(true, `Found ${cloudinaryMedia.length} existing Cloudinary media entries in Strapi`);
    
    return cloudinaryMedia;
    
  } catch (error) {
    logResult(false, 'Error discovering existing Strapi media', error.message);
    throw error;
  }
}

module.exports = { discoverExistingStrapiMedia };
