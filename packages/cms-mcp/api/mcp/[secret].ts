/**
 * Hosted MCP endpoint.
 *
 * Node-style (req, res) handler, NOT the Web-standard (Request) => Response form: this
 * runtime accepts the former and hangs on the latter. Verified by deploying both — the
 * Node probe returned immediately, the web probe returned FUNCTION_INVOCATION_TIMEOUT.
 *
 * The connector secret is a PATH SEGMENT rather than a query parameter: some clients
 * normalise or drop query strings, and a path survives every hop. It is functionally a
 * bearer token — the same trust model as the Vercel deploy hook this project already
 * uses, which is likewise just a secret URL.
 *
 * Stateless: no session storage, so a serverless cold start cannot lose a session.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildServer } from '../../src/server';

/** Constant-time compare, so response timing cannot be used to guess the secret. */
function secretMatches(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
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

  const server = buildServer({
    // No repo on a serverless deployment: describeAll falls back to probing the live
    // API, and mutate() runs without snapshot/audit sinks — the daily backup is the net.
    repoRoot: '/nonexistent',
  });

  // Stateless. The SDK types sessionIdGenerator as required, but omitting it is how
  // statelessness is requested; exactOptionalPropertyTypes rejects an explicit undefined.
  const transport = new StreamableHTTPServerTransport(
    {} as ConstructorParameters<typeof StreamableHTTPServerTransport>[0],
  );

  // The SDK's own Transport interface is not written for exactOptionalPropertyTypes,
  // so its optional callbacks do not structurally satisfy it under our stricter config.
  // This is a type-level mismatch in the dependency, not a runtime one.
  await server.connect(transport as unknown as Parameters<typeof server.connect>[0]);
  await transport.handleRequest(req, res, body);
}
