#!/usr/bin/env tsx
/**
 * Print a live map of the CMS.
 *
 * READ-ONLY and token-free. This is the anti-memorisation tool: rather than documenting
 * the API somewhere that drifts, ask it. The checked-in schema.json files already
 * disagree with production about draft & publish, which is the whole argument.
 *
 *   pnpm cms:describe            # human-readable
 *   pnpm cms:describe --json     # machine-readable (what an MCP tool would return)
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { candidatesFromSchemas, type SchemaFile, type ContentKind } from '../discover.js';
import { parseEnvelope } from '../content.js';
import { summariseType, renderSummary, type TypeSummary } from '../describe.js';
import { DEFAULT_BASE_URL } from '../runtime.js';

const AS_JSON = process.argv.includes('--json');
const REPO_ROOT = path.resolve(process.cwd(), '../..');
const SCHEMA_ROOT = path.join(REPO_ROOT, 'api', 'src', 'api');
const BASE_URL = process.env['STRAPI_PUBLIC_URL'] || DEFAULT_BASE_URL;

/** Sample size per collection: enough to union fields, small enough to stay quick. */
const SAMPLE = 5;

async function loadSchemas(): Promise<SchemaFile[]> {
  const out: SchemaFile[] = [];
  const apis = await readdir(SCHEMA_ROOT, { withFileTypes: true });

  for (const api of apis) {
    if (!api.isDirectory()) continue;
    const ctRoot = path.join(SCHEMA_ROOT, api.name, 'content-types');
    let types: string[];
    try {
      types = (await readdir(ctRoot, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      continue;
    }
    for (const type of types) {
      try {
        const json = JSON.parse(
          await readFile(path.join(ctRoot, type, 'schema.json'), 'utf8'),
        ) as { kind?: string; info?: { singularName?: string; pluralName?: string } };
        if (json.kind !== 'singleType' && json.kind !== 'collectionType') continue;
        out.push({
          path: `${api.name}/${type}`,
          kind: json.kind as ContentKind,
          singularName: json.info?.singularName ?? '',
          pluralName: json.info?.pluralName ?? '',
        });
      } catch {
        // Unreadable schema: it simply won't be offered as a candidate.
      }
    }
  }
  return out;
}

async function main(): Promise<void> {
  // schema.json supplies only the CANDIDATE list. Everything about shape comes from live
  // responses, because the two demonstrably disagree.
  const candidates = candidatesFromSchemas(await loadSchemas());
  const summaries: TypeSummary[] = [];

  for (const candidate of candidates) {
    const url =
      candidate.kind === 'singleType'
        ? `${BASE_URL}/api/${candidate.endpoint}?populate=*`
        : `${BASE_URL}/api/${candidate.endpoint}?populate=*&pagination[pageSize]=${SAMPLE}`;

    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const { data, pagination } = parseEnvelope(await response.json());
      const records = (Array.isArray(data) ? data : [data]).filter(
        (r): r is Record<string, unknown> => typeof r === 'object' && r !== null,
      );

      summaries.push(summariseType(candidate.endpoint, candidate.kind, records, pagination?.total));
    } catch {
      // An endpoint the live API does not serve is simply absent from the map, which is
      // the correct answer — the map describes what exists, not what the repo believes.
    }
  }

  if (AS_JSON) {
    console.log(JSON.stringify({ source: BASE_URL, types: summaries }, null, 2));
    return;
  }

  console.log(`CMS map — read live from ${BASE_URL}\n`);
  console.log(renderSummary(summaries));
  console.log(
    `${summaries.length} content types. Sampled up to ${SAMPLE} records per collection.\n` +
      `Field types are inferred from live data, not from schema.json.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
