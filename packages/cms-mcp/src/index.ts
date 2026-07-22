#!/usr/bin/env tsx
/**
 * Layer B — the MCP server.
 *
 * Deliberately thin. Every guardrail lives in @beckwithbarrow/cms-client, so this file
 * only re-exposes functions that already carry them. It holds no token logic of its own
 * and cannot bypass anything: an MCP caller and a CLI caller run identical code.
 *
 * There is no delete tool. Deletion is not a capability at any layer of this system.
 *
 * Transport is stdio: the process is spawned by the MCP client, talks over stdin/stdout,
 * and dies with the session. It is not a network service, and the token never leaves
 * this machine.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

// Resolve the repo root from this file's location, so the server works regardless of
// the cwd the MCP client happens to spawn it from.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const BASE_URL = process.env['STRAPI_PUBLIC_URL'] || DEFAULT_BASE_URL;
const SAMPLE = 5;

const http: HttpFn = (url, init) => fetch(url, init);

/**
 * Load the token from packages/cms-client/.env.
 *
 * The MCP client spawns this process without a shell, so nothing else sources that file.
 * Read from disk at startup rather than expecting the environment to carry it — and note
 * the value is never logged: stdout is the JSON-RPC channel, and anything written there
 * that is not a protocol message corrupts the session anyway.
 */
async function loadTokenEnv(): Promise<void> {
  const envPath = path.join(REPO_ROOT, 'packages', 'cms-client', '.env');
  try {
    const text = await readFile(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      const name = key?.trim();
      if (name && !process.env[name]) {
        process.env[name] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {
    // Absent .env is fine: the read-only tools work without a token, and cms_write
    // reports a clear error rather than writing unauthenticated.
  }
}

/** Candidate endpoints from schema files. Hints only — live data decides the shape. */
async function loadSchemas(): Promise<SchemaFile[]> {
  const root = path.join(REPO_ROOT, 'api', 'src', 'api');
  const out: SchemaFile[] = [];
  for (const api of await readdir(root, { withFileTypes: true })) {
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

async function describeAll(): Promise<TypeSummary[]> {
  const summaries: TypeSummary[] = [];
  for (const candidate of candidatesFromSchemas(await loadSchemas())) {
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
      summaries.push(
        summariseType(candidate.endpoint, candidate.kind, records, pagination?.total),
      );
    } catch {
      /* absent from the map is the right answer for an endpoint that is not served */
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

const server = new McpServer({ name: 'beckwithbarrow-cms', version: '0.1.0' });

server.registerTool(
  'cms_describe',
  {
    title: 'Describe the CMS',
    description:
      'A live map of the CMS: every content type, its kind, record count, and fields with ' +
      'their types and sample values. Read fresh from the API, so it never goes stale. ' +
      'CALL THIS FIRST — never guess an endpoint or field name.',
    inputSchema: {},
  },
  async () => text(renderSummary(await describeAll())),
);

server.registerTool(
  'cms_read',
  {
    title: 'Read one document',
    description:
      'Fetch a single document exactly as the API returns it, with relations populated. ' +
      'Use this to see current values before proposing a change.',
    inputSchema: {
      endpoint: z.string().describe('e.g. "connect" (single type) or "projects" (collection)'),
      documentId: z.string().optional().describe('Required for collections; omit for single types'),
    },
  },
  async ({ endpoint, documentId }) => {
    const doc = await createReader(BASE_URL, http)(targetFrom(endpoint, documentId));
    return text(stableStringify(doc));
  },
);

server.registerTool(
  'cms_write',
  {
    title: 'Change ONE field of ONE document',
    description:
      'Apply a single field change. There is no batch mode: N changes require N calls, ' +
      'each separately verified. Defaults to a dry run — pass confirm:true to apply. ' +
      'The write is rejected if the field is absent from the live document, or if ' +
      'anything other than the target field changes.',
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
        .describe('false/omitted = dry run (nothing written). true = apply.'),
    },
  },
  async ({ endpoint, field, value, documentId, isRelationOrder, confirm }) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }

    const deps = createMutationDeps(readToken(), http, { repoRoot: REPO_ROOT });
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

    const lines = [
      confirm ? 'APPLIED and verified' : 'DRY RUN — nothing written',
      `target: ${endpoint}${documentId ? `/${documentId}` : ''}.${field}`,
      `before: ${stableStringify(result.before).trim()}`,
      `after:  ${stableStringify(result.after).trim()}`,
      result.noop ? 'note:   value is unchanged (no-op)' : '',
      result.snapshotRef ? `snapshot: ${result.snapshotRef}` : '',
      confirm ? '' : 'Re-run with confirm:true to apply.',
    ].filter(Boolean);

    return text(lines.join('\n'));
  },
);

await loadTokenEnv();
await server.connect(new StdioServerTransport());
