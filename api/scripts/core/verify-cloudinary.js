/**
 * Cloudinary Configuration Verification Script
 * 
 * This script helps verify that your Cloudinary configuration is working correctly.
 * Run this script to test your Cloudinary connection before deployment.
 */

const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

async function verifyCloudinaryConfig() {
    console.log('🔍 Verifying Cloudinary Configuration...\n');
    
    // Check if environment variables are set
    const requiredVars = ['CLOUDINARY_NAME', 'CLOUDINARY_KEY', 'CLOUDINARY_SECRET'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('❌ Missing environment variables:');
        missingVars.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('\n💡 Please set these in your .env file or environment');
        process.exit(1);
    }
    
    console.log('✅ Environment variables found:');
    console.log(`   - CLOUDINARY_NAME: ${process.env.CLOUDINARY_NAME}`);
    console.log(`   - CLOUDINARY_KEY: ${process.env.CLOUDINARY_KEY?.substring(0, 8)}...`);
    console.log(`   - CLOUDINARY_SECRET: ${process.env.CLOUDINARY_SECRET?.substring(0, 8)}...`);
    console.log('');
    
    try {
        // Test API connection
        console.log('🔌 Testing Cloudinary API connection...');
        const result = await cloudinary.api.ping();
        console.log('✅ Cloudinary API connection successful!');
        console.log(`   Status: ${result.status}`);
        console.log('');
        
        // Get account details
        console.log('📊 Account Information:');
        const usage = await cloudinary.api.usage();
        console.log(`   Plan: ${usage.plan || 'Free'}`);
        console.log(`   Credits Used: ${usage.credits?.used_percent || 0}%`);
        console.log(`   Resources: ${usage.resources || 0}`);
        console.log(`   Bandwidth: ${usage.bandwidth?.used_percent || 0}%`);
        console.log('');
        
        console.log('🎉 Cloudinary configuration is working correctly!');
        console.log('');
        console.log('📝 Next steps:');
        console.log('   1. Make sure these same environment variables are set in Strapi Cloud');
        console.log('   2. Deploy your application');
        console.log('   3. Test file uploads in production');
        
    } catch (error) {
        console.error('❌ Cloudinary API connection failed:');
        console.error(`   Error: ${error.message}`);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('   1. Verify your Cloudinary credentials are correct');
        console.error('   2. Check your internet connection');
        console.error('   3. Ensure your Cloudinary account is active');
        process.exit(1);
    }
}

// Run the verification
verifyCloudinaryConfig().catch(console.error);
