import { describe, it, expect } from 'vitest';
import {
  parseEnvelope,
  discoverPopulatePaths,
  fetchAllPages,
  fetchDeep,
  type Transport,
} from './content.js';

describe('parseEnvelope', () => {
  it('accepts a collection envelope and returns data plus pagination', () => {
    const env = parseEnvelope({
      data: [{ documentId: 'a' }],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 2, total: 30 } },
    });
    expect(env.data).toHaveLength(1);
    expect(env.pagination).toMatchObject({ page: 1, pageCount: 2 });
  });

  it('accepts a single-type envelope, which has no pagination', () => {
    const env = parseEnvelope({ data: { documentId: 'a' }, meta: {} });
    expect(env.pagination).toBeUndefined();
    expect(env.data).toMatchObject({ documentId: 'a' });
  });

  /**
   * Spec §0.6: a schema mismatch is a STOP, not something to coerce past. A backup
   * that silently swallowed an unexpected response would be worse than no backup,
   * because it would look like it succeeded.
   */
  it('throws rather than coercing when the envelope has no data key', () => {
    expect(() => parseEnvelope({ error: 'nope' })).toThrow(/envelope/i);
  });

  it('throws on a null response', () => {
    expect(() => parseEnvelope(null)).toThrow(/envelope/i);
  });
});

describe('discoverPopulatePaths', () => {
  it('returns no paths when nothing looks like a relation', () => {
    expect(discoverPopulatePaths([{ title: 'A' }])).toEqual([]);
  });

  it('discovers a top-level relation field', () => {
    expect(discoverPopulatePaths([{ cover: { documentId: 'd' } }])).toEqual(['cover']);
  });

  it('unions relation fields seen across different records', () => {
    const records = [{ cover: { documentId: 'c' } }, { images: [{ documentId: 'i' }] }];
    expect(discoverPopulatePaths(records)).toEqual(['cover', 'images']);
  });

  it('descends into an already-populated relation to find the next level', () => {
    const records = [{ stages: [{ documentId: 's', image: { documentId: 'i' } }] }];
    expect(discoverPopulatePaths(records)).toEqual(['stages', 'stages.image']);
  });

  it('handles a single-type object as well as a list', () => {
    expect(discoverPopulatePaths({ cover: { documentId: 'd' } })).toEqual(['cover']);
  });

  /**
   * Media is a leaf. Strapi media objects carry a `related` back-reference to whatever
   * uses them, and asking Strapi to populate it returns a 500. We want the image's
   * metadata, never the graph of what points at it.
   */
  it('does not descend into a media object', () => {
    const records = [
      {
        cover: {
          documentId: 'm1',
          url: 'https://res.cloudinary.com/x/a.jpg',
          mime: 'image/jpeg',
          related: { documentId: 'p1' },
        },
      },
    ];
    expect(discoverPopulatePaths(records)).toEqual(['cover']);
  });

  it('still descends through a non-media relation to reach media below it', () => {
    const records = [
      { stages: [{ documentId: 's', image: { documentId: 'i', url: 'u', mime: 'image/png' } }] },
    ];
    expect(discoverPopulatePaths(records)).toEqual(['stages', 'stages.image']);
  });
});

describe('fetchDeep', () => {
  it('deepens until discovery stops revealing new relations', async () => {
    const urls: string[] = [];
    const transport: Transport = async (url) => {
      urls.push(url);
      return {
        data: [{ documentId: 'a', cover: { documentId: 'c', url: 'u', mime: 'image/png' } }],
        meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 1 } },
      };
    };
    const out = await fetchDeep('https://api.test', 'projects', transport);
    expect(out.paths).toEqual(['cover']);
    // round 1 = populate=*, round 2 = populate[cover]..., then stable.
    expect(urls).toHaveLength(2);
  });

  /**
   * A deepened query that Strapi rejects must not fail the endpoint — we keep the last
   * depth that worked. Losing an endpoint entirely would make the backup incomplete,
   * and an incomplete backup is the one thing a revert point cannot be.
   */
  it('falls back to the last successful depth when deepening fails', async () => {
    let call = 0;
    const transport: Transport = async () => {
      call += 1;
      if (call === 1) {
        return {
          data: [{ documentId: 'a', cover: { documentId: 'c' } }],
          meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 1 } },
        };
      }
      throw new Error('GET ... -> 500');
    };
    const out = await fetchDeep('https://api.test', 'projects', transport);
    expect(out.records).toHaveLength(1);
    expect(out.degraded).toBe(true);
  });

  it('propagates a failure on the very first fetch, which has no fallback', async () => {
    const transport: Transport = async () => {
      throw new Error('GET ... -> 404');
    };
    await expect(fetchDeep('https://api.test', 'nope', transport)).rejects.toThrow(/404/);
  });
});

describe('fetchAllPages', () => {
  /** Builds a transport that serves a fixed set of pages and records the URLs asked for. */
  function fakeTransport(pages: unknown[][]): { transport: Transport; urls: string[] } {
    const urls: string[] = [];
    const transport: Transport = async (url) => {
      urls.push(url);
      const page = Number(new URL(url, 'https://x').searchParams.get('pagination[page]') ?? '1');
      const data = pages[page - 1] ?? [];
      return {
        data,
        meta: { pagination: { page, pageSize: 100, pageCount: pages.length, total: 999 } },
      };
    };
    return { transport, urls };
  }

  it('returns the records from a single page', async () => {
    const { transport } = fakeTransport([[{ documentId: 'a' }]]);
    const out = await fetchAllPages('https://api.test', 'projects', 'populate=*', transport);
    expect(out).toHaveLength(1);
  });

  it('follows pageCount and concatenates every page in order', async () => {
    const { transport, urls } = fakeTransport([
      [{ documentId: 'a' }],
      [{ documentId: 'b' }],
      [{ documentId: 'c' }],
    ]);
    const out = await fetchAllPages('https://api.test', 'projects', 'populate=*', transport);
    expect(out.map((r) => (r as { documentId: string }).documentId)).toEqual(['a', 'b', 'c']);
    expect(urls).toHaveLength(3);
  });

  it('includes the supplied populate query on every request', async () => {
    const { transport, urls } = fakeTransport([[{ documentId: 'a' }], [{ documentId: 'b' }]]);
    await fetchAllPages('https://api.test', 'projects', 'populate=*', transport);
    expect(urls.every((u) => u.includes('populate=*'))).toBe(true);
  });

  it('stops at a page budget rather than looping forever on a bad pageCount', async () => {
    const transport: Transport = async () => ({
      data: [{ documentId: 'x' }],
      meta: { pagination: { page: 1, pageSize: 100, pageCount: 10_000, total: 1_000_000 } },
    });
    await expect(
      fetchAllPages('https://api.test', 'projects', 'populate=*', transport),
    ).rejects.toThrow(/page budget/i);
  });
});
