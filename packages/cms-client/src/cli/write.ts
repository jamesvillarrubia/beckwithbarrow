#!/usr/bin/env tsx
/**
 * Apply ONE field change to ONE document.
 *
 * There is no batch mode and there never will be — see spec §0.2. If you need N changes,
 * run this N times, so each gets its own snapshot and its own audit line.
 *
 *   pnpm cms:write --endpoint connect --field email --value "x@y.z" [--dry-run]
 *   pnpm cms:write --endpoint connect --field email --noop        [--dry-run]
 *   pnpm cms:write --endpoint projects --document <id> --field title --value "..."
 *
 * --noop writes the CURRENT value back unchanged. That is the designated first live
 * validation (spec §0.5): it exercises snapshot -> write -> verify -> audit end to end
 * with nothing visible at stake.
 *
 * Deletion is not available from this CLI, or from anything it calls.
 */
import path from 'node:path';

import { readFile } from 'node:fs/promises';
import { mutate, type MutationPlan, type MutationTarget } from '../mutate.js';
import { createMutationDeps, createReader, readToken, DEFAULT_BASE_URL } from '../runtime.js';
import { stableStringify } from '../snapshot.js';



const REPO_ROOT = path.resolve(process.cwd(), '../..');

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

/** Load packages/cms-client/.env without adding a dependency. */
async function loadDotEnv(): Promise<void> {
  try {
    const text = await readFile(path.join(process.cwd(), '.env'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      const name = key?.trim();
      if (name && !process.env[name]) {
        process.env[name] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {
    // No .env is fine if the token is already in the environment.
  }
}

async function main(): Promise<void> {
  await loadDotEnv();

  const endpoint = flag('endpoint');
  const field = flag('field');
  const documentId = flag('document');
  const dryRun = has('dry-run');
  const noop = has('noop');
  // Ordered relations verify by documentId order; scalars verify by value.
  const relation = has('relation');

  if (!endpoint || !field) {
    console.error('Usage: cms:write --endpoint <name> --field <name> (--value <v> | --noop)');
    process.exit(2);
  }

  const target: MutationTarget = documentId
    ? { endpoint, kind: 'collectionType', documentId }
    : { endpoint, kind: 'singleType' };

  const token = readToken();
  const http = ((url: string, init: RequestInit) => fetch(url, init)) as typeof fetch;
  const deps = createMutationDeps(token, http, {
    repoRoot: REPO_ROOT,
    ...(has('publish') ? { publish: true } : {}),
  });

  // Resolve the value. --noop reads the live document and writes the same value back,
  // which is only meaningful because we never assume the shape (spec §0.6).
  let nextValue: unknown;
  if (noop) {
    const current = (await createReader(DEFAULT_BASE_URL, http)(target)) as Record<string, unknown>;
    if (!(field in current)) {
      console.error(`Field '${field}' is not present on ${endpoint}.`);
      console.error(`Present fields: ${Object.keys(current).sort().join(', ')}`);
      process.exit(1);
    }
    // For a relation the current value is a list of documents, but the write takes a
    // list of ids — so a no-op means "the same ids in the same order".
    if (relation) {
      const items = current[field];
      if (!Array.isArray(items)) {
        console.error(`Field '${field}' is not a list — did you mean to omit --relation?`);
        process.exit(1);
      }
      nextValue = items.map((item) => (item as Record<string, unknown>)['documentId']);
    } else {
      nextValue = current[field];
    }
  } else {
    const raw = flag('value');
    if (raw === undefined) {
      console.error('Provide --value, or --noop to rewrite the current value unchanged.');
      process.exit(2);
    }
    // Accept JSON for structured fields (relations, arrays); fall back to a plain string.
    try {
      nextValue = JSON.parse(raw);
    } catch {
      nextValue = raw;
    }
  }

  const plan: MutationPlan = {
    target,
    field,
    nextValue,
    ...(dryRun ? { dryRun: true } : {}),
    ...(relation ? { verifyAs: 'relation-order' as const } : {}),
  };

  console.log(`${dryRun ? 'DRY RUN' : 'LIVE WRITE'} — one field, one document`);
  console.log(`  target: ${endpoint}${documentId ? `/${documentId}` : ''}.${field}`);
  if (noop) console.log('  mode:   no-op (writing the current value back unchanged)');

  const result = await mutate(plan, deps);

  console.log(`  before: ${stableStringify(result.before).trim().slice(0, 300)}`);
  console.log(`  after:  ${stableStringify(result.after).trim().slice(0, 300)}`);
  console.log(`  snapshot: ${result.snapshotRef}`);

  if (result.applied) {
    console.log(`\n  ✓ applied${result.noop ? ' (no-op — value unchanged)' : ''} and verified`);
    console.log(`    revert with: pnpm cms:revert --snapshot ${result.snapshotRef}`);
  } else {
    console.log('\n  nothing written (dry run)');
  }
}

main().catch((error: unknown) => {
  console.error(`\n  ✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
