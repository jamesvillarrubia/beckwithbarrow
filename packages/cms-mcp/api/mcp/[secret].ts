/**
 * TEMPORARY diagnostic build.
 *
 * Every request has returned 500, including ones with a wrong secret, which means the
 * failure is at module load. Static imports crash before any handler code can report
 * why, so this loads them dynamically inside a try/catch and returns the actual error.
 * Reverted as soon as the cause is known.
 */
export default async function handler(request: Request): Promise<Response> {
  const steps: string[] = [];
  try {
    steps.push('start');
    const sdk = await import(
      '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
    );
    steps.push(`sdk ok: ${Object.keys(sdk).join(',')}`);

    const client = await import('@beckwithbarrow/cms-client');
    steps.push(`client ok: ${Object.keys(client).length} exports`);

    const server = await import('../../src/server');
    steps.push(`server ok: ${Object.keys(server).join(',')}`);

    return new Response(JSON.stringify({ ok: true, steps }, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          steps,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? (error.stack ?? '').split('\n').slice(0, 6) : [],
        },
        null,
        2,
      ),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }
}
