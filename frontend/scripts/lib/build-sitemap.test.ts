import { describe, it, expect } from 'vitest';
import { buildSitemapXml } from './build-sitemap';

describe('buildSitemapXml', () => {
  it('starts with the XML declaration and urlset namespace', () => {
    const xml = buildSitemapXml([{ loc: 'https://beckwithbarrow.com/' }]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    );
    expect(xml).toContain('</urlset>');
  });

  it('emits one <loc> per url', () => {
    const xml = buildSitemapXml([
      { loc: 'https://beckwithbarrow.com/' },
      { loc: 'https://beckwithbarrow.com/about' },
      { loc: 'https://beckwithbarrow.com/press' },
    ]);
    const count = (xml.match(/<loc>/g) ?? []).length;
    expect(count).toBe(3);
    expect(xml).toContain('<loc>https://beckwithbarrow.com/about</loc>');
  });

  it('includes optional changefreq and priority when provided', () => {
    const xml = buildSitemapXml([
      { loc: 'https://beckwithbarrow.com/', changefreq: 'weekly', priority: 1.0 },
    ]);
    expect(xml).toContain('<changefreq>weekly</changefreq>');
    expect(xml).toContain('<priority>1</priority>');
  });

  it('XML-escapes special characters in loc', () => {
    const xml = buildSitemapXml([
      { loc: 'https://beckwithbarrow.com/project/a&b<c>"d\'' },
    ]);
    expect(xml).toContain(
      '<loc>https://beckwithbarrow.com/project/a&amp;b&lt;c&gt;&quot;d&apos;</loc>'
    );
    expect(xml).not.toContain('a&b');
  });
});
