/**
 * Build-time sitemap generator.
 *
 * Writes a real static frontend/public/sitemap.xml so Vercel serves valid XML
 * (rather than the SPA index.html via the catch-all rewrite).
 *
 * Static routes are always included. Dynamic press-article and project slugs
 * are fetched from Strapi; if a fetch fails (e.g. offline build) we log a
 * warning and fall back to the static-only sitemap — the build never crashes.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildSitemapXml, type SitemapUrl } from './lib/build-sitemap';

const SITE_ORIGIN = 'https://beckwithbarrow.com';
const API_BASE =
  process.env.VITE_PROD_API_URL ??
  'https://striking-ball-b079f8c4b0.strapiapp.com/api';

const STATIC_PATHS = ['/', '/about', '/approach', '/connect', '/press'];

interface StrapiEntry {
  slug?: string;
  attributes?: { slug?: string };
}

interface StrapiCollectionResponse {
  data?: StrapiEntry[];
  meta?: { pagination?: { pageCount?: number } };
}

const PAGE_SIZE = 100;

/**
 * Fetch every slug from a Strapi collection. Strapi v5 returns flat entries
 * (`entry.slug`); older/v4 shapes nest under `attributes.slug`. Handle both.
 *
 * Follows `meta.pagination.pageCount` so the catalog can grow beyond one page
 * without silently dropping entries. On any failure, warn and return whatever
 * has been collected so far so the build proceeds.
 */
async function fetchSlugs(collection: string): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  let pageCount = 1;

  try {
    do {
      const url =
        `${API_BASE}/${collection}?fields[0]=slug` +
        `&pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(
          `[generate-sitemap] ${collection}: HTTP ${res.status} on page ${page} — ` +
            `returning ${slugs.length} slugs collected so far`
        );
        return slugs;
      }
      const json = (await res.json()) as StrapiCollectionResponse;
      const entries = json.data ?? [];
      for (const entry of entries) {
        const slug = entry.slug ?? entry.attributes?.slug;
        if (typeof slug === 'string' && slug.length > 0) {
          slugs.push(slug);
        }
      }
      pageCount = json.meta?.pagination?.pageCount ?? 1;
      page += 1;
    } while (page <= pageCount);

    return slugs;
  } catch (error) {
    console.warn(
      `[generate-sitemap] Failed to fetch ${collection} (${(error as Error).message}) — ` +
        `returning ${slugs.length} slugs collected so far`
    );
    return slugs;
  }
}

async function main(): Promise<void> {
  const urls: SitemapUrl[] = STATIC_PATHS.map((path) => ({
    loc: `${SITE_ORIGIN}${path}`,
    changefreq: 'weekly',
    priority: path === '/' ? 1.0 : 0.8,
  }));

  const [pressSlugs, projectSlugs] = await Promise.all([
    fetchSlugs('press-articles'),
    fetchSlugs('projects'),
  ]);

  for (const slug of pressSlugs) {
    urls.push({ loc: `${SITE_ORIGIN}/press/${slug}`, changefreq: 'monthly', priority: 0.6 });
  }
  for (const slug of projectSlugs) {
    urls.push({ loc: `${SITE_ORIGIN}/project/${slug}`, changefreq: 'monthly', priority: 0.7 });
  }

  const xml = buildSitemapXml(urls);

  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, '..', 'public', 'sitemap.xml');
  await writeFile(outPath, xml, 'utf8');

  console.log(
    `[generate-sitemap] Wrote ${urls.length} URLs to public/sitemap.xml ` +
      `(${STATIC_PATHS.length} static, ${pressSlugs.length} press, ${projectSlugs.length} projects)`
  );
}

main().catch((error) => {
  // A truly unexpected failure should not silently produce a bad sitemap,
  // but must also not break the deploy — exit 0 with a loud warning.
  console.warn(`[generate-sitemap] Unexpected error, sitemap may be stale: ${(error as Error).message}`);
});
