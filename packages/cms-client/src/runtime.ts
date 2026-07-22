import { writeFile, mkdir, appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseEnvelope } from './content.js';
import { createWriteTransport, documentUrl, type HttpFn } from './transport.js';
import { stableStringify } from './snapshot.js';
import type { AuditEntry, MutationDeps, MutationTarget } from './mutate.js';

/**
 * Wires the pure pieces to the real world: HTTP, the filesystem, the clock.
 *
 * Everything with a decision in it lives in mutate.ts / transport.ts and is unit-tested
 * against fakes. This module is deliberately thin, because it is the part that is hard
 * to test and easy to get wrong.
 */

export const DEFAULT_BASE_URL = 'https://striking-ball-b079f8c4b0.strapiapp.com';

/**
 * Read the write token.
 *
 * Accepts the clearer STRAPI_CMS_WRITE_TOKEN first, falling back to MCP_API_TOKEN, which
 * is the name it was originally created under. `||` not `??`: an unset CI secret arrives
 * as an empty string, which `??` would happily accept.
 */
export function readToken(env: NodeJS.ProcessEnv = process.env): string {
  const token = env['STRAPI_CMS_WRITE_TOKEN'] || env['MCP_API_TOKEN'] || '';
  if (!token.trim()) {
    throw new Error(
      'No Strapi write token found. Set STRAPI_CMS_WRITE_TOKEN in packages/cms-client/.env ' +
        '(gitignored). The token must NOT have delete permission.',
    );
  }
  return token;
}

/** Read one document at the same depth the write response will come back at. */
export function createReader(baseUrl: string, http: HttpFn) {
  return async (target: MutationTarget): Promise<unknown> => {
    const url = `${documentUrl(baseUrl, target)}?populate=*`;
    const response = await http(url, { method: 'GET' });
    if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
    return parseEnvelope(await response.json()).data;
  };
}

export interface RuntimeOptions {
  readonly baseUrl?: string;
  readonly repoRoot: string;
  readonly publish?: boolean;
  /**
   * Write snapshots and an audit log to disk. Default true.
   *
   * Set false where there is no filesystem to write to — a serverless deployment has no
   * repo, and requiring durable snapshot storage there would be the single most
   * complicated part of hosting this. The daily backup is the safety net in that case.
   *
   * Turning this off does NOT relax any guardrail that constrains a write: one field at
   * a time, never a delete, read-before-write, and verification that nothing else moved
   * all still apply.
   */
  readonly persist?: boolean;
}

/**
 * Assemble the dependencies for `mutate()`.
 *
 * Snapshots and the audit log are written under api/backups/, alongside the content and
 * image backups, so a restore has everything in one place.
 */
export function createMutationDeps(
  token: string,
  http: HttpFn,
  options: RuntimeOptions,
): MutationDeps {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const transport = createWriteTransport(baseUrl, token, http);
  const snapshotDir = path.join(options.repoRoot, 'api', 'backups', 'content-snapshots');
  const auditLog = path.join(options.repoRoot, 'api', 'backups', 'cms-audit.log');

  const persist = options.persist !== false;

  return {
    read: createReader(baseUrl, http),

    write: async (target, payload) =>
      transport.update(target, payload, {
        populate: true,
        ...(options.publish ? { publish: true } : {}),
      }),

    ...(persist
      ? {
          recordSnapshot: async (name: string, contents: string) => {
            await mkdir(snapshotDir, { recursive: true });
            const full = path.join(snapshotDir, name);
            await writeFile(full, contents, 'utf8');
            return path.relative(options.repoRoot, full);
          },

          appendAudit: async (entry: AuditEntry) => {
            await mkdir(path.dirname(auditLog), { recursive: true });
            // One JSON object per line: append-only, greppable, diff-friendly.
            await appendFile(auditLog, `${JSON.stringify(entry)}\n`, 'utf8');
          },
        }
      : {}),

    now: () => new Date().toISOString(),
  };
}

/** Load a snapshot previously written by `recordSnapshot`, for revert. */
export async function loadSnapshot(
  repoRoot: string,
  snapshotRef: string,
): Promise<Record<string, unknown>> {
  const contents = await readFile(path.join(repoRoot, snapshotRef), 'utf8');
  const parsed: unknown = JSON.parse(contents);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Snapshot ${snapshotRef} is not a document object`);
  }
  return parsed as Record<string, unknown>;
}

/** Re-export for CLI convenience. */
export { stableStringify };
