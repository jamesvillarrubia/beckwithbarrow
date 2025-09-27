export default ({ env }) => ({
    upload: {
        config: {
        provider: 'cloudinary',
        providerOptions: {
            cloud_name: env('CLOUDINARY_NAME'),
            api_key: env('CLOUDINARY_KEY'),
            api_secret: env('CLOUDINARY_SECRET'),
           
        },
        actionOptions: {
            upload: {},
            uploadStream: {},
            delete: {},
        },
        },
    },
    'media-library-handler': {
        enabled: true,
        config: {
            // Optional: Configure folder permissions
            // permissions: {
            //     create: ['authenticated'],
            //     read: ['public'],
            //     update: ['authenticated'],
            //     delete: ['authenticated']
            // }
        }
    },
});