import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import {
  mutate,
  summariseType,
  renderSummary,
  parseEnvelope,
  candidatesFromSchemas,
  createMutationDeps,
  createReader,
  readToken,
  DEFAULT_BASE_URL,
  stableStringify,
  type SchemaFile,
  type ContentKind,
  type TypeSummary,
  type MutationTarget,
  type HttpFn,
} from '@beckwithbarrow/cms-client';

/**
 * The tool definitions, shared by both transports.
 *
 * The stdio entry point (index.ts) and the hosted HTTP entry point (api/) both build
 * their server from here, so the two can never drift apart in what they expose or what
 * they permit. There is no delete tool, in either.
 */

const SAMPLE = 5;

export interface ServerOptions {
  readonly repoRoot: string;
  readonly baseUrl?: string;
  /**
   * Content types this server may write to. Undefined means "any".
   * A hosted deployment can narrow the surface without changing the client.
   */
  readonly writableEndpoints?: readonly string[];
  /**
   * Write snapshots and an audit log to disk. Default true (stdio, run from a checkout).
   * False for the hosted deployment, which has no repo — see RuntimeOptions.persist.
   */
  readonly persist?: boolean;
}

const http: HttpFn = (url, init) => fetch(url, init);

/**
 * Candidate endpoints.
 *
 * Read from schema.json when the repo is present (stdio, run from a checkout). A hosted
 * deployment may not ship the api/ directory, so it falls back to asking the live API
 * which endpoints answer — which is more authoritative anyway.
 */
async function loadSchemas(repoRoot: string): Promise<SchemaFile[]> {
  const root = path.join(repoRoot, 'api', 'src', 'api');
  const out: SchemaFile[] = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const api of entries) {
    if (!api.isDirectory()) continue;
    const ctRoot = path.join(root, api.name, 'content-types');
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
        /* unreadable schema is simply not offered */
      }
    }
  }
  return out;
}

/**
 * Endpoints to probe when no schema files are available (hosted deployments).
 * Only a starting list — each is confirmed against the live API before being reported,
 * and one that does not answer is simply absent from the map.
 */
const FALLBACK_CANDIDATES: { endpoint: string; kind: ContentKind }[] = [
  { endpoint: 'about', kind: 'singleType' },
  { endpoint: 'approach', kind: 'singleType' },
  { endpoint: 'connect', kind: 'singleType' },
  { endpoint: 'global', kind: 'singleType' },
  { endpoint: 'home', kind: 'singleType' },
  { endpoint: 'menu', kind: 'singleType' },
  { endpoint: 'press', kind: 'singleType' },
  { endpoint: 'categories', kind: 'collectionType' },
  { endpoint: 'press-articles', kind: 'collectionType' },
  { endpoint: 'projects', kind: 'collectionType' },
];

async function describeAll(options: ServerOptions): Promise<TypeSummary[]> {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const fromSchemas = candidatesFromSchemas(await loadSchemas(options.repoRoot));
  const candidates = fromSchemas.length > 0 ? fromSchemas : FALLBACK_CANDIDATES;

  const summaries: TypeSummary[] = [];
  for (const candidate of candidates) {
    const url =
      candidate.kind === 'singleType'
        ? `${baseUrl}/api/${candidate.endpoint}?populate=*`
        : `${baseUrl}/api/${candidate.endpoint}?populate=*&pagination[pageSize]=${SAMPLE}`;
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const { data, pagination } = parseEnvelope(await response.json());
      const records = (Array.isArray(data) ? data : [data]).filter(
        (r): r is Record<string, unknown> => typeof r === 'object' && r !== null,
      );
      summaries.push(
        summariseType(candidate.endpoint, candidate.kind, records, pagination?.total),
      );
    } catch {
      /* an endpoint the live API does not serve is correctly absent from the map */
    }
  }
  return summaries;
}

function targetFrom(endpoint: string, documentId?: string): MutationTarget {
  return documentId
    ? { endpoint, kind: 'collectionType', documentId }
    : { endpoint, kind: 'singleType' };
}

const text = (body: string) => ({ content: [{ type: 'text' as const, text: body }] });

/** Build a fully-configured MCP server. Both transports call this. */
export function buildServer(options: ServerOptions): McpServer {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const server = new McpServer({ name: 'beckwithbarrow-cms', version: '0.1.0' });

  server.registerTool(
    'cms_describe',
    {
      title: 'Describe the CMS',
      description:
        'A live map of the Beckwith Barrow CMS: every content type, its kind, how many ' +
        'records it holds, and its fields with types and sample values. Read fresh from ' +
        'the API each time, so it is never stale. ALWAYS CALL THIS FIRST — never guess an ' +
        'endpoint or field name.',
      inputSchema: {},
    },
    async () => text(renderSummary(await describeAll(options))),
  );

  server.registerTool(
    'cms_read',
    {
      title: 'Read one document',
      description:
        'Fetch a single document exactly as the API returns it, with relations populated. ' +
        'Use this to see current values before changing anything.',
      inputSchema: {
        endpoint: z.string().describe('e.g. "connect" (single type) or "projects" (collection)'),
        documentId: z
          .string()
          .optional()
          .describe('Required for collections; omit for single types'),
      },
    },
    async ({ endpoint, documentId }) =>
      text(stableStringify(await createReader(baseUrl, http)(targetFrom(endpoint, documentId)))),
  );

  server.registerTool(
    'cms_write',
    {
      title: 'Change ONE field of ONE document',
      description:
        'Change a single field on a single document. There is no batch mode: N changes ' +
        'require N calls, each separately verified. DEFAULTS TO A DRY RUN — pass ' +
        'confirm:true to actually apply it. The write is refused if the field does not ' +
        'exist on the live document, or if anything other than the target field changes. ' +
        'Nothing here can delete content.',
      inputSchema: {
        endpoint: z.string(),
        field: z.string().describe('The one field to change'),
        value: z
          .string()
          .describe('New value. JSON is parsed; anything else is treated as a plain string.'),
        documentId: z.string().optional().describe('Required for collections'),
        isRelationOrder: z
          .boolean()
          .optional()
          .describe('True when value is an ordered array of documentIds (e.g. reordering press)'),
        confirm: z
          .boolean()
          .optional()
          .describe('Omitted or false = dry run, nothing written. true = apply.'),
      },
    },
    async ({ endpoint, field, value, documentId, isRelationOrder, confirm }) => {
      if (options.writableEndpoints && !options.writableEndpoints.includes(endpoint)) {
        return text(
          `Refused: '${endpoint}' is not writable from this server. ` +
            `Writable: ${options.writableEndpoints.join(', ')}`,
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = value;
      }

      const deps = createMutationDeps(readToken(), http, {
        repoRoot: options.repoRoot,
        ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
        ...(options.persist === false ? { persist: false } : {}),
      });

      const result = await mutate(
        {
          target: targetFrom(endpoint, documentId),
          field,
          nextValue: parsed,
          ...(confirm ? {} : { dryRun: true }),
          ...(isRelationOrder ? { verifyAs: 'relation-order' as const } : {}),
        },
        deps,
      );

      return text(
        [
          confirm ? 'APPLIED and verified' : 'DRY RUN — nothing written',
          `target: ${endpoint}${documentId ? `/${documentId}` : ''}.${field}`,
          `before: ${stableStringify(result.before).trim()}`,
          `after:  ${stableStringify(result.after).trim()}`,
          result.noop ? 'note:   value is unchanged (no-op)' : '',
          result.snapshotRef ? `snapshot: ${result.snapshotRef}` : '',
          confirm ? 'The site will rebuild in 2-3 minutes.' : 'Re-run with confirm:true to apply.',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    },
  );

  return server;
}
