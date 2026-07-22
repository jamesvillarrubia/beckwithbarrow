/**
 * Hosted MCP endpoint — bundled entry point.
 *
 * This file and everything it imports are bundled by tsup into a single self-contained
 * api/mcp/[secret].js, which IS committed.
 *
 * Committing a build artifact is normally a smell, because it can be merged stale. That
 * is closed by CI: .github/workflows/ci.yml rebuilds the bundle and fails if the result
 * differs from what is committed, so a stale bundle cannot reach main.
 *
 * The alternative — committing TypeScript source and letting Vercel compile it — was
 * tried and does not work: Vercel will not resolve the @beckwithbarrow/cms-client
 * workspace import inside a serverless function, and every invocation 500s before the
 * handler runs. Bundling removes the resolution step entirely.
 *
 * Node-style (req, res) handler: this runtime accepts that form and hangs on the
 * Web-standard (Request) => Response form (verified by deploying both).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildServer } from '../server.js';

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
