/**
 * home controller
 *
 * Overrides the default find action to preserve the drag-and-drop
 * ordering of the projects relation from the join/link table.
 * Strapi 5's default populate does not guarantee join-table order.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::home.home', ({ strapi }) => ({
  async find(ctx) {
    // Run the default find to get the full response with all populated fields
    const response = await super.find(ctx);

    // If projects were populated, re-sort them by join table order
    const data = response?.data;
    if (data?.projects && Array.isArray(data.projects) && data.projects.length > 1) {
      try {
        const knex = strapi.db.connection;

        // Discover the join table name (same approach as bootstrap)
        const tables = await knex.raw(
          `SELECT table_name FROM information_schema.tables
           WHERE table_name LIKE '%home%project%lnk%'
              OR table_name LIKE '%home%project%link%'
           ORDER BY table_name LIMIT 1`
        );
        const joinTable = tables?.rows?.[0]?.table_name;

        if (joinTable) {
          // Get column names to find the project FK and order column
          const cols = await knex.raw(
            `SELECT column_name FROM information_schema.columns WHERE table_name = ?`,
            [joinTable]
          );
          const colNames: string[] = cols.rows.map((r: any) => r.column_name);
          const projectCol = colNames.find((c) => c.includes('project') && c.includes('id'));
          const orderCol = colNames.find((c) => c.includes('project') && c.includes('order'))
            || colNames.find((c) => c === 'project_order');

          if (projectCol && orderCol) {
            // Fetch the ordered project IDs from the join table
            const orderedRows = await knex(joinTable)
              .select(projectCol)
              .orderBy(orderCol, 'asc');

            const orderedIds: number[] = orderedRows.map((r: any) => r[projectCol]);

            // Build a position map: project id -> sort position
            const positionMap = new Map<number, number>();
            orderedIds.forEach((id, index) => positionMap.set(id, index));

            // Sort the projects array to match join table order
            data.projects.sort((a: any, b: any) => {
              const posA = positionMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
              const posB = positionMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
              return posA - posB;
            });
          }
        }
      } catch (err) {
        // If ordering fails, return unordered rather than failing the request
        strapi.log.warn('Could not sort home projects by join table order:', err);
      }
    }

    return response;
  },
}));
