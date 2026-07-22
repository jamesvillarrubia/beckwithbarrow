import { stableStringify } from './snapshot.js';

/**
 * The mutation wrapper — every write goes through here.
 *
 * Flow (spec §"the mutation flow"): read -> snapshot -> apply -> verify -> audit.
 *
 * Two of James's constraints are enforced by the *shape* of these types rather than by
 * discipline:
 *
 *  - **One write at a time.** A plan names exactly one field of exactly one document.
 *    There is no shape here that can express a batch, so a batch write is not merely
 *    forbidden, it is unrepresentable.
 *  - **No deletes.** No operation in this module removes anything. Deletion is not a
 *    capability that exists at any layer.
 */

export type ContentKind = 'singleType' | 'collectionType';

export interface MutationTarget {
  readonly endpoint: string;
  readonly kind: ContentKind;
  /** Required for collectionType; meaningless for singleType. */
  readonly documentId?: string;
}

export interface MutationPlan {
  readonly target: MutationTarget;
  /** The ONE field being changed. */
  readonly field: string;
  readonly nextValue: unknown;
  readonly dryRun?: boolean;
}

export interface AuditEntry {
  readonly at: string;
  readonly endpoint: string;
  readonly documentId?: string;
  readonly field: string;
  readonly snapshotRef: string;
  readonly before: unknown;
  readonly after: unknown;
  readonly applied: boolean;
  readonly noop: boolean;
}

export interface MutationDeps {
  /** Fetch the live document. Dependencies are arguments, not injected (CLAUDE.md). */
  read: (target: MutationTarget) => Promise<unknown>;
  write: (target: MutationTarget, payload: { data: Record<string, unknown> }) => Promise<unknown>;
  /** Persist the pre-write state; returns a reference (path) for the audit log. */
  recordSnapshot: (name: string, contents: string) => Promise<string>;
  appendAudit: (entry: AuditEntry) => Promise<void>;
  now: () => string;
}

export interface MutationResult {
  readonly applied: boolean;
  readonly noop: boolean;
  readonly snapshotRef: string;
  readonly before: unknown;
  readonly after: unknown;
}

/**
 * Fields the server owns and always rewrites. Excluded from the collateral-damage check
 * because they change on every successful write and would otherwise trip it every time.
 */
const SERVER_OWNED = new Set(['updatedAt']);

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${context}: expected a document object, got ${JSON.stringify(value)?.slice(0, 120)}`);
  }
  return value as Record<string, unknown>;
}

/** Structural equality via the same canonical form used for snapshots. */
function deepEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

/**
 * Confirm the intended change landed and nothing else moved.
 *
 * "Nothing else moved" is the important half: it is what catches a write that had wider
 * effects than intended, which is precisely the failure mode backups exist to undo.
 */
function verify(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  field: string,
  nextValue: unknown,
): void {
  if (!deepEqual(after[field], nextValue)) {
    throw new Error(
      `Verification failed: '${field}' did not land. ` +
        `Expected ${stableStringify(nextValue).trim()}, server has ${stableStringify(after[field]).trim()}`,
    );
  }

  const collateral: string[] = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (key === field || SERVER_OWNED.has(key)) continue;
    if (!deepEqual(before[key], after[key])) collateral.push(key);
  }

  if (collateral.length > 0) {
    throw new Error(
      `Verification failed: collateral change to ${collateral.join(', ')} — ` +
        `only '${field}' should have changed. The snapshot is the restore point.`,
    );
  }
}

/**
 * Apply exactly one field change to exactly one document, with the full safety sandwich.
 *
 * A no-op (writing a value identical to the current one) deliberately still performs the
 * write and the verification. Short-circuiting it would defeat its purpose: it is the
 * designated first live validation, proving the pipeline works with nothing at stake.
 */
export async function mutate(plan: MutationPlan, deps: MutationDeps): Promise<MutationResult> {
  const { target, field, nextValue } = plan;

  if (target.kind === 'collectionType' && !target.documentId) {
    throw new Error(
      `Refusing to write to collection '${target.endpoint}' without a documentId — ` +
        `resolve it from a read first rather than guessing.`,
    );
  }

  // 1. Read. Nothing about the document is assumed (spec §0.6).
  const before = asRecord(await deps.read(target), `read ${target.endpoint}`);

  if (!(field in before)) {
    throw new Error(
      `Field '${field}' is not present on ${target.endpoint} — ` +
        `refusing to create a field that the live document does not have. ` +
        `Present fields: ${Object.keys(before).sort().join(', ')}`,
    );
  }

  // 2. Snapshot. This is the restore point, written before anything changes.
  const stamp = deps.now().replace(/[:.]/g, '-');
  const label = target.documentId ? `${target.endpoint}-${target.documentId}` : target.endpoint;
  const snapshotRef = await deps.recordSnapshot(
    `${stamp}-${label}-${field}.json`,
    stableStringify(before),
  );

  const noop = deepEqual(before[field], nextValue);

  if (plan.dryRun) {
    return { applied: false, noop, snapshotRef, before: before[field], after: nextValue };
  }

  // 3. Apply — only the target field travels in the payload.
  const written = asRecord(
    await deps.write(target, { data: { [field]: nextValue } }),
    `write ${target.endpoint}`,
  );

  // 4. Verify. Throws before any audit entry is written, so the log never claims a
  //    success that did not happen.
  verify(before, written, field, nextValue);

  // 5. Audit.
  const entry: AuditEntry = {
    at: deps.now(),
    endpoint: target.endpoint,
    ...(target.documentId ? { documentId: target.documentId } : {}),
    field,
    snapshotRef,
    before: before[field],
    after: written[field],
    applied: true,
    noop,
  };
  await deps.appendAudit(entry);

  return { applied: true, noop, snapshotRef, before: before[field], after: written[field] };
}
