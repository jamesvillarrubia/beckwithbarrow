/**
 * generate-static-data.ts
 *
 * Build-time script that pre-fetches all Strapi page data and writes it to
 * src/generated/static-data.json. App.tsx seeds the React Query cache with
 * this file at startup so first-time visitors never hit a cold Strapi backend.
 *
 * Run: pnpm run generate-static
 * Keys must exactly match the queryKey arrays used in useQuery() calls.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '../src/generated/static-data.json');

const API_BASE_URL =
  process.env.VITE_PROD_API_URL ??
  'https://striking-ball-b079f8c4b0.strapiapp.com/api';

/**
 * Build a Strapi v5 populate query string from a shorthand like
 * "leftImage,rightImage,projects.cover" → populate[leftImage]=true&...
 */
function buildPopulate(populate: string): string {
  if (populate === '*') return 'populate=*';
  const params = new URLSearchParams();
  for (const field of populate.split(',')) {
    const trimmed = field.trim();
    if (trimmed.includes('.')) {
      const [parent, child] = trimmed.split('.');
      params.append(`populate[${parent}][populate][${child}]`, 'true');
    } else {
      params.append(`populate[${trimmed}]`, 'true');
    }
  }
  return params.toString();
}

async function fetchStrapi(endpoint: string, populate = '', retries = 3): Promise<unknown> {
  const qs = populate ? `?${buildPopulate(populate)}` : '';
  const url = `${API_BASE_URL}/${endpoint}${qs}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);

    const text = await res.text();
    if (!text) {
      if (attempt < retries) {
        const delay = attempt * 1000;
        process.stdout.write(` (cold start, retrying in ${delay}ms...)`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw new Error(`Empty response after ${retries} attempts — ${url}`);
    }
    return JSON.parse(text);
  }

  throw new Error(`Failed after ${retries} retries — ${url}`);
}

interface StaticDataEntry {
  queryKey: unknown[];
  data: unknown;
}

const ENDPOINTS: StaticDataEntry[] = [
  { queryKey: ['global-settings'], data: null },
  { queryKey: ['menu'], data: null },
  { queryKey: ['home'], data: null },
  { queryKey: ['about'], data: null },
  { queryKey: ['approach'], data: null },
  { queryKey: ['connect'], data: null },
  { queryKey: ['press-page'], data: null },
  { queryKey: ['projects', { limit: undefined, featured: undefined }], data: null },
];

const FETCH_CONFIG: Record<string, { endpoint: string; populate?: string }> = {
  'global-settings': { endpoint: 'global' },
  menu:              { endpoint: 'menu', populate: 'menuItem' },
  home:              { endpoint: 'home', populate: 'leftImage,rightImage,quote,projects.cover' },
  about:             { endpoint: 'about', populate: '*' },
  approach:          { endpoint: 'approach', populate: 'coverImage,servicesList,stages.image' },
  connect:           { endpoint: 'connect' },
  'press-page':      { endpoint: 'press', populate: 'pressArticles.cover' },
  projects:          { endpoint: 'projects', populate: 'images,cover,categories' },
};

async function main() {
  console.log(`\n📡 Fetching static data from ${API_BASE_URL}\n`);

  const result: Record<string, unknown> = {};
  let failures = 0;

  for (const entry of ENDPOINTS) {
    const keyName = entry.queryKey[0] as string;
    const config = FETCH_CONFIG[keyName];
    if (!config) continue;

    const label = entry.queryKey.length > 1
      ? `${keyName} ${JSON.stringify(entry.queryKey[1])}`
      : keyName;

    try {
      const data = await fetchStrapi(config.endpoint, config.populate);
      result[JSON.stringify(entry.queryKey)] = data;
      console.log(`  ✅  ${label}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠️   ${label} — skipped (${message})`);
      failures++;
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

  console.log(`\n✨ Static data written to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  console.log(`   ${Object.keys(result).length} entries, ${failures} skipped\n`);

  // A total Strapi outage must NOT block a deploy. The snapshot is a
  // performance optimisation, not a correctness requirement: an empty
  // static-data.json simply means the React Query cache starts cold and every
  // page fetches at runtime, exactly as it did before this script existed.
  // Failing the build here would let a CMS outage take down the ability to
  // ship unrelated frontend fixes.
  if (failures === ENDPOINTS.length) {
    console.warn(
      '\n⚠️  All Strapi fetches failed — writing an empty snapshot and continuing.\n' +
        '   The site will fetch content at runtime instead of being seeded.\n' +
        '   If this was not expected, check that Strapi is reachable before relying on the deploy.'
    );
  }
}

main().catch((err) => {
  console.error('Fatal error in generate-static-data:', err);
  process.exit(1);
});
