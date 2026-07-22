import type { AuditEntry, MutationPlan } from './mutate.js';

/**
 * Build the plan that undoes one audited mutation.
 *
 * Revert is deliberately unremarkable, and that is a consequence of the one-write-at-a-time
 * rule: because every mutation changes exactly one field of one document, every revert is
 * exactly one mutation back. There is no multi-step rollback to get wrong.
 *
 * The restored value comes from the **snapshot**, not from the audit entry's `before`.
 * The snapshot is the artifact captured from the live document; the audit line is a
 * summary written alongside it. If the two ever disagree, the snapshot is the one that
 * can be trusted, so it wins.
 */
export function revertPlanFor(
  entry: AuditEntry,
  snapshot: Record<string, unknown>,
): MutationPlan {
  if (!entry.applied) {
    throw new Error(
      `Refusing to revert an entry that was not applied (${entry.endpoint}.${entry.field}) — ` +
        `there is nothing to undo.`,
    );
  }

  if (!(entry.field in snapshot)) {
    throw new Error(
      `Field '${entry.field}' is not present in the snapshot for ${entry.endpoint} — ` +
        `refusing to revert to undefined. Snapshot fields: ${Object.keys(snapshot).sort().join(', ')}`,
    );
  }

  const target = entry.documentId
    ? { endpoint: entry.endpoint, kind: 'collectionType' as const, documentId: entry.documentId }
    : { endpoint: entry.endpoint, kind: 'singleType' as const };

  return { target, field: entry.field, nextValue: snapshot[entry.field] };
}
