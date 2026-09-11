'use strict';

/**
 * Migration: update the content-manager's DB-stored mainField for projects
 *
 * Strapi stores content-manager settings in `strapi_core_store_settings`.
 * After renaming Title → title, the cached mainField still says "Title",
 * causing the admin relation widget to query a non-existent quoted column
 * in PostgreSQL. This migration patches the stored JSON to use "title".
 */

module.exports = {
  async up(knex) {
    // Guard for a genuinely fresh install (e.g. local SQLite dev DB): the
    // core-store table doesn't exist yet until Strapi's own core migrations
    // create it. Nothing to fix on a DB that has never been bootstrapped.
    if (!(await knex.schema.hasTable('strapi_core_store_settings'))) return;

    const row = await knex('strapi_core_store_settings')
      .where('key', 'plugin_content_manager_configuration_content_types::api::project.project')
      .first();

    if (!row) return;

    const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;

    if (value?.settings?.mainField === 'Title') {
      value.settings.mainField = 'title';

      // Also fix metadatas if it references Title
      if (value.metadatas?.Title) {
        value.metadatas.title = value.metadatas.Title;
        delete value.metadatas.Title;
      }

      // Fix layouts.list if it references Title
      if (value.layouts?.list) {
        value.layouts.list = value.layouts.list.map((field) =>
          field === 'Title' ? 'title' : field
        );
      }

      // Fix layouts.edit if it references Title
      if (value.layouts?.edit) {
        value.layouts.edit = value.layouts.edit.map((row) =>
          row.map((item) => {
            if (item?.name === 'Title') {
              return { ...item, name: 'title' };
            }
            return item;
          })
        );
      }

      await knex('strapi_core_store_settings')
        .where('key', 'plugin_content_manager_configuration_content_types::api::project.project')
        .update({ value: JSON.stringify(value) });
    }
  },

  async down(knex) {
    if (!(await knex.schema.hasTable('strapi_core_store_settings'))) return;

    const row = await knex('strapi_core_store_settings')
      .where('key', 'plugin_content_manager_configuration_content_types::api::project.project')
      .first();

    if (!row) return;

    const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;

    if (value?.settings?.mainField === 'title') {
      value.settings.mainField = 'Title';

      await knex('strapi_core_store_settings')
        .where('key', 'plugin_content_manager_configuration_content_types::api::project.project')
        .update({ value: JSON.stringify(value) });
    }
  },
};
