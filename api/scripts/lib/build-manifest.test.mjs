import { describe, it, expect } from 'vitest';
import { buildManifest, buildUploadPlan } from './build-manifest.mjs';

const cloudinaryResources = [
  { public_id: 'projects/hillside_a', secure_url: 'https://res.cloudinary.com/x/hillside_a.jpg', bytes: 1000, format: 'jpg', width: 800, height: 600 },
  { public_id: 'orphan_xyz', secure_url: 'https://res.cloudinary.com/x/orphan_xyz.jpg', bytes: 50, format: 'jpg', width: 10, height: 10 },
];
const strapiFiles = [
  { provider_metadata: { public_id: 'projects/hillside_a' }, url: 'https://res.cloudinary.com/x/hillside_a.jpg', name: 'hillside_a.jpg', relatedProject: 'Hillside Farmhouse' },
];

describe('buildManifest', () => {
  it('maps each cloudinary asset and flags whether a Strapi record references it', () => {
    const m = buildManifest(cloudinaryResources, strapiFiles);
    const referenced = m.find((a) => a.public_id === 'projects/hillside_a');
    const orphan = m.find((a) => a.public_id === 'orphan_xyz');
    expect(referenced.referenced).toBe(true);
    expect(referenced.bytes).toBe(1000);
    expect(orphan.referenced).toBe(false);
  });
});

describe('buildUploadPlan', () => {
  it('matched contains referenced assets with local_path + project; unmatched holds the rest', () => {
    const plan = buildUploadPlan(cloudinaryResources, strapiFiles, 'api/backups/assets');
    expect(plan.matched).toHaveLength(1);
    expect(plan.matched[0]).toMatchObject({
      public_id: 'projects/hillside_a',
      project: 'Hillside Farmhouse',
      local_path: 'api/backups/assets/projects/hillside_a.jpg',
    });
    expect(plan.unmatched.map((u) => u.public_id)).toContain('orphan_xyz');
  });
});
