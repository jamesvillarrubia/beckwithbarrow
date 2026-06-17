import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const FORBIDDEN_SCRIPT_NAMES = [
  'transfer:to-cloud', 'transfer:to-cloud:full', 'transfer:to-cloud:content',
  'transfer:to-cloud:files', 'transfer:to-cloud:force',
  'transfer:from-cloud', 'transfer:from-cloud:full', 'transfer:from-cloud:content',
  'transfer:from-cloud:files', 'transfer:from-cloud:force',
  'deploy:cloud', 'deploy:cloud:full',
  'delete:cloud-media', 'delete:cloud-media:dry-run', 'delete:cloud-media:force', 'delete:cloud-media:help',
];

describe('package.json safety', () => {
  it('exposes no direct destructive transfer/deploy/delete scripts', () => {
    const present = FORBIDDEN_SCRIPT_NAMES.filter((n) => n in (pkg.scripts ?? {}));
    expect(present).toEqual([]);
  });

  it('routes restore through the guard, not a bare strapi import', () => {
    expect(pkg.scripts.restore ?? '').toContain('guard-forbidden.mjs');
  });
});
