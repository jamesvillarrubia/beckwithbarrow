import { describe, it, expect } from 'vitest';
import { candidatesFromSchemas, type SchemaFile } from './discover.js';

/**
 * The local schema.json files are a HINT ONLY (spec §0.6). These tests pin the
 * translation from schema file -> candidate endpoint; whether the endpoint really
 * exists is settled against the live API, not here.
 */
describe('candidatesFromSchemas', () => {
  const singleType: SchemaFile = {
    path: 'api/src/api/about/content-types/about/schema.json',
    kind: 'singleType',
    singularName: 'about',
    pluralName: 'abouts',
  };
  const collection: SchemaFile = {
    path: 'api/src/api/project/content-types/project/schema.json',
    kind: 'collectionType',
    singularName: 'project',
    pluralName: 'projects',
  };

  it('uses the singular name for single types', () => {
    const [c] = candidatesFromSchemas([singleType]);
    expect(c).toMatchObject({ endpoint: 'about', kind: 'singleType' });
  });

  it('uses the plural name for collection types', () => {
    const [c] = candidatesFromSchemas([collection]);
    expect(c).toMatchObject({ endpoint: 'projects', kind: 'collectionType' });
  });

  it('returns candidates sorted by endpoint for stable, diffable output', () => {
    const got = candidatesFromSchemas([collection, singleType]).map((c) => c.endpoint);
    expect(got).toEqual(['about', 'projects']);
  });

  it('drops schemas missing the name the endpoint is built from', () => {
    const broken: SchemaFile = {
      path: 'x/schema.json',
      kind: 'collectionType',
      singularName: 'thing',
      pluralName: '',
    };
    expect(candidatesFromSchemas([broken])).toEqual([]);
  });

  it('de-duplicates when two schema files resolve to the same endpoint', () => {
    const dup = { ...collection, path: 'other/schema.json' };
    expect(candidatesFromSchemas([collection, dup])).toHaveLength(1);
  });
});
