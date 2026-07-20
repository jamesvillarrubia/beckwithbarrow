import { describe, it, expect } from 'vitest';
import { buildManifest, buildUploadPlan, buildFullRestorePlan, selectResourcesToDownload } from './build-manifest.mjs';

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

describe('selectResourcesToDownload', () => {
  const prevManifest = [
    { public_id: 'projects/hillside_a', bytes: 1000 },
    { public_id: 'orphan_xyz', bytes: 50 },
  ];

  it('downloads nothing when every asset is already backed up unchanged', () => {
    const toDownload = selectResourcesToDownload(cloudinaryResources, prevManifest);
    expect(toDownload).toHaveLength(0);
  });

  it('downloads a brand-new asset absent from the previous manifest', () => {
    const withNew = [
      ...cloudinaryResources,
      { public_id: 'projects/new_pool', secure_url: 'https://res.cloudinary.com/x/new_pool.jpg', bytes: 2000, format: 'jpg' },
    ];
    const toDownload = selectResourcesToDownload(withNew, prevManifest);
    expect(toDownload.map((r) => r.public_id)).toEqual(['projects/new_pool']);
  });

  it('re-downloads an asset whose bytes changed (overwritten original)', () => {
    const changed = [
      { public_id: 'projects/hillside_a', secure_url: 'https://res.cloudinary.com/x/hillside_a.jpg', bytes: 9999, format: 'jpg' },
      { public_id: 'orphan_xyz', secure_url: 'https://res.cloudinary.com/x/orphan_xyz.jpg', bytes: 50, format: 'jpg' },
    ];
    const toDownload = selectResourcesToDownload(changed, prevManifest);
    expect(toDownload.map((r) => r.public_id)).toEqual(['projects/hillside_a']);
  });

  it('downloads everything when there is no previous manifest (first run)', () => {
    expect(selectResourcesToDownload(cloudinaryResources, [])).toHaveLength(2);
    expect(selectResourcesToDownload(cloudinaryResources)).toHaveLength(2);
  });
});

describe('buildFullRestorePlan', () => {
  it('makes EVERY cloudinary asset restorable (matched), with project null when unknown', () => {
    const plan = buildFullRestorePlan(cloudinaryResources, 'api/backups/assets');
    expect(plan.matched).toHaveLength(2);
    expect(plan.unmatched).toEqual([]);
    expect(plan.matched.map((m) => m.public_id).sort()).toEqual(['orphan_xyz', 'projects/hillside_a']);
    expect(plan.matched.find((m) => m.public_id === 'projects/hillside_a')).toMatchObject({
      local_path: 'api/backups/assets/projects/hillside_a.jpg',
      project: null,
    });
  });
});
