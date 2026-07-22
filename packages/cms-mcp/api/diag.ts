import type { IncomingMessage, ServerResponse } from 'node:http';
export default async function handler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const steps: string[] = [];
  const send = (o: unknown) => { res.setHeader('content-type','application/json'); res.end(JSON.stringify(o,null,2)); };
  try {
    const sdk = await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
    steps.push(`sdk: ${Object.keys(sdk).join(',')}`);
    const client = await import('@beckwithbarrow/cms-client');
    steps.push(`client: ${Object.keys(client).length} exports`);
    const server = await import('../src/server');
    steps.push(`server: ${Object.keys(server).join(',')}`);
    send({ ok: true, steps });
  } catch (e) {
    send({ ok:false, steps, error: e instanceof Error ? e.message : String(e),
           stack: e instanceof Error ? (e.stack??'').split('\n').slice(0,5) : [] });
  }
}
