import type { Core } from '@strapi/strapi';
import { Readable } from 'stream';

// Define interfaces for the request body structure
interface ProjectRelationItem {
  id: number;
  documentId: number;
  isTemporary: boolean;
  locale?: string;
  localizations?: unknown;
  position?: { before?: string; after?: string; end?: boolean; start?: boolean };
  [key: string]: unknown;
}

interface ProjectRelations {
  connect?: ProjectRelationItem[];
  disconnect?: ProjectRelationItem[];
}

interface HomeRequestBody {
  projects?: ProjectRelations;
  [key: string]: any;
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // Add middleware to handle locale issues at the server level
    strapi.server.use(async (ctx, next) => {
      // Check if this is a request to the home content type
      if (ctx.path.includes('/content-manager/single-types/api::home.home') && 
          (ctx.method === 'PUT' || ctx.method === 'POST')) {
        console.log('🔍 MIDDLEWARE: Intercepting request to home content type');
        console.log('🔍 MIDDLEWARE: Path:', ctx.path);
        console.log('🔍 MIDDLEWARE: Method:', ctx.method);
        
        // Parse the body manually first
        const body = await new Promise<HomeRequestBody>((resolve) => {
          let data = '';
          ctx.req.on('data', chunk => data += chunk);
          ctx.req.on('end', () => {
            try {
              resolve(JSON.parse(data) as HomeRequestBody);
            } catch (e) {
              resolve({});
            }
          });
        });
        
        console.log('🔍 MIDDLEWARE: Parsed body:', JSON.stringify(body, null, 2));
        
        // Clean the locale data
        if (body && body.projects && body.projects.connect) {
          console.log('🔍 MIDDLEWARE: Found projects.connect, cleaning locale data');
          console.log('🔍 MIDDLEWARE: Original connect data:', JSON.stringify(body.projects.connect, null, 2));
          
          body.projects.connect = body.projects.connect.map(({ locale, localizations, ...rest }: ProjectRelationItem) => rest);
          
          console.log('🔍 MIDDLEWARE: Cleaned connect data:', JSON.stringify(body.projects.connect, null, 2));
        }
        
        if (body && body.projects && body.projects.disconnect) {
          console.log('🔍 MIDDLEWARE: Found projects.disconnect, cleaning locale data');
          console.log('🔍 MIDDLEWARE: Original disconnect data:', JSON.stringify(body.projects.disconnect, null, 2));
          
          body.projects.disconnect = body.projects.disconnect.map(({ locale, localizations, ...rest }: ProjectRelationItem) => rest);
          
          console.log('🔍 MIDDLEWARE: Cleaned disconnect data:', JSON.stringify(body.projects.disconnect, null, 2));
        }
        
        // Set the cleaned body
        ctx.request.body = body;
        console.log('🔍 MIDDLEWARE: Final cleaned body:', JSON.stringify(body, null, 2));
        
        // Recreate the request stream so other middleware can read it
        const cleanedBodyString = JSON.stringify(body);
        const newStream = new Readable();
        newStream.push(cleanedBodyString);
        newStream.push(null); // End the stream
        
        // Preserve original request properties and headers
        const originalReq = ctx.req;
        
        // Copy essential properties without overriding read-only stream properties
        (newStream as any).headers = { ...originalReq.headers };
        (newStream as any).method = originalReq.method;
        (newStream as any).url = originalReq.url;
        (newStream as any).socket = originalReq.socket;
        (newStream as any).connection = originalReq.connection;
        (newStream as any).httpVersion = originalReq.httpVersion;
        (newStream as any).httpVersionMajor = originalReq.httpVersionMajor;
        (newStream as any).httpVersionMinor = originalReq.httpVersionMinor;
        (newStream as any).rawHeaders = originalReq.rawHeaders;
        (newStream as any).trailers = originalReq.trailers;
        (newStream as any).rawTrailers = originalReq.rawTrailers;
        
        // Update the content-length header to match the new body
        (newStream as any).headers['content-length'] = cleanedBodyString.length.toString();
        
        ctx.req = newStream as any;
      }
      
      await next();
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Fix mainField for projects content type — ensures the relation widget
    // displays project titles instead of document IDs.
    // The DB setting was cached as "Title" (capital T) after the column rename.
    try {
      const store = strapi.store({ type: 'plugin', name: 'content_manager' });
      const key = 'configuration_content_types::api::project.project';
      const config = await store.get({ key }) as any;
      if (config?.settings?.mainField === 'Title') {
        config.settings.mainField = 'title';
        if (config.metadatas?.Title) {
          config.metadatas.title = config.metadatas.Title;
          delete config.metadatas.Title;
        }
        await store.set({ key, value: config });
        strapi.log.info('Fixed project mainField: Title → title');
      }
    } catch (err) {
      strapi.log.warn('Could not fix project mainField setting:', err);
    }
  },
};
