import type { Core } from '@strapi/strapi';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    // Patch relations endpoint: fill in missing titles from the DB.
    // Works around a Strapi 5 bug where some relation entries reference
    // published rows instead of draft rows, returning locale instead of title.
    strapi.server.use(async (ctx, next) => {
      if (ctx.path.includes('/content-manager/relations/') &&
          ctx.path.includes('/projects') &&
          ctx.method === 'GET') {
        await next();
        if (ctx.body?.results) {
          const missing = ctx.body.results.filter((r: any) => !r.title);
          if (missing.length > 0) {
            const ids = missing.map((r: any) => r.id);
            const rows = await strapi.db.connection('projects')
              .select('id', 'title')
              .whereIn('id', ids);
            const titleMap = new Map(rows.map((r: any) => [r.id, r.title]));
            for (const item of ctx.body.results) {
              if (!item.title && titleMap.has(item.id)) {
                item.title = titleMap.get(item.id);
              }
            }
          }
        }
        return;
      }

      await next();
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Fix mainField for projects content type
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

    // Fix join table: some entries reference published rows instead of draft rows.
    try {
      const knex = strapi.db.connection;
      const tables = await knex.raw(
        `SELECT table_name FROM information_schema.tables
         WHERE table_name LIKE '%home%project%lnk%' OR table_name LIKE '%home%project%link%'
         ORDER BY table_name LIMIT 1`
      );
      const joinTable = tables?.rows?.[0]?.table_name;

      if (joinTable) {
        const cols = await knex.raw(
          `SELECT column_name FROM information_schema.columns WHERE table_name = ?`,
          [joinTable]
        );
        const colNames = cols.rows.map((r: any) => r.column_name);
        const projectCol = colNames.find((c: string) => c.includes('project'));

        if (projectCol) {
          const fixed = await knex.raw(`
            UPDATE "${joinTable}" AS lnk
            SET "${projectCol}" = draft.id
            FROM projects AS pub, projects AS draft
            WHERE lnk."${projectCol}" = pub.id
              AND pub.published_at IS NOT NULL
              AND draft.document_id = pub.document_id
              AND draft.published_at IS NULL
          `);
          if (fixed?.rowCount > 0) {
            strapi.log.info(`Fixed ${fixed.rowCount} join table entries: published → draft row IDs`);
          }
        }
      }
    } catch (err) {
      strapi.log.warn('Could not fix join table references:', err);
    }
  },
};
