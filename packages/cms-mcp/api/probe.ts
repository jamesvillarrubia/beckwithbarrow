// Classic Node-style Vercel handler, to test which signature this runtime expects.
import type { IncomingMessage, ServerResponse } from 'node:http';
export default function handler(_req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ ok: true, style: 'node', node: process.version }));
}
