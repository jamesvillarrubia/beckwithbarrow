#!/usr/bin/env tsx
/**
 * READ-ONLY content backup.
 *
 * Dumps every Strapi content type to diffable JSON. Uses only GET requests against
 * the public Content API — no token, no writes, and it can never call transfer,
 * import or deploy. This is the content half of Pillar 2.5's backup precondition;
 * the image half is api/scripts/safe-backup.mjs.
 *
 *   pnpm content:backup [--dry-run] [--out <dir>]
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { candidatesFromSchemas, type SchemaFile, type ContentKind } from '../discover.js';
import { fetchDeep, type Transport } from '../content.js';
import { stripRegenerable, stableStringify } from '../snapshot.js';

const DRY_RUN = process.argv.includes('--dry-run');
const REPO_ROOT = path.resolve(process.cwd(), '../..');
const SCHEMA_ROOT = path.join(REPO_ROOT, 'api', 'src', 'api');
// `||` not `??` on purpose: CI supplies these from secrets, and an unset secret arrives
// as an empty string, which would otherwise be accepted and produce broken URLs.
const BASE_URL =
  process.env['STRAPI_PUBLIC_URL'] || 'https://striking-ball-b079f8c4b0.strapiapp.com';

function outDir(): string {
  const flag = process.argv.indexOf('--out');
  if (flag !== -1 && process.argv[flag + 1]) return path.resolve(process.argv[flag + 1] as string);
  const stamp = process.env['BACKUP_STAMP'] || new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(REPO_ROOT, 'api', 'backups', 'content', stamp);
}

const transport: Transport = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
};

/** Collect schema.json files. These are HINTS — the live API decides what really exists. */
async function loadSchemas(): Promise<SchemaFile[]> {
  const out: SchemaFile[] = [];
  const apis = await readdir(SCHEMA_ROOT, { withFileTypes: true });

  for (const api of apis) {
    if (!api.isDirectory()) continue;
    const ctRoot = path.join(SCHEMA_ROOT, api.name, 'content-types');
    let types: string[];
    try {
      types = (await readdir(ctRoot, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      continue;
    }

    for (const type of types) {
      const file = path.join(ctRoot, type, 'schema.json');
      try {
        const json = JSON.parse(await readFile(file, 'utf8')) as {
          kind?: string;
          info?: { singularName?: string; pluralName?: string };
        };
        if (json.kind !== 'singleType' && json.kind !== 'collectionType') continue;
        out.push({
          path: path.relative(REPO_ROOT, file),
          kind: json.kind as ContentKind,
          singularName: json.info?.singularName ?? '',
          pluralName: json.info?.pluralName ?? '',
        });
      } catch {
        // A schema we cannot read shows up as an absence in the manifest below.
      }
    }
  }
  return out;
}

async function main(): Promise<void> {
  const dir = outDir();
  console.log(`Content backup (READ-ONLY)`);
  console.log(`  source: ${BASE_URL}`);
  console.log(`  target: ${DRY_RUN ? '(dry run — nothing written)' : dir}`);

  const candidates = candidatesFromSchemas(await loadSchemas());
  console.log(`  candidates from schema files: ${candidates.length}`);

  if (!DRY_RUN) await mkdir(dir, { recursive: true });

  const manifest: Record<string, unknown>[] = [];
  let failures = 0;

  for (const candidate of candidates) {
    try {
      const { records, paths, rounds, degraded } = await fetchDeep(BASE_URL, candidate.endpoint, transport);
      const payload = stripRegenerable(candidate.kind === 'singleType' ? records[0] : records);
      const text = stableStringify(payload);

      if (!DRY_RUN) {
        await writeFile(path.join(dir, `${candidate.endpoint}.json`), text, 'utf8');
      }

      const count = candidate.kind === 'singleType' ? 1 : records.length;
      manifest.push({
        endpoint: candidate.endpoint,
        kind: candidate.kind,
        records: count,
        bytes: Buffer.byteLength(text),
        populatePaths: paths,
        populateRounds: rounds,
        degraded,
        ok: true,
      });
      console.log(
        `  ✓ ${candidate.endpoint.padEnd(16)} ${String(count).padStart(3)} rec  ` +
          `${String(Buffer.byteLength(text)).padStart(7)} B  paths=${paths.length}` +
          (degraded ? '  [degraded]' : ''),
      );
    } catch (error) {
      failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      manifest.push({ endpoint: candidate.endpoint, kind: candidate.kind, ok: false, error: message });
      console.log(`  ✗ ${candidate.endpoint.padEnd(16)} ${message}`);
    }
  }

  const summary = {
    takenAt: new Date().toISOString(),
    source: BASE_URL,
    readOnly: true,
    candidates: candidates.length,
    succeeded: candidates.length - failures,
    failed: failures,
    entries: manifest,
  };

  if (!DRY_RUN) {
    await writeFile(path.join(dir, 'manifest.json'), stableStringify(summary), 'utf8');
  }

  console.log(`\n  ${candidates.length - failures}/${candidates.length} endpoints backed up`);

  // A partial backup must not look like a success — it is the revert point.
  if (failures > 0) {
    console.error(`  ${failures} endpoint(s) failed — backup is INCOMPLETE`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
