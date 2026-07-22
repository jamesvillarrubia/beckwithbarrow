/**
 * Shape-derived relation discovery.
 *
 * Strapi's `populate=*` reaches exactly one level. Rather than maintain a per-endpoint
 * map of nested paths (which silently goes stale when a field is added in Strapi), we
 * look at what the API actually returned and ask for the next level based on that.
 * Spec §0.6: never assume shape — read it first.
 */

/** A populated relation is recognised structurally: a document carries a documentId. */
function isDocument(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)['documentId'] === 'string'
  );
}

/**
 * Is this an uploaded media file?
 *
 * Media is a LEAF for traversal. Strapi media objects carry a `related` back-reference
 * to every entry that uses them, and asking Strapi to populate it returns a 500 —
 * observed against production on 2026-07-22 for about, approach, home, press,
 * press-articles and projects. We want an image's metadata, never the graph of what
 * points at it.
 *
 * Identified by `url` plus `mime`, which together distinguish an upload from an
 * ordinary document that merely happens to have a url field.
 */
export function isMediaDocument(value: unknown): boolean {
  if (!isDocument(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record['url'] === 'string' && typeof record['mime'] === 'string';
}

/**
 * Field names on `record` that hold populated relations.
 *
 * Deliberately excludes nested objects without a `documentId` — those are components,
 * which `populate=*` already inlines and which therefore need no further fetch. An
 * empty array is excluded too: it carries no evidence either way, and guessing would
 * be exactly the assumption this design forbids.
 */
export function relationFieldsOf(record: unknown): string[] {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) return [];

  const fields: string[] = [];
  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    if (isDocument(value)) {
      fields.push(key);
      continue;
    }
    if (Array.isArray(value) && value.length > 0 && value.every(isDocument)) {
      fields.push(key);
    }
  }
  return fields.sort();
}

/**
 * Build a Strapi v5 populate query for the given dot-separated paths.
 *
 * "stages.image" becomes populate[stages][populate][image][populate]=*, i.e. each
 * segment nests one level further and the leaf takes the wildcard. With no paths we
 * fall back to `populate=*`, which is the correct first probe of an unknown document.
 */
export function buildPopulateQuery(paths: readonly string[]): string {
  if (paths.length === 0) return 'populate=*';

  // Drop any path that another path descends from. Emitting both "pressArticles" and
  // "pressArticles.cover" asks Strapi to make populate[pressArticles][populate] be
  // simultaneously "*" and an object, which it answers with a 500. The descendant
  // populates the parent anyway, so the ancestor is redundant.
  const leaves = paths.filter(
    (path) => !paths.some((other) => other !== path && other.startsWith(`${path}.`)),
  );

  return leaves
    .map((path) => {
      const key = path
        .split('.')
        .map((segment) => `[${segment}][populate]`)
        .join('');
      return `${encodeURIComponent(`populate${key}`)}=${encodeURIComponent('*')}`;
    })
    .join('&');
}
