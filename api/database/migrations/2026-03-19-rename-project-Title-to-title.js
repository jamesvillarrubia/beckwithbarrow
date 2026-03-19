'use strict';

/**
 * Migration: rename projects.Title → projects.title
 * Strapi auto-detects lowercase 'title' as the relation display field.
 */

module.exports = {
  async up(knex) {
    const hasColumn = await knex.schema.hasColumn('projects', 'Title');
    if (hasColumn) {
      await knex.schema.alterTable('projects', (table) => {
        table.renameColumn('Title', 'title');
      });
    }
  },

  async down(knex) {
    const hasColumn = await knex.schema.hasColumn('projects', 'title');
    if (hasColumn) {
      await knex.schema.alterTable('projects', (table) => {
        table.renameColumn('title', 'Title');
      });
    }
  },
};
