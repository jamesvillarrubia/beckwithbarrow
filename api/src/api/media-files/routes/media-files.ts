/**
 * Custom media-files routes
 * Provides endpoints for full media file control including formats
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/media-files',
      handler: 'media-files.listMediaFiles',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/media-files/:id',
      handler: 'media-files.updateMediaFile',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/media-files',
      handler: 'media-files.createMediaFile',
      config: {
        policies: [],
        middlewares: [],
      },
    }
  ],
};
