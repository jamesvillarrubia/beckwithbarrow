/**
 * Content-type discovery.
 *
 * Per spec §0.6 the local `schema.json` files are a HINT ONLY — they describe what
 * this checkout believes, which can drift from what prod actually serves. So this
 * module only proposes *candidate* endpoints; confirming that an endpoint exists and
 * learning the shape of what it returns is the live API's job.
 */

export type ContentKind = 'singleType' | 'collectionType';

export interface SchemaFile {
  /** Repo-relative path, kept for error messages and provenance. */
  readonly path: string;
  readonly kind: ContentKind;
  readonly singularName: string;
  readonly pluralName: string;
}

export interface Candidate {
  /** Path segment after /api/ — e.g. "about" or "projects". */
  readonly endpoint: string;
  readonly kind: ContentKind;
  readonly source: string;
}

/**
 * Translate schema files into candidate REST endpoints.
 *
 * Strapi routes single types under their singular name and collections under their
 * plural name. Schemas missing the relevant name are dropped rather than guessed at:
 * a wrong endpoint would silently back up nothing.
 */
export function candidatesFromSchemas(schemas: readonly SchemaFile[]): Candidate[] {
  const byEndpoint = new Map<string, Candidate>();

  for (const schema of schemas) {
    const name = schema.kind === 'singleType' ? schema.singularName : schema.pluralName;
    if (!name) continue;
    if (byEndpoint.has(name)) continue;
    byEndpoint.set(name, { endpoint: name, kind: schema.kind, source: schema.path });
  }

  return [...byEndpoint.values()].sort((a, b) => a.endpoint.localeCompare(b.endpoint));
}
