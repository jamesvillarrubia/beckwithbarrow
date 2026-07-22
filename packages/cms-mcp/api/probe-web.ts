// Web-standard handler, the style the MCP transport needs.
export default function handler(_request: Request): Response {
  return new Response(JSON.stringify({ ok: true, style: 'web' }), {
    headers: { 'content-type': 'application/json' },
  });
}
