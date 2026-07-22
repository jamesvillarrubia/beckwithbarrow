import { isMediaDocument } from './relations.js';
import type { ContentKind } from './discover.js';

/**
 * A compact, live map of the CMS.
 *
 * The point is that nobody — human or agent — has to remember the API or keep
 * documentation in sync with it. A full content dump is ~980 KB and cannot go in an
 * agent's context; this is a few KB: what exists, what kind it is, which fields are
 * relations, and how many records each holds.
 *
 * Everything is inferred from LIVE responses. Spec §0.6: read it, don't assume it.
 * The checked-in schema.json files are used only for the candidate endpoint list.
 */

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'media'
  | 'media[]'
  | 'relation'
  | 'relation[]'
  | 'component'
  | 'component[]'
  | 'list'
  | 'unset';

export interface FieldInfo {
  readonly name: string;
  readonly type: FieldType;
  /** Number of entries, for the array-shaped types. */
  readonly count?: number;
  /** A short excerpt, so a caller can recognise the field without a second fetch. */
  readonly sample?: unknown;
}

export interface TypeSummary {
  readonly endpoint: string;
  readonly kind: ContentKind;
  /** Total records the API reports, not the sample size. */
  readonly records: number;
  readonly fields: FieldInfo[];
}

/**
 * Server-managed plumbing. Excluded because an editor cannot meaningfully set any of
 * them, and their presence would triple the size of the map for no benefit.
 * `publishedAt` is among them: it is NOT a draft&publish signal (it is present on every
 * entry regardless), and treating it as one produced six false positives.
 */
const PLUMBING = new Set(['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale']);

const MAX_SAMPLE = 120;

function isDocument(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)['documentId'] === 'string'
  );
}

function excerpt(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_SAMPLE ? `${value.slice(0, MAX_SAMPLE)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return undefined;
}

function classify(value: unknown): { type: FieldType; count?: number } {
  if (value === null || value === undefined) return { type: 'unset' };

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'list', count: 0 };
    if (value.every(isMediaDocument)) return { type: 'media[]', count: value.length };
    if (value.every(isDocument)) return { type: 'relation[]', count: value.length };
    if (value.every((v) => typeof v === 'object' && v !== null)) {
      return { type: 'component[]', count: value.length };
    }
    return { type: 'list', count: value.length };
  }

  if (isMediaDocument(value)) return { type: 'media' };
  if (isDocument(value)) return { type: 'relation' };
  if (typeof value === 'object') return { type: 'component' };

  if (typeof value === 'number') return { type: 'number' };
  if (typeof value === 'boolean') return { type: 'boolean' };
  return { type: 'string' };
}

/** Describe the editable fields of one live document. */
export function describeFields(document: Record<string, unknown>): FieldInfo[] {
  const fields: FieldInfo[] = [];

  for (const [name, value] of Object.entries(document)) {
    if (PLUMBING.has(name)) continue;

    const { type, count } = classify(value);
    const sample = excerpt(value);

    fields.push({
      name,
      type,
      ...(count === undefined ? {} : { count }),
      ...(sample === undefined ? {} : { sample }),
    });
  }

  return fields.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Summarise one content type from live sample records.
 *
 * Fields are unioned across records because not every record populates every field —
 * describing only the first would silently hide any field it happens to leave empty.
 */
export function summariseType(
  endpoint: string,
  kind: ContentKind,
  records: readonly Record<string, unknown>[],
  total?: number,
): TypeSummary {
  const byName = new Map<string, FieldInfo>();

  for (const record of records) {
    for (const field of describeFields(record)) {
      // Prefer the first record that actually has a value, so a null in record one does
      // not mask a populated relation in record two.
      const seen = byName.get(field.name);
      if (!seen || (seen.type === 'unset' && field.type !== 'unset')) {
        byName.set(field.name, field);
      }
    }
  }

  return {
    endpoint,
    kind,
    records: total ?? records.length,
    fields: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Render a summary as compact text — what an agent or a human reads. */
export function renderSummary(types: readonly TypeSummary[]): string {
  const lines: string[] = [];

  for (const type of types) {
    const count = type.kind === 'collectionType' ? ` (${type.records})` : '';
    lines.push(`${type.endpoint}${count}  [${type.kind}]`);

    for (const field of type.fields) {
      const n = field.count === undefined ? '' : ` x${field.count}`;
      const s = field.sample === undefined ? '' : `  ${JSON.stringify(field.sample)}`;
      lines.push(`    ${field.name.padEnd(22)} ${`${field.type}${n}`.padEnd(14)}${s}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
