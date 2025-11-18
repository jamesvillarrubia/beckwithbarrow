import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: [],
  },
  bootstrap(app: StrapiApp) {
    // Patch image loading to enable CORS for canvas operations
    // This fixes the "Tainted canvases may not be exported" error
    const originalCreateElement = document.createElement.bind(document);

    document.createElement = function(tagName: string, options?: any) {
      const element = originalCreateElement(tagName, options);

      // Add crossOrigin attribute to all images loaded in the admin panel
      if (tagName.toLowerCase() === 'img') {
        (element as HTMLImageElement).crossOrigin = 'anonymous';
      }

      return element;
    };

    console.log('Strapi admin initialized with CORS-enabled image loading');
  },
};
