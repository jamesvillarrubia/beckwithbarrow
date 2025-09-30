'use strict';

/**
 * Custom media-files routes
 * Provides endpoints for full media file control including formats
 */

module.exports = {
  routes: [
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
