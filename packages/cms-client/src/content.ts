import { z } from 'zod';
import { relationFieldsOf, buildPopulateQuery, isMediaDocument } from './relations.js';

/**
 * Read layer for the Strapi Content REST API.
 *
 * The transport is passed in as a function argument rather than injected, per
 * CLAUDE.md (no DI container). Tests supply a fake; production supplies fetch.
 */
export type Transport = (url: string) => Promise<unknown>;

/** Guard against a bad pageCount turning a backup into an unbounded loop. */
const MAX_PAGES = 200;

/**
 * The envelope is the one shape we do assert, because it is the API contract itself
 * rather than content. Everything inside `data` stays deliberately opaque (unknown) —
 * that is the part spec §0.6 forbids us to assume anything about.
 */
const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  pageCount: z.number(),
  total: z.number(),
});

const envelopeSchema = z.object({
  data: z.unknown(),
  meta: z.object({ pagination: paginationSchema.optional() }).optional(),
});

export interface Envelope {
  readonly data: unknown;
  readonly pagination?: z.infer<typeof paginationSchema>;
}

/**
 * Validate the response envelope.
 *
 * Throws on anything unexpected. A backup that silently swallowed a malformed
 * response would be worse than no backup, because it would look like it succeeded.
 */
export function parseEnvelope(json: unknown): Envelope {
  const parsed = envelopeSchema.safeParse(json);
  if (!parsed.success || parsed.data.data === undefined || parsed.data.data === null) {
    throw new Error(
      `Unexpected Strapi envelope: expected { data, meta? }, got ${JSON.stringify(json)?.slice(0, 200)}`,
    );
  }
  const pagination = parsed.data.meta?.pagination;
  return pagination === undefined ? { data: parsed.data.data } : { data: parsed.data.data, pagination };
}

/**
 * Work out which populate paths this content needs, from what the API actually
 * returned. Descends through already-populated relations so each round of fetching
 * can reach one level deeper than the last.
 */
export function discoverPopulatePaths(data: unknown, prefix = ''): string[] {
  const records = Array.isArray(data) ? data : [data];
  const paths = new Set<string>();

  for (const record of records) {
    for (const field of relationFieldsOf(record)) {
      const path = prefix ? `${prefix}.${field}` : field;
      paths.add(path);

      const value = (record as Record<string, unknown>)[field];

      // Media is a leaf — see isMediaDocument. Descending would discover `related`,
      // which Strapi cannot populate and answers with a 500.
      const children = Array.isArray(value) ? value : [value];
      if (children.some(isMediaDocument)) continue;

      for (const deeper of discoverPopulatePaths(value, path)) paths.add(deeper);
    }
  }

  return [...paths].sort();
}

/** How many rounds of shape-derived deepening to attempt before settling. */
const MAX_POPULATE_ROUNDS = 4;

export interface DeepFetch {
  readonly records: unknown[];
  readonly paths: string[];
  readonly rounds: number;
  /** True when a deepened query failed and we kept a shallower, successful result. */
  readonly degraded: boolean;
}

/**
 * Fetch an endpoint, deepening the populate query from what actually came back until
 * discovery stops revealing new relations (spec §0.6 — shape is discovered, not assumed).
 *
 * If a deepened query fails, we keep the last depth that succeeded and flag the result
 * as degraded rather than losing the endpoint. An endpoint missing from a backup is
 * strictly worse than one backed up slightly shallower: the backup is a revert point,
 * and a hole in it is exactly what must not happen. The first fetch has no fallback,
 * so its failure propagates.
 */
export async function fetchDeep(
  baseUrl: string,
  endpoint: string,
  transport: Transport,
): Promise<DeepFetch> {
  let paths: string[] = [];
  let records = await fetchAllPages(baseUrl, endpoint, buildPopulateQuery(paths), transport);
  let rounds = 1;

  for (; rounds < MAX_POPULATE_ROUNDS; rounds += 1) {
    const discovered = discoverPopulatePaths(records);
    const unchanged =
      discovered.length === paths.length && discovered.every((p, i) => p === paths[i]);
    if (unchanged) break;

    try {
      records = await fetchAllPages(baseUrl, endpoint, buildPopulateQuery(discovered), transport);
      paths = discovered;
    } catch {
      return { records, paths, rounds, degraded: true };
    }
  }

  return { records, paths, rounds, degraded: false };
}

/** Fetch every page of a collection endpoint, preserving order. */
export async function fetchAllPages(
  baseUrl: string,
  endpoint: string,
  populateQuery: string,
  transport: Transport,
): Promise<unknown[]> {
  const records: unknown[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    if (page > MAX_PAGES) {
      throw new Error(
        `Exceeded page budget of ${MAX_PAGES} on /${endpoint} — refusing to loop further`,
      );
    }

    const url = `${baseUrl}/api/${endpoint}?${populateQuery}&pagination[page]=${page}&pagination[pageSize]=100`;
    const { data, pagination } = parseEnvelope(await transport(url));

    if (Array.isArray(data)) records.push(...data);
    else records.push(data);

    pageCount = pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);

  return records;
}
