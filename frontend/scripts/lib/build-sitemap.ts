export interface SitemapUrl {
  loc: string;
  changefreq?: string;
  priority?: number;
}

/**
 * Escape a string for safe inclusion in XML text content.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build a sitemap XML document (sitemaps.org 0.9 schema) from a list of URLs.
 * Pure function: no I/O, fully deterministic.
 */
export function buildSitemapXml(urls: SitemapUrl[]): string {
  const entries = urls
    .map(({ loc, changefreq, priority }) => {
      const parts = [`    <loc>${escapeXml(loc)}</loc>`];
      if (changefreq !== undefined) {
        parts.push(`    <changefreq>${escapeXml(changefreq)}</changefreq>`);
      }
      if (priority !== undefined) {
        parts.push(`    <priority>${priority}</priority>`);
      }
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${entries}\n` +
    '</urlset>\n'
  );
}
