import { describe, it, expect } from 'vitest';
import { truncateForMeta } from './seoText';

describe('truncateForMeta', () => {
  it('returns an empty string for empty / nullish input', () => {
    expect(truncateForMeta('')).toBe('');
    expect(truncateForMeta(undefined)).toBe('');
    expect(truncateForMeta(null)).toBe('');
  });

  it('returns short text unchanged (trimmed)', () => {
    expect(truncateForMeta('  A short description.  ')).toBe('A short description.');
  });

  it('collapses internal whitespace and newlines', () => {
    expect(truncateForMeta('Hello\n\n  world\tagain')).toBe('Hello world again');
  });

  it('strips markdown and html markup', () => {
    expect(
      truncateForMeta('## Heading\n\n**Bold** and _italic_ with a [link](https://x.com) and <em>tag</em>.')
    ).toBe('Heading Bold and italic with a link and tag.');
  });

  it('truncates long text at a word boundary with an ellipsis, staying within max', () => {
    const text =
      'The quick brown fox jumps over the lazy dog while the cat watches from the fence and dreams of tuna and warm sunny afternoons in the meadow beyond the hill.';
    const result = truncateForMeta(text, 40);
    expect(result.length).toBeLessThanOrEqual(40);
    expect(result.endsWith('…')).toBe(true);
    // No partial words: everything before the ellipsis is a whole word from the source
    expect(text.startsWith(result.slice(0, -1).trim())).toBe(true);
  });

  it('does not add an ellipsis when text fits exactly', () => {
    const text = 'Exactly right';
    expect(truncateForMeta(text, 13)).toBe('Exactly right');
    expect(truncateForMeta(text, 13).endsWith('…')).toBe(false);
  });

  it('defaults max to 155', () => {
    const long = 'word '.repeat(60).trim(); // 300 chars
    const result = truncateForMeta(long);
    expect(result.length).toBeLessThanOrEqual(155);
    expect(result.endsWith('…')).toBe(true);
  });
});
