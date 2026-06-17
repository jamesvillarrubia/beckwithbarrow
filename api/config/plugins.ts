export default ({ env }) => ({
    upload: {
        config: {
            provider: 'cloudinary',
            providerOptions: {
                cloud_name: env('CLOUDINARY_NAME'),
                api_key: env('CLOUDINARY_KEY'),
                api_secret: env('CLOUDINARY_SECRET'),
                // Enable CORS for image manipulation in Strapi admin
                secure: true,
                cors: 'anonymous',
            },
            actionOptions: {
                upload: {
                    tags: ['strapi'],
                    // Add CORS headers to uploaded images
                    context: 'cors=anonymous',
                },
                uploadStream: {
                    folder: 'direct_uploads',
                    tags: ['strapi'],
                    context: 'cors=anonymous',
                },
                // `delete` action intentionally omitted (defense-in-depth alongside the
                // runtime no-op in src/index.ts). Deleting a record orphans the Cloudinary
                // asset instead of destroying it — see reqts/website-management-agent.md.
            },
        },
    },
    'color-picker': {
        enabled: true,
        config: {
            // Color picker configuration options
        },
    },
});