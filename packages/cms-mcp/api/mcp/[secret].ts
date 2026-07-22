/**
 * Hosted MCP endpoint.
 *
 * The connector secret is a PATH SEGMENT rather than a query parameter: some clients
 * normalise or drop query strings, and a path survives every hop. It is functionally a
 * bearer token — the same trust model as the Vercel deploy hook this project already
 * uses, which is likewise just a secret URL.
 *
 * Stateless: no session storage, so a serverless cold start cannot lose a session.
 */
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { buildServer } from '../../src/server.js';

export const config = { runtime: 'nodejs' };

/** Constant-time compare, so response timing cannot be used to guess the secret. */
function secretMatches(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export default async function handler(request: Request): Promise<Response> {
  const expected = process.env['MCP_CONNECTOR_SECRET'] ?? '';
  const given = decodeURIComponent(new URL(request.url).pathname.split('/').pop() ?? '');

  // 404, not 401: a prober cannot tell a wrong secret from a nonexistent endpoint.
  if (!expected || !secretMatches(given, expected)) {
    return new Response('Not found', { status: 404 });
  }

  const server = buildServer({
    // No repo on a serverless deployment: describeAll falls back to probing the live API,
    // and mutate() runs without snapshot/audit sinks — the daily backup is the net.
    repoRoot: '/nonexistent',
  });

  // Stateless mode. The SDK types sessionIdGenerator as required, but omitting it is
  // exactly how statelessness is requested; under exactOptionalPropertyTypes an explicit
  // `undefined` is rejected, so the option is left off entirely.
  const transport = new WebStandardStreamableHTTPServerTransport(
    {} as ConstructorParameters<typeof WebStandardStreamableHTTPServerTransport>[0],
  );

  await server.connect(transport);
  return transport.handleRequest(request);
}
