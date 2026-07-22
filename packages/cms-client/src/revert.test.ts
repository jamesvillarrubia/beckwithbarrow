import { describe, it, expect, vi } from 'vitest';
import { revertPlanFor } from './revert.js';
import { mutate, type AuditEntry, type MutationDeps } from './mutate.js';

const entry: AuditEntry = {
  at: '2026-07-22T00:00:00.000Z',
  endpoint: 'connect',
  field: 'email',
  snapshotRef: 'api/backups/content-snapshots/x.json',
  before: 'old@beckwithbarrow.com',
  after: 'new@beckwithbarrow.com',
  applied: true,
  noop: false,
};

const snapshot = {
  documentId: 'doc-1',
  email: 'old@beckwithbarrow.com',
  address: '27 Holland Rd.',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('revertPlanFor', () => {
  it('restores the value the snapshot holds, not the value the audit claims', () => {
    // The snapshot is the artifact on disk; the audit line is a summary of it. If they
    // ever disagree, the snapshot is the one that can actually be trusted.
    const plan = revertPlanFor(entry, { ...snapshot, email: 'actually-this@x.com' });
    expect(plan.nextValue).toBe('actually-this@x.com');
  });

  it('targets the same endpoint and field as the original write', () => {
    const plan = revertPlanFor(entry, snapshot);
    expect(plan.target.endpoint).toBe('connect');
    expect(plan.field).toBe('email');
  });

  it('carries the documentId through for a collection write', () => {
    const collectionEntry: AuditEntry = { ...entry, endpoint: 'projects', documentId: 'p-9' };
    const plan = revertPlanFor(collectionEntry, { ...snapshot, documentId: 'p-9' });
    expect(plan.target).toMatchObject({
      endpoint: 'projects',
      kind: 'collectionType',
      documentId: 'p-9',
    });
  });

  it('treats an entry without a documentId as a single type', () => {
    expect(revertPlanFor(entry, snapshot).target.kind).toBe('singleType');
  });

  it('refuses when the snapshot lacks the field, rather than reverting to undefined', () => {
    const { email, ...withoutEmail } = snapshot;
    void email;
    expect(() => revertPlanFor(entry, withoutEmail)).toThrow(/not present/i);
  });

  it('refuses to revert an entry that was never applied', () => {
    expect(() => revertPlanFor({ ...entry, applied: false }, snapshot)).toThrow(/not applied/i);
  });
});

describe('revert round trip', () => {
  /** Change a value, then revert it, and confirm the document is back where it started. */
  it('returns the document to its original value', async () => {
    let live: Record<string, unknown> = { ...snapshot };
    const captured: string[] = [];

    const deps: MutationDeps = {
      read: vi.fn(async () => structuredClone(live)),
      write: vi.fn(async (_t, payload) => {
        live = { ...live, ...payload.data, updatedAt: new Date(0).toISOString() };
        return structuredClone(live);
      }),
      recordSnapshot: vi.fn(async (_name, contents) => {
        captured.push(contents);
        return `snap-${captured.length}.json`;
      }),
      appendAudit: vi.fn(async () => undefined),
      now: () => '2026-07-22T00:00:00.000Z',
    };

    await mutate(
      { target: { endpoint: 'connect', kind: 'singleType' }, field: 'email', nextValue: 'new@x.com' },
      deps,
    );
    expect(live['email']).toBe('new@x.com');

    const takenSnapshot = JSON.parse(captured[0] as string) as Record<string, unknown>;
    const plan = revertPlanFor(
      { ...entry, before: 'old@beckwithbarrow.com', after: 'new@x.com' },
      takenSnapshot,
    );
    await mutate(plan, deps);

    expect(live['email']).toBe('old@beckwithbarrow.com');
  });
});
