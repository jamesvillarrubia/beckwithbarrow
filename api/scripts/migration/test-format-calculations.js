/**
 * Test script to verify format calculations
 */

const { generateCloudinaryFormats } = require('./utils');

// Test with the problematic image from the API
const testImage = {
  publicId: 'p6dzrmwekf5krntws6wj',
  url: 'https://res.cloudinary.com/dqeqavdd8/image/upload/v1758995559/p6dzrmwekf5krntws6wj.jpg',
  width: 1000,
  height: 667,
  format: 'jpg',
  bytes: 256.77 * 1024, // Convert KB to bytes
  displayName: 'other_24_0342cd3738'
};

console.log('🧪 Testing format calculations...');
console.log(`Original image: ${testImage.width}x${testImage.height} (aspect ratio: ${(testImage.width / testImage.height).toFixed(3)})`);

const formats = generateCloudinaryFormats(testImage);

console.log('\n📊 Generated formats:');
Object.entries(formats).forEach(([name, format]) => {
  const aspectRatio = format.width / format.height;
  const originalAspectRatio = testImage.width / testImage.height;
  const aspectRatioMatch = Math.abs(aspectRatio - originalAspectRatio) < 0.01;
  
  console.log(`${name}: ${format.width}x${format.height} (aspect ratio: ${aspectRatio.toFixed(3)}) ${aspectRatioMatch ? '✅' : '❌'}`);
});

console.log('\n🔍 Expected vs Actual:');
console.log('Expected thumbnail: 245x163 (aspect ratio: 1.503)');
console.log('Expected small: 500x333 (aspect ratio: 1.502)');
console.log('Expected medium: 750x500 (aspect ratio: 1.500)');
console.log('Expected large: 1000x667 (aspect ratio: 1.499)');

