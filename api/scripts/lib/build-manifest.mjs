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
