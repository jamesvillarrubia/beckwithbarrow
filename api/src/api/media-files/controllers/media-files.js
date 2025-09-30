'use strict';

/**
 * Custom media-files controller
 * Extends the default media library functionality to allow full updates including formats
 */

module.exports = {
  /**
   * Update a media file with full control over all fields including formats
   * This bypasses the default media library restrictions
   */
  async updateMediaFile(ctx) {
    const { id } = ctx.params;
    const updateData = ctx.request.body;

    try {
      // Get the media file
      const mediaFile = await strapi.entityService.findOne('plugin::upload.file', id);
      
      if (!mediaFile) {
        return ctx.notFound('Media file not found');
      }

      // Update the media file with all provided data
      const updatedMediaFile = await strapi.entityService.update('plugin::upload.file', id, {
        data: {
          name: updateData.name || mediaFile.name,
          alternativeText: updateData.alternativeText || mediaFile.alternativeText,
          caption: updateData.caption || mediaFile.caption,
          url: updateData.url || mediaFile.url,
          formats: updateData.formats || mediaFile.formats,
          provider: updateData.provider || mediaFile.provider,
          provider_metadata: updateData.provider_metadata || mediaFile.provider_metadata,
          folder: updateData.folderId ? { id: updateData.folderId } : mediaFile.folder,
          // Allow updating any other fields
          ...updateData
        }
      });

      return ctx.send({
        data: updatedMediaFile
      });

    } catch (error) {
      strapi.log.error('Error updating media file:', error);
      return ctx.internalServerError('Failed to update media file');
    }
  },

  /**
   * Create a media file with full control over all fields
   */
  async createMediaFile(ctx) {
    const createData = ctx.request.body;

    try {
      // Create the media file with all provided data
      const mediaFile = await strapi.entityService.create('plugin::upload.file', {
        data: {
          name: createData.name,
          alternativeText: createData.alternativeText,
          caption: createData.caption,
          url: createData.url,
          formats: createData.formats,
          provider: createData.provider,
          provider_metadata: createData.provider_metadata,
          folder: createData.folderId ? { id: createData.folderId } : null,
          // Allow setting any other fields
          ...createData
        }
      });

      return ctx.send({
        data: mediaFile
      });

    } catch (error) {
      strapi.log.error('Error creating media file:', error);
      return ctx.internalServerError('Failed to create media file');
    }
  }
};
