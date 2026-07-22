import { describe, it, expect, vi } from 'vitest';
import { createWriteTransport, documentUrl, type HttpFn } from './transport.js';

const TOKEN = 'tok_SUPERSECRET_abcdef123456';

function okResponse(body: unknown = { data: { documentId: 'd1' } }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('documentUrl', () => {
  it('addresses a single type by its endpoint alone', () => {
    expect(documentUrl('https://api.test', { endpoint: 'connect', kind: 'singleType' })).toBe(
      'https://api.test/api/connect',
    );
  });

  it('addresses a collection document by documentId', () => {
    const url = documentUrl('https://api.test', {
      endpoint: 'projects',
      kind: 'collectionType',
      documentId: 'abc123',
    });
    expect(url).toBe('https://api.test/api/projects/abc123');
  });

  it('refuses to build a collection URL without a documentId', () => {
    expect(() =>
      documentUrl('https://api.test', { endpoint: 'projects', kind: 'collectionType' }),
    ).toThrow(/documentId/i);
  });

  it('trims a trailing slash on the base so URLs never double up', () => {
    expect(documentUrl('https://api.test/', { endpoint: 'connect', kind: 'singleType' })).toBe(
      'https://api.test/api/connect',
    );
  });
});

describe('createWriteTransport — construction', () => {
  it('refuses to exist without a token, rather than silently writing unauthenticated', () => {
    expect(() => createWriteTransport('https://api.test', '', vi.fn())).toThrow(/token/i);
  });

  it('refuses a whitespace-only token', () => {
    expect(() => createWriteTransport('https://api.test', '   ', vi.fn())).toThrow(/token/i);
  });
});

describe('createWriteTransport — requests', () => {
  it('sends the token as a bearer credential', async () => {
    const http = vi.fn(async () => okResponse()) as unknown as HttpFn;
    const t = createWriteTransport('https://api.test', TOKEN, http);
    await t.update({ endpoint: 'connect', kind: 'singleType' }, { data: { email: 'a@b.c' } });

    const init = (http as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`bearer ${TOKEN}`);
  });

  it('uses PUT for an update', async () => {
    const http = vi.fn(async () => okResponse()) as unknown as HttpFn;
    const t = createWriteTransport('https://api.test', TOKEN, http);
    await t.update({ endpoint: 'connect', kind: 'singleType' }, { data: {} });

    const init = (http as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('PUT');
  });

  /**
   * Core Strapi REST has no publish route; publishing rides on update via ?status=published.
   * Verified against @strapi/core@5.31.1 source, see spec open question 1.
   */
  it('publishes by adding ?status=published to the update', async () => {
    const http = vi.fn(async () => okResponse()) as unknown as HttpFn;
    const t = createWriteTransport('https://api.test', TOKEN, http);
    await t.update({ endpoint: 'connect', kind: 'singleType' }, { data: {} }, { publish: true });

    const url = (http as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(url).toBe('https://api.test/api/connect?status=published');
  });

  it('omits the status param when not publishing', async () => {
    const http = vi.fn(async () => okResponse()) as unknown as HttpFn;
    const t = createWriteTransport('https://api.test', TOKEN, http);
    await t.update({ endpoint: 'connect', kind: 'singleType' }, { data: {} });

    const url = (http as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(url).not.toContain('status');
  });

  it('unwraps the data envelope so callers get the document itself', async () => {
    const http = vi.fn(async () =>
      okResponse({ data: { documentId: 'd1', email: 'a@b.c' } }),
    ) as unknown as HttpFn;
    const t = createWriteTransport('https://api.test', TOKEN, http);
    const out = await t.update({ endpoint: 'connect', kind: 'singleType' }, { data: {} });
    expect(out).toMatchObject({ documentId: 'd1', email: 'a@b.c' });
  });
});

describe('createWriteTransport — the token must never leak', () => {
  /**
   * A Vercel token was once printed in plaintext by `pulumi preview` and had to be
   * rotated. An error path is the most likely place for that to happen again, so the
   * redaction is asserted rather than assumed.
   */
  it('does not put the token in the error message on a failed request', async () => {
    const http = vi.fn(async () => new Response('nope', { status: 403 })) as unknown as HttpFn;
    const t = createWriteTransport('https://api.test', TOKEN, http);

    await expect(
      t.update({ endpoint: 'connect', kind: 'singleType' }, { data: {} }),
    ).rejects.toThrow(/403/);

    const error = (await t
      .update({ endpoint: 'connect', kind: 'singleType' }, { data: {} })
      .catch((e: unknown) => e)) as Error;
    expect(error.message).not.toContain(TOKEN);
    expect(error.stack ?? '').not.toContain(TOKEN);
  });

  it('redacts the token if it somehow appears in a response body', async () => {
    const http = vi.fn(
      async () => new Response(`error involving ${TOKEN}`, { status: 500 }),
    ) as unknown as HttpFn;
    const t = createWriteTransport('https://api.test', TOKEN, http);
    const error = (await t
      .update({ endpoint: 'connect', kind: 'singleType' }, { data: {} })
      .catch((e: unknown) => e)) as Error;
    expect(error.message).not.toContain(TOKEN);
    expect(error.message).toContain('[REDACTED]');
  });
});

describe('createWriteTransport — capability surface', () => {
  /**
   * Deletion is not a capability at any layer. This asserts the absence structurally:
   * if someone adds a delete method later, this test fails and they have to justify it.
   */
  it('exposes no delete-shaped operation', () => {
    const t = createWriteTransport('https://api.test', TOKEN, vi.fn() as unknown as HttpFn);
    const names = Object.keys(t);
    expect(names).toEqual(['update']);
    for (const name of names) {
      expect(name.toLowerCase()).not.toContain('delete');
      expect(name.toLowerCase()).not.toContain('destroy');
      expect(name.toLowerCase()).not.toContain('remove');
    }
  });

  it('never issues a DELETE request for any operation it does expose', async () => {
    const http = vi.fn(async () => okResponse()) as unknown as HttpFn;
    const t = createWriteTransport('https://api.test', TOKEN, http);
    await t.update({ endpoint: 'connect', kind: 'singleType' }, { data: {} });

    const calls = (http as unknown as ReturnType<typeof vi.fn>).mock.calls;
    for (const [, init] of calls as [string, RequestInit][]) {
      expect(init.method).not.toBe('DELETE');
    }
  });
});
