import { describe, it, expect } from 'vitest';
import { buildArticleJsonLd } from './articleJsonLd';
import { SITE_NAME } from '../config/site';

describe('buildArticleJsonLd', () => {
  const url = 'https://beckwithbarrow.com/press/example-article';

  it('sets headline to the article title', () => {
    const result = buildArticleJsonLd({ title: 'A Lovely Home' }, url);
    expect(result.headline).toBe('A Lovely Home');
  });

  it('includes the base fields', () => {
    const result = buildArticleJsonLd({ title: 'A Lovely Home' }, url);
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('Article');
    expect(result.url).toBe(url);
    expect(result.publisher).toEqual({
      '@type': 'Organization',
      name: SITE_NAME,
    });
  });

  it('includes image when a cover url is present', () => {
    const result = buildArticleJsonLd(
      { title: 'A Lovely Home', cover: { url: 'https://cdn.example/img.jpg' } },
      url
    );
    expect(result.image).toBe('https://cdn.example/img.jpg');
  });

  it('omits image when no cover is present', () => {
    const result = buildArticleJsonLd({ title: 'A Lovely Home' }, url);
    expect('image' in result).toBe(false);
  });
});
