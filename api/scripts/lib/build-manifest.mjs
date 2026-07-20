// Pure transforms — no network, no fs. Easy to unit test.

/** Index Strapi file records by Cloudinary public_id. */
function indexByPublicId(strapiFiles) {
  const map = new Map();
  for (const f of strapiFiles) {
    const id = f?.provider_metadata?.public_id;
    if (id) map.set(id, f);
  }
  return map;
}

/** One manifest row per Cloudinary asset, flagged as referenced or orphan. */
export function buildManifest(cloudinaryResources, strapiFiles) {
  const refs = indexByPublicId(strapiFiles);
  return cloudinaryResources.map((r) => ({
    public_id: r.public_id,
    url: r.secure_url,
    bytes: r.bytes,
    format: r.format,
    width: r.width,
    height: r.height,
    referenced: refs.has(r.public_id),
    related_record: refs.get(r.public_id)?.relatedProject ?? null,
  }));
}

/**
 * Given the current Cloudinary resources and the previous backup manifest,
 * return only the resources that still need downloading: assets absent from
 * the prior manifest (new), or whose byte count differs (the original was
 * overwritten). Assets already backed up unchanged are skipped — this is what
 * keeps recurring backup bandwidth near zero instead of re-pulling every
 * full-resolution original on every run.
 */
export function selectResourcesToDownload(cloudinaryResources, previousManifest = []) {
  const prev = new Map();
  for (const row of previousManifest ?? []) {
    if (row?.public_id) prev.set(row.public_id, row);
  }
  return cloudinaryResources.filter((r) => {
    const known = prev.get(r.public_id);
    if (!known) return true;                  // new asset
    return known.bytes !== r.bytes;           // changed original (else skip)
  });
}

/**
 * Build a restore plan where EVERY cloudinary asset is restorable (all in `matched`),
 * with project=null. Used when no Strapi record mapping is available (e.g. token-free
 * Cloudinary-only backup) — the binaries are the irreplaceable data, so all must be
 * recoverable regardless of which record references them.
 */
export function buildFullRestorePlan(cloudinaryResources, assetsDir) {
  const matched = cloudinaryResources.map((r) => {
    const ext = r.format ? `.${r.format}` : '';
    return { public_id: r.public_id, local_path: `${assetsDir}/${r.public_id}${ext}`, project: null };
  });
  return { matched, unmatched: [] };
}

/** Build the restore-cloudinary.py compatible upload plan. */
export function buildUploadPlan(cloudinaryResources, strapiFiles, assetsDir) {
  const refs = indexByPublicId(strapiFiles);
  const matched = [];
  const unmatched = [];
  for (const r of cloudinaryResources) {
    const ext = r.format ? `.${r.format}` : '';
    const local_path = `${assetsDir}/${r.public_id}${ext}`;
    const f = refs.get(r.public_id);
    if (f) {
      matched.push({ public_id: r.public_id, local_path, project: f.relatedProject ?? null });
    } else {
      unmatched.push({ public_id: r.public_id, local_path });
    }
  }
  return { matched, unmatched };
}
