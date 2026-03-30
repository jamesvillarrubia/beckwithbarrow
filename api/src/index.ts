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

    // Fix home→projects join table so the published home row references published project rows.
    // In Strapi 5 with draftAndPublish, the public API serves published content. The join table
    // must reference published row IDs for populated relations to return results.
    try {
      const knex = strapi.db.connection;

      // Find the join table for home→projects
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
        const colNames: string[] = cols.rows.map((r: any) => r.column_name);
        const homeCol = colNames.find((c) => c.includes('home') && c.includes('id'));
        const projectIdCol = colNames.find((c) => c.includes('project') && c.includes('id'));
        const projectOrderCol = colNames.find((c) => c.includes('project') && c.includes('order'));

        strapi.log.info(`Join table: ${joinTable}, cols: ${colNames.join(', ')}`);

        if (homeCol && projectIdCol) {
          // Step 1: Ensure join table points to PUBLISHED project row IDs (not draft).
          // The public API filters by publishedAt IS NOT NULL, so references must be published rows.
          const fixedToPublished = await knex.raw(`
            UPDATE "${joinTable}" AS lnk
            SET "${projectIdCol}" = pub.id
            FROM projects AS draft, projects AS pub
            WHERE lnk."${projectIdCol}" = draft.id
              AND draft.published_at IS NULL
              AND pub.document_id = draft.document_id
              AND pub.published_at IS NOT NULL
          `);
          if (fixedToPublished?.rowCount > 0) {
            strapi.log.info(`Fixed ${fixedToPublished.rowCount} join entries: draft → published project IDs`);
          }

          // Step 2: Ensure the PUBLISHED home row has join table entries.
          // When the relation is configured in admin (on the draft home), and the home is then
          // published, the published home row may not have matching join table entries.
          const publishedHome = await knex('homes')
            .select('id', 'document_id')
            .whereNotNull('published_at')
            .first();
          const draftHome = publishedHome
            ? await knex('homes')
                .select('id')
                .where('document_id', publishedHome.document_id)
                .whereNull('published_at')
                .first()
            : null;

          if (publishedHome && draftHome && publishedHome.id !== draftHome.id) {
            // Check if published home has any join table entries
            const pubEntries = await knex(joinTable).where(homeCol, publishedHome.id).count('* as cnt').first();
            const draftEntries = await knex(joinTable).where(homeCol, draftHome.id).count('* as cnt').first();

            const pubCount = parseInt(String(pubEntries?.cnt ?? 0));
            const draftCount = parseInt(String(draftEntries?.cnt ?? 0));

            strapi.log.info(`Home join entries — published (id=${publishedHome.id}): ${pubCount}, draft (id=${draftHome.id}): ${draftCount}`);

            if (draftCount > 0 && pubCount === 0) {
              // Copy draft home's join entries to published home, preserving order
              const draftRows = await knex(joinTable)
                .where(homeCol, draftHome.id)
                .orderBy(projectOrderCol ?? 'id', 'asc');

              const toInsert = draftRows.map((row: any) => ({
                ...row,
                id: undefined, // let DB assign new ID
                [homeCol]: publishedHome.id,
              }));

              // Remove undefined id key
              const cleanInsert = toInsert.map(({ id: _id, ...rest }: any) => rest);

              await knex(joinTable).insert(cleanInsert);
              strapi.log.info(`Copied ${cleanInsert.length} join entries from draft home to published home`);
            }
          }
        }
      }
    } catch (err) {
      strapi.log.warn('Could not fix home→projects join table:', err);
    }
  },
};
