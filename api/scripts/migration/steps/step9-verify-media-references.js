/**
 * STEP 9: VERIFY MEDIA REFERENCES
 * 
 * Validates existing Strapi media references to ensure they're working.
 * This step checks all existing Cloudinary media in Strapi for broken links.
 */

const axios = require('axios');
const { logStepHeader, logResult, processInBatches, saveToFile } = require('../utils');

async function verifyMediaReferences(strapiApi, rl) {
  logStepHeader(9, 'VERIFY MEDIA REFERENCES');
  
  try {
    console.log('🔍 Verifying all Strapi media references...');
    
    // Get all media files from Strapi
    const response = await strapiApi.get('/api/media/files', {
      params: {
        'pagination[pageSize]': 1000
      }
    });
    
    const strapiMedia = response.data || [];
    console.log(`📸 Found ${strapiMedia.length} Strapi media files`);
    
    // Categorize by provider
    const cloudinaryMedia = strapiMedia.filter(m => m.provider === 'cloudinary');
    const otherMedia = strapiMedia.filter(m => m.provider !== 'cloudinary');
    
    console.log('\n📊 Media Provider Summary:');
    console.log(`   ☁️  Cloudinary: ${cloudinaryMedia.length}`);
    console.log(`   📁 Other: ${otherMedia.length}`);
    
    if (cloudinaryMedia.length > 0) {
      console.log('\n☁️  Cloudinary Media Files:');
      console.log('🔍 Validating Cloudinary URLs...\n');
      
      const brokenUrls = [];
      const validUrls = [];
      
      // Validate URLs in parallel batches
      const batchSize = 10;
      
      const results = await processInBatches(cloudinaryMedia, batchSize, async (media) => {
        try {
          const urlResponse = await axios.head(media.url, { timeout: 5000 });
          if (urlResponse.status < 200 || urlResponse.status >= 400) {
            return { media, status: 'broken', statusCode: urlResponse.status };
          }
          return { media, status: 'valid', statusCode: urlResponse.status };
        } catch (error) {
          return { media, status: 'broken', error: error.message };
        }
      });
      
      // Process results
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.status === 'valid') {
            validUrls.push(result.value.media);
            console.log(`   ✅ ${result.value.media.name} - ${result.value.statusCode}`);
          } else {
            brokenUrls.push({
              ...result.value.media,
              error: result.value.error || `HTTP ${result.value.statusCode}`,
              statusCode: result.value.statusCode
            });
            console.log(`   ❌ ${result.value.media.name} - ${result.value.error || result.value.statusCode}`);
          }
        } else {
          console.log(`   ❌ Batch processing error: ${result.reason}`);
        }
      });
      
      console.log(`\n📊 URL Validation Results:`);
      console.log(`   ✅ Valid URLs: ${validUrls.length}`);
      console.log(`   ❌ Broken URLs: ${brokenUrls.length}`);
      
      if (brokenUrls.length > 0) {
        console.log(`\n❌ Broken Strapi URLs:`);
        brokenUrls.forEach(media => {
          console.log(`   📄 ${media.name} - ${media.url} (${media.error})`);
        });
        
        // Save broken URLs for cleanup
        saveToFile('broken-strapi-urls.json', brokenUrls);
      }
    }
    
    console.log('\n✅ Media reference verification complete!');
    
    logResult(true, `Verified ${cloudinaryMedia.length} Cloudinary media references`);
    
  } catch (error) {
    logResult(false, 'Error during media reference verification', error.message);
    throw error;
  }
}

module.exports = { verifyMediaReferences };
