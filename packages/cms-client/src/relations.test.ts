import { describe, it, expect } from 'vitest';
import { relationFieldsOf, buildPopulateQuery } from './relations.js';

/**
 * Spec §0.6 — never assume shape. Strapi's `populate=*` reaches exactly one level,
 * and the frontend's generator compensates with a hand-maintained per-endpoint map
 * ("projects.cover", "stages.image", ...). For a revert-grade backup that is a
 * liability: add a field in Strapi and the backup silently misses it.
 *
 * So we discover what to populate from what actually came back.
 */
describe('relationFieldsOf', () => {
  it('finds a single populated relation by its documentId', () => {
    expect(relationFieldsOf({ title: 'A', cover: { documentId: 'd1', url: 'x' } })).toEqual([
      'cover',
    ]);
  });

  it('finds a repeatable relation from an array of documents', () => {
    expect(relationFieldsOf({ images: [{ documentId: 'd1' }, { documentId: 'd2' }] })).toEqual([
      'images',
    ]);
  });

  it('ignores scalars, nulls and plain arrays', () => {
    const rec = { title: 'A', count: 3, missing: null, tags: ['a', 'b'] };
    expect(relationFieldsOf(rec)).toEqual([]);
  });

  it('ignores an empty array, which carries no evidence of being a relation', () => {
    expect(relationFieldsOf({ images: [] })).toEqual([]);
  });

  it('treats a nested object without documentId as a component, not a relation', () => {
    // Components are already inlined by populate=* and need no second fetch.
    expect(relationFieldsOf({ quote: { text: 'hi', name: 'x' } })).toEqual([]);
  });

  it('returns fields sorted, for deterministic query building', () => {
    const rec = { zeta: { documentId: 'z' }, alpha: { documentId: 'a' } };
    expect(relationFieldsOf(rec)).toEqual(['alpha', 'zeta']);
  });

  it('returns nothing for non-objects', () => {
    expect(relationFieldsOf(null)).toEqual([]);
    expect(relationFieldsOf('s')).toEqual([]);
    expect(relationFieldsOf([1, 2])).toEqual([]);
  });
});

describe('buildPopulateQuery', () => {
  it('uses the wildcard when no paths are known yet', () => {
    expect(buildPopulateQuery([])).toBe('populate=*');
  });

  it('populates a discovered top-level field one level deeper', () => {
    expect(buildPopulateQuery(['cover'])).toBe('populate%5Bcover%5D%5Bpopulate%5D=*');
  });

  it('encodes a nested path as a chain of populate segments', () => {
    // stages.image -> populate[stages][populate][image][populate]=*
    expect(buildPopulateQuery(['stages.image'])).toBe(
      'populate%5Bstages%5D%5Bpopulate%5D%5Bimage%5D%5Bpopulate%5D=*',
    );
  });

  it('joins multiple paths with &', () => {
    const q = buildPopulateQuery(['cover', 'images']);
    expect(q.split('&')).toHaveLength(2);
  });

  /**
   * Regression: emitting both an ancestor and its descendant produces a query where
   * populate[pressArticles][populate] is asked to be both "*" and an object, which
   * Strapi answers with a 500. Observed against production 2026-07-22 on /api/press.
   * The descendant already populates the parent, so the ancestor is redundant.
   */
  it('drops an ancestor path when a descendant of it is present', () => {
    const q = buildPopulateQuery(['pressArticles', 'pressArticles.cover']);
    expect(q.split('&')).toHaveLength(1);
    expect(q).toBe('populate%5BpressArticles%5D%5Bpopulate%5D%5Bcover%5D%5Bpopulate%5D=*');
  });

  it('keeps siblings that merely share a prefix string', () => {
    // "coverImage" is not a descendant of "cover" — only a dot makes it one.
    expect(buildPopulateQuery(['cover', 'coverImage']).split('&')).toHaveLength(2);
  });

  it('keeps two descendants of the same ancestor', () => {
    const q = buildPopulateQuery(['stages', 'stages.image', 'stages.icon']);
    expect(q.split('&')).toHaveLength(2);
  });
});
