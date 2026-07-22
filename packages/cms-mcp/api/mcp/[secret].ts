/**
 * Hosted MCP endpoint — bundled entry point.
 *
 * Committed as TypeScript SOURCE — Vercel compiles it and resolves the workspace
 * normally. That works now that the stray frontend/ and api/ pnpm-workspace.yaml files
 * are gone: they made pnpm treat those directories as separate workspace roots, which
 * broke lockfile resolution and, with it, workspace linking.
 *
 * Nothing generated is committed here. A build artifact in git can be merged stale,
 * which is a defect waiting to happen.
 *
 * Node-style (req, res) handler: this runtime accepts that form and hangs on the
 * Web-standard (Request) => Response form (verified by deploying both).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildServer } from '../../src/server';

/** Constant-time compare, so response timing cannot be used to guess the secret. */
function secretMatches(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** Read the JSON body; the runtime may or may not have parsed it already. */
async function readBody(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  if (req.body !== undefined) return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return undefined;
  }
}

export default async function handler(
  req: IncomingMessage & { body?: unknown; url?: string },
  res: ServerResponse,
): Promise<void> {
  try {
    const expected = process.env['MCP_CONNECTOR_SECRET'] ?? '';
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    const given = decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '');

    // 404, not 401: a prober cannot tell a wrong secret from a nonexistent endpoint.
    if (!expected || !secretMatches(given, expected)) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const body = await readBody(req);
    // No filesystem on a serverless deployment: describeAll falls back to probing the
    // live API, and persist:false omits the snapshot/audit sinks entirely rather than
    // trying to mkdir a path that does not exist.
    const server = buildServer({ repoRoot: '/', persist: false });
    const transport = new StreamableHTTPServerTransport(
      {} as ConstructorParameters<typeof StreamableHTTPServerTransport>[0],
    );
    await server.connect(transport as unknown as Parameters<typeof server.connect>[0]);
    await transport.handleRequest(req, res, body);
  } catch (error) {
    // Never let an unhandled throw become an opaque platform 500.
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
    }
    res.end(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
    );
  }
}
