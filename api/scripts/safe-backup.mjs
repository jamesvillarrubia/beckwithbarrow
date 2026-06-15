#!/usr/bin/env node
// Confirmed endpoint: GET /api/upload/files requires a token with Upload: find scope.
// This script is READ-ONLY: it uses only GET requests against Strapi and Cloudinary.
// It never calls strapi transfer, strapi import, or any Cloudinary delete/destroy API.
import { writeFile, mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { buildManifest, buildUploadPlan, buildFullRestorePlan } from './lib/build-manifest.mjs';

const DRY = process.argv.includes('--dry-run');
const STAMP = process.env.BACKUP_STAMP || new Date().toISOString().replace(/[:.]/g, '-');
const ROOT = path.resolve('backups');                 // api/backups
const OUT = path.join(ROOT, STAMP);
const ASSETS = path.join(ROOT, 'assets');             // shared, content-addressed by public_id

// --- Read-only config (tokens from env; NEVER written to disk) ---
const STRAPI_URL = process.env.STRAPI_CLOUD_BASE_URL;
const STRAPI_TOKEN = process.env.STRAPI_CLOUD_API_TOKEN;
const CLOUD = {
  name: process.env.CLOUDINARY_NAME,
  key: process.env.CLOUDINARY_KEY,
  secret: process.env.CLOUDINARY_SECRET,
};

// Cloudinary creds are REQUIRED (the binaries are the irreplaceable data).
// Strapi creds are OPTIONAL: with them we enrich the public_id->record mapping;
// without them we still back up every binary (Cloudinary-only mode).
function requireEnv() {
  const missing = [
    ['CLOUDINARY_NAME', CLOUD.name], ['CLOUDINARY_KEY', CLOUD.key], ['CLOUDINARY_SECRET', CLOUD.secret],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { console.error(`Missing required env: ${missing.join(', ')}`); process.exit(1); }
}

const HAS_STRAPI = Boolean(STRAPI_URL && STRAPI_TOKEN);

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

// 1. Strapi content (GET only). upload/files lists every media record with provider_metadata.
async function fetchStrapiFiles() {
  const all = [];
  let page = 1;
  for (;;) {
    const data = await getJson(
      `${STRAPI_URL}/api/upload/files?pagination[page]=${page}&pagination[pageSize]=100`,
      { Authorization: `Bearer ${STRAPI_TOKEN}` },
    );
    const items = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
    all.push(...items);
    if (items.length < 100) break;
    page += 1;
  }
  return all;
}

// 2. Cloudinary resources (GET only, basic auth). Covers ALL asset classes
// (image, raw=PDFs/docs, video) so no asset type is silently excluded from the backup.
const CLOUDINARY_RESOURCE_TYPES = ['image', 'raw', 'video'];

async function fetchCloudinaryResources() {
  const auth = Buffer.from(`${CLOUD.key}:${CLOUD.secret}`).toString('base64');
  const out = [];
  for (const type of CLOUDINARY_RESOURCE_TYPES) {
    let next;
    do {
      const u = new URL(`https://api.cloudinary.com/v1_1/${CLOUD.name}/resources/${type}`);
      u.searchParams.set('max_results', '500');
      if (next) u.searchParams.set('next_cursor', next);
      const data = await getJson(u.toString(), { Authorization: `Basic ${auth}` });
      out.push(...(data.resources ?? []));
      next = data.next_cursor;
    } while (next);
  }
  return out;
}

async function downloadBinary(resource) {
  const ext = resource.format ? `.${resource.format}` : '';
  const dest = path.join(ASSETS, `${resource.public_id}${ext}`);
  await mkdir(path.dirname(dest), { recursive: true });
  const res = await fetch(resource.secure_url);
  if (!res.ok) throw new Error(`download ${resource.public_id} -> ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
  return dest;
}

async function main() {
  requireEnv();
  console.log(`Backup ${STAMP}${DRY ? ' (dry-run)' : ''}`);

  if (!HAS_STRAPI) {
    console.log('No Strapi token — running CLOUDINARY-ONLY backup (no record mapping; every asset still restorable).');
  }
  const [files, resources] = await Promise.all([
    HAS_STRAPI ? fetchStrapiFiles() : Promise.resolve([]),
    fetchCloudinaryResources(),
  ]);
  console.log(`Strapi files: ${files.length}, Cloudinary assets: ${resources.length}`);

  const manifest = buildManifest(resources, files);
  // local_path must be repo-root-relative so restore-cloudinary.py (run from repo root) finds binaries.
  // With Strapi data, split referenced/orphan; without it, make every asset restorable.
  const plan = HAS_STRAPI
    ? buildUploadPlan(resources, files, 'api/backups/assets')
    : buildFullRestorePlan(resources, 'api/backups/assets');
  const orphans = manifest.filter((m) => !m.referenced).length;
  console.log(`Referenced: ${manifest.length - orphans}, Orphans: ${orphans}, Restorable in plan: ${plan.matched.length}, Unmatched: ${plan.unmatched.length}`);

  if (DRY) { console.log('Dry run — no files written, no binaries downloaded.'); return; }

  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'strapi-files.json'), JSON.stringify(files, null, 2));
  await writeFile(path.join(OUT, 'cloudinary-manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(ROOT, 'cloudinary-upload-plan.json'), JSON.stringify(plan, null, 2));

  let ok = 0;
  for (const r of resources) {
    try { await downloadBinary(r); ok += 1; }
    catch (e) { console.error(`  download failed ${r.public_id}: ${e.message}`); }
  }
  console.log(`Binaries downloaded: ${ok}/${resources.length} -> ${ASSETS}`);
  console.log(`Done. Review 'git status' then commit the backup.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
