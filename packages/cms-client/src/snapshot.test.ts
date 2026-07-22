import { describe, it, expect } from 'vitest';
import { stripRegenerable, stableStringify } from './snapshot.js';

/**
 * Snapshots are committed to git and are the revert point, so they must be
 * (a) small — no regenerable Cloudinary derivatives, and
 * (b) byte-stable — same content must produce the same bytes, or every backup
 *     shows a spurious diff and the history stops being useful.
 */
describe('stripRegenerable', () => {
  it('drops the derived formats block from a media object', () => {
    const media = {
      id: 1,
      url: 'https://res.cloudinary.com/x/image/upload/v1/a.jpg',
      formats: { thumbnail: { url: 'thumb.jpg' }, large: { url: 'large.jpg' } },
    };
    const out = stripRegenerable(media) as Record<string, unknown>;
    expect(out['formats']).toBeUndefined();
    expect(out['url']).toBe(media.url);
  });

  it('keeps the url, which is the irreplaceable pointer to the binary', () => {
    const out = stripRegenerable({ formats: {}, url: 'keep-me' }) as Record<string, unknown>;
    expect(out['url']).toBe('keep-me');
  });

  it('recurses through nested objects and arrays', () => {
    const doc = {
      title: 'A',
      cover: { url: 'c.jpg', formats: { thumbnail: {} } },
      images: [{ url: 'i1.jpg', formats: { large: {} } }],
    };
    const out = stripRegenerable(doc) as any;
    expect(out.cover.formats).toBeUndefined();
    expect(out.images[0].formats).toBeUndefined();
    expect(out.title).toBe('A');
    expect(out.images[0].url).toBe('i1.jpg');
  });

  it('does not mutate its input', () => {
    const input = { formats: { a: 1 } };
    stripRegenerable(input);
    expect(input.formats).toEqual({ a: 1 });
  });

  it('passes primitives and null through untouched', () => {
    expect(stripRegenerable(null)).toBeNull();
    expect(stripRegenerable(5)).toBe(5);
    expect(stripRegenerable('s')).toBe('s');
  });

  it('only strips formats on objects that look like media (have a url)', () => {
    // A content field legitimately named "formats" on a non-media object must survive.
    const notMedia = { name: 'printing', formats: ['a4', 'letter'] };
    const out = stripRegenerable(notMedia) as Record<string, unknown>;
    expect(out['formats']).toEqual(['a4', 'letter']);
  });
});

describe('stableStringify', () => {
  it('orders keys so equal content yields identical bytes', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });

  it('preserves array order, which is meaningful for ordered relations', () => {
    expect(stableStringify([3, 1, 2])).toBe('[\n  3,\n  1,\n  2\n]\n');
  });

  it('sorts keys of objects nested inside arrays', () => {
    expect(stableStringify([{ b: 1, a: 2 }])).toBe(stableStringify([{ a: 2, b: 1 }]));
  });

  it('ends with a trailing newline so files are POSIX-clean and diff quietly', () => {
    expect(stableStringify({ a: 1 }).endsWith('\n')).toBe(true);
  });
});
