/**
 * Guarantees `src/generated/static-data.json` exists.
 *
 * `App.tsx` statically imports that file, but it is gitignored and produced at
 * build time by `generate-static-data.ts` (which needs the live Strapi API).
 * Without this, a fresh clone cannot run `tsc -b`, `vitest`, or `vite dev`
 * until someone runs a network-dependent build first.
 *
 * Writing an empty object is safe: App.tsx only ever does
 * `Object.entries(staticData)` to seed the React Query cache, so `{}` simply
 * means "no seed", and every page falls back to fetching normally.
 *
 * A real build overwrites this immediately. Never clobber existing data.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', 'src', 'generated', 'static-data.json');

if (existsSync(target)) {
  process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, '{}\n');
console.log(`[ensure-static-data] created empty placeholder at ${target}`);
