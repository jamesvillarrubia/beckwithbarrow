import { describe, it, expect } from 'vitest';
import { describeFields, summariseType } from './describe.js';

/**
 * describe() exists so an agent never has to memorise the CMS, and never has to trust
 * documentation that can drift. Everything here is inferred from a LIVE response —
 * `global.draftAndPublish` is false in the checked-in schema.json but true in
 * production, so anything derived from the repo would already be wrong.
 */
describe('describeFields', () => {
  it('reports scalar field types', () => {
    const fields = describeFields({ title: 'A', count: 3, live: true });
    expect(fields.map((f) => [f.name, f.type])).toEqual([
      ['count', 'number'],
      ['live', 'boolean'],
      ['title', 'string'],
    ]);
    // A short sample rides along so a caller can recognise a field without a second fetch.
    expect(fields[2]).toMatchObject({ name: 'title', sample: 'A' });
  });

  it('identifies media by url + mime rather than by field name', () => {
    const fields = describeFields({
      cover: { documentId: 'm', url: 'a.jpg', mime: 'image/jpeg' },
    });
    expect(fields[0]).toMatchObject({ name: 'cover', type: 'media' });
  });

  it('identifies a to-many relation and reports how many it holds', () => {
    const fields = describeFields({
      pressArticles: [{ documentId: 'a' }, { documentId: 'b' }, { documentId: 'c' }],
    });
    expect(fields[0]).toMatchObject({ name: 'pressArticles', type: 'relation[]', count: 3 });
  });

  it('identifies a to-one relation', () => {
    const fields = describeFields({ category: { documentId: 'c', name: 'x' } });
    expect(fields[0]).toMatchObject({ name: 'category', type: 'relation' });
  });

  it('calls a nested object without documentId a component, not a relation', () => {
    const fields = describeFields({ quote: { text: 'hi', name: 'x' } });
    expect(fields[0]).toMatchObject({ name: 'quote', type: 'component' });
  });

  it('reports a null field as unset rather than guessing its type', () => {
    expect(describeFields({ cover: null })[0]).toMatchObject({ name: 'cover', type: 'unset' });
  });

  it('omits the server-managed plumbing an editor cannot change', () => {
    const names = describeFields({
      id: 1,
      documentId: 'd',
      createdAt: 'x',
      updatedAt: 'y',
      publishedAt: 'z',
      title: 'keep me',
    }).map((f) => f.name);
    expect(names).toEqual(['title']);
  });

  it('truncates long sample values so the map stays context-sized', () => {
    const long = 'x'.repeat(500);
    const field = describeFields({ body: long })[0];
    expect((field?.sample as string).length).toBeLessThan(140);
  });
});

describe('summariseType', () => {
  /**
   * Regression: draft & publish was originally inferred from `publishedAt` being
   * present. That is wrong — publishedAt exists on every entry regardless, so it
   * reported all ten live types as draft&publish, six of them falsely. The only sound
   * signal is observing the draft response actually differ from the published one.
   */
  it('does not surface publishedAt as an editable field', () => {
    const summary = summariseType('connect', 'singleType', [
      { publishedAt: '2026-01-01T00:00:00.000Z', email: 'a@b.c' },
    ]);
    expect(summary.fields.map((f) => f.name)).toEqual(['email']);
  });

  it('reports the API total rather than the sample size', () => {
    // Sampling 5 of 15 projects must not report "5 projects".
    const summary = summariseType('projects', 'collectionType', [{ title: 'a' }], 15);
    expect(summary.records).toBe(15);
  });

  it('reports the record count for a collection', () => {
    const summary = summariseType('projects', 'collectionType', [{ title: 'a' }, { title: 'b' }]);
    expect(summary.records).toBe(2);
  });

  it('unions fields across records, since not every record populates every field', () => {
    const summary = summariseType('projects', 'collectionType', [
      { title: 'a' },
      { subtitle: 'b' },
    ]);
    expect(summary.fields.map((f) => f.name)).toEqual(['subtitle', 'title']);
  });

  it('handles an empty collection without inventing fields', () => {
    const summary = summariseType('empty', 'collectionType', []);
    expect(summary.fields).toEqual([]);
    expect(summary.records).toBe(0);
  });
});
