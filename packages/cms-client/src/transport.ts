import type { MutationTarget } from './mutate.js';

/**
 * The token-gated write transport.
 *
 * This is the only place in the client that holds a credential, and the only place that
 * issues a mutating request. Two properties are enforced here rather than trusted:
 *
 *  - **No deletion.** The returned object exposes exactly one operation, `update`. There
 *    is no delete-shaped method to call, and a test asserts that the surface stays that
 *    way, so adding one later is a deliberate act that fails CI first.
 *  - **The token never leaks.** A Vercel token was once printed in plaintext by
 *    `pulumi preview` and had to be rotated. Error paths are where that happens, so every
 *    message this module produces is scrubbed.
 */

/** Injected so tests need no network (dependencies as arguments, per CLAUDE.md). */
export type HttpFn = (url: string, init: RequestInit) => Promise<Response>;

export interface UpdateOptions {
  /**
   * Publish as part of the write. Core Strapi REST has no publish route; publishing rides
   * on update via `?status=published` — verified against @strapi/core@5.31.1 source.
   */
  readonly publish?: boolean;
}

export interface WriteTransport {
  update: (
    target: MutationTarget,
    payload: { data: Record<string, unknown> },
    options?: UpdateOptions,
  ) => Promise<unknown>;
}

/** Address a single type by endpoint, a collection document by documentId. */
export function documentUrl(baseUrl: string, target: MutationTarget): string {
  const base = baseUrl.replace(/\/+$/, '');

  if (target.kind === 'singleType') return `${base}/api/${target.endpoint}`;

  if (!target.documentId) {
    throw new Error(
      `Refusing to build a URL for collection '${target.endpoint}' without a documentId — ` +
        `resolve it from a read first rather than guessing.`,
    );
  }
  return `${base}/api/${target.endpoint}/${target.documentId}`;
}

/**
 * Build the write transport. Throws if no token is supplied, so an unauthenticated write
 * can never be attempted by accident — failing loudly beats writing as the public role.
 */
export function createWriteTransport(
  baseUrl: string,
  token: string,
  http: HttpFn,
): WriteTransport {
  if (!token || token.trim() === '') {
    throw new Error(
      'Refusing to create a write transport without a token. ' +
        'Set STRAPI_CMS_WRITE_TOKEN in a gitignored env file.',
    );
  }

  /** Strip the credential from anything destined for a log or an error. */
  const redact = (text: string): string => text.split(token).join('[REDACTED]');

  const update = async (
    target: MutationTarget,
    payload: { data: Record<string, unknown> },
    options: UpdateOptions = {},
  ): Promise<unknown> => {
    const url = `${documentUrl(baseUrl, target)}${options.publish ? '?status=published' : ''}`;

    const response = await http(url, {
      method: 'PUT',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        redact(`PUT ${url} -> ${response.status} ${response.statusText}. ${body}`.trim()),
      );
    }

    const json = (await response.json()) as { data?: unknown };
    return json.data ?? json;
  };

  return { update };
}
