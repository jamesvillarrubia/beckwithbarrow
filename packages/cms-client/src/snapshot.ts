/**
 * Snapshot normalisation.
 *
 * Snapshots are committed to git and are the revert point for every write, so they
 * must be small and byte-stable. Two transforms get us there:
 *
 *  - `stripRegenerable` drops Cloudinary's derived `formats` block. Measured on this
 *    site: a full content dump is ~517 KB, of which ~429 KB is `formats`. The
 *    derivatives are regenerable from the original, so they are noise in a backup.
 *  - `stableStringify` sorts object keys, so identical content always produces
 *    identical bytes and a nightly backup only shows a diff when content changed.
 */

/** A media object is identified structurally, by carrying a `url`. */
function looksLikeMedia(value: Record<string, unknown>): boolean {
  return typeof value['url'] === 'string';
}

/**
 * Recursively remove regenerable Cloudinary derivatives.
 *
 * Only strips `formats` from objects that look like media, so a content field
 * legitimately named "formats" on some other object survives untouched. Returns new
 * values throughout — the input is never mutated, since callers hold the live
 * response and may still need it.
 */
export function stripRegenerable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripRegenerable);

  if (value === null || typeof value !== 'object') return value;

  const source = value as Record<string, unknown>;
  const isMedia = looksLikeMedia(source);
  const out: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(source)) {
    if (isMedia && key === 'formats') continue;
    out[key] = stripRegenerable(child);
  }

  return out;
}

/** Recursively rebuild a value with object keys in sorted order. */
function withSortedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withSortedKeys);
  if (value === null || typeof value !== 'object') return value;

  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    out[key] = withSortedKeys(source[key]);
  }
  return out;
}

/**
 * Deterministic JSON for diffable, git-committed snapshots.
 *
 * Array order is preserved — it is meaningful for ordered relations such as
 * `press.pressArticles`, which is precisely what a reorder write changes.
 */
export function stableStringify(value: unknown): string {
  return `${JSON.stringify(withSortedKeys(value), null, 2)}\n`;
}
