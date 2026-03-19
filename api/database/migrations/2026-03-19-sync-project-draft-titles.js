'use strict';

/**
 * Migration: copy title from published rows to draft rows where draft title is NULL
 *
 * In Strapi 5 draft/publish, each document has two rows in the DB:
 *   - draft:     published_at IS NULL
 *   - published: published_at IS NOT NULL
 *
 * After the Title→title rename, some draft rows ended up with title=NULL
 * while their published counterparts had the title. This migration syncs them.
 */

module.exports = {
  async up(knex) {
    await knex.raw(`
      UPDATE projects AS draft
      SET title = published.title
      FROM projects AS published
      WHERE draft.document_id = published.document_id
        AND draft.published_at IS NULL
        AND published.published_at IS NOT NULL
        AND (draft.title IS NULL OR draft.title = '')
        AND published.title IS NOT NULL
    `);
  },

  async down() {
    // No meaningful rollback — we're just filling in missing data
  },
};
