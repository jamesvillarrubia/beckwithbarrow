import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const doc = readFileSync(fileURLToPath(new URL('../AI-INSTRUCTIONS.md', import.meta.url)), 'utf8');

describe('AI-INSTRUCTIONS.md', () => {
  it('contains a NEVER-RUN forbidden-operations section', () => {
    expect(doc).toMatch(/NEVER RUN/i);
  });
  it('warns about strapi transfer destroying Cloudinary assets', () => {
    expect(doc).toMatch(/transfer/i);
    expect(doc).toMatch(/Cloudinary/i);
    expect(doc).toMatch(/2026-03-19|201 (Cloudinary )?images/);
  });
  it('does not instruct the reader to run transfer:to-cloud as a suggestion', () => {
    // The phrase "Point to `pnpm transfer" recommended destructive ops; it must be gone.
    expect(doc).not.toMatch(/Point to .{0,10}pnpm transfer/);
  });
});
