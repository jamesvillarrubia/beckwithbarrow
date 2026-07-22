import { describe, it, expect, vi } from 'vitest';
import {
  mutate,
  type MutationPlan,
  type MutationDeps,
  type MutationTarget,
  type AuditEntry,
} from './mutate.js';

/** A live document as the API would return it. */
const LIVE = {
  documentId: 'doc-1',
  id: 7,
  address: '27 Holland Rd.\nMelrose, MA 02176 ',
  email: 'design@beckwithbarrow.com',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

function deps(overrides: Partial<MutationDeps> = {}): MutationDeps {
  return {
    read: vi.fn(async () => structuredClone(LIVE)),
    write: vi.fn(async () => structuredClone(LIVE)),
    recordSnapshot: vi.fn(async () => 'api/backups/content-snapshots/stamp-op.json'),
    appendAudit: vi.fn(async () => undefined),
    now: () => '2026-07-22T00:00:00.000Z',
    ...overrides,
  };
}

const plan = (over: Partial<MutationPlan> = {}): MutationPlan => ({
  target: { endpoint: 'connect', kind: 'singleType' },
  field: 'email',
  nextValue: 'new@beckwithbarrow.com',
  ...over,
});

describe('mutate — preconditions', () => {
  it('refuses a collection write with no documentId, rather than guessing one', async () => {
    const d = deps();
    await expect(
      mutate(plan({ target: { endpoint: 'projects', kind: 'collectionType' } }), d),
    ).rejects.toThrow(/documentId/i);
    expect(d.write).not.toHaveBeenCalled();
  });

  /** Spec §0.6 — the field must be observed on the live document, never assumed. */
  it('refuses to write a field that is absent from the live document', async () => {
    const d = deps();
    await expect(mutate(plan({ field: 'nonexistent' }), d)).rejects.toThrow(/not present/i);
    expect(d.write).not.toHaveBeenCalled();
  });

  it('reads before it writes', async () => {
    const order: string[] = [];
    const d = deps({
      read: vi.fn(async () => {
        order.push('read');
        return structuredClone(LIVE);
      }),
      write: vi.fn(async (_t, _p) => {
        order.push('write');
        return structuredClone(LIVE);
      }),
    });
    await mutate(plan({ field: 'email', nextValue: LIVE.email }), d).catch(() => undefined);
    expect(order[0]).toBe('read');
  });
});

describe('mutate — payload', () => {
  it('sends only the single target field, so an unread field cannot be overwritten', async () => {
    const write = vi.fn(
      async (_t: MutationTarget, _p: { data: Record<string, unknown> }) => ({
        ...LIVE,
        email: 'new@beckwithbarrow.com',
      }),
    );
    await mutate(plan(), deps({ write }));
    expect(write.mock.calls[0]?.[1]).toEqual({ data: { email: 'new@beckwithbarrow.com' } });
  });
});

describe('mutate — dry run', () => {
  it('writes nothing and reports the diff', async () => {
    const d = deps();
    const result = await mutate({ ...plan(), dryRun: true }, d);
    expect(d.write).not.toHaveBeenCalled();
    expect(result.applied).toBe(false);
    expect(result.before).toBe(LIVE.email);
    expect(result.after).toBe('new@beckwithbarrow.com');
  });

  it('still snapshots on a dry run, so the diff is reproducible', async () => {
    const d = deps();
    await mutate({ ...plan(), dryRun: true }, d);
    expect(d.recordSnapshot).toHaveBeenCalled();
  });

  it('does not write an audit entry for a dry run — nothing happened', async () => {
    const d = deps();
    await mutate({ ...plan(), dryRun: true }, d);
    expect(d.appendAudit).not.toHaveBeenCalled();
  });
});

describe('mutate — verification', () => {
  it('throws when the value did not actually land', async () => {
    // Server echoes the old value: the write silently did nothing.
    const d = deps({ write: vi.fn(async () => structuredClone(LIVE)) });
    await expect(mutate(plan(), d)).rejects.toThrow(/did not land/i);
  });

  it('throws when a field other than the target also changed', async () => {
    const d = deps({
      write: vi.fn(async () => ({
        ...LIVE,
        email: 'new@beckwithbarrow.com',
        address: 'SOMETHING ELSE CHANGED',
      })),
    });
    await expect(mutate(plan(), d)).rejects.toThrow(/collateral/i);
  });

  it('ignores updatedAt, which the server always bumps', async () => {
    const d = deps({
      write: vi.fn(async () => ({
        ...LIVE,
        email: 'new@beckwithbarrow.com',
        updatedAt: '2026-07-22T12:00:00.000Z',
      })),
    });
    await expect(mutate(plan(), d)).resolves.toMatchObject({ applied: true });
  });
});

describe('mutate — the no-op write (live validation step 1)', () => {
  /**
   * Writing an identical value must still traverse the whole pipeline. Short-circuiting
   * it would defeat its entire purpose: it exists to prove snapshot -> write -> verify
   * -> audit works end-to-end with nothing visible at stake.
   */
  it('performs a real write even when the value is unchanged', async () => {
    const d = deps({ write: vi.fn(async () => structuredClone(LIVE)) });
    const result = await mutate(plan({ field: 'email', nextValue: LIVE.email }), d);
    expect(d.write).toHaveBeenCalledTimes(1);
    expect(result.applied).toBe(true);
    expect(result.noop).toBe(true);
  });

  it('audits the no-op as such', async () => {
    const appendAudit = vi.fn(async (_e: AuditEntry) => undefined);
    const d = deps({ write: vi.fn(async () => structuredClone(LIVE)), appendAudit });
    await mutate(plan({ field: 'email', nextValue: LIVE.email }), d);
    expect(appendAudit.mock.calls[0]?.[0]).toMatchObject({ noop: true, applied: true });
  });
});

describe('mutate — audit', () => {
  it('records the snapshot reference so the change is revertible', async () => {
    const appendAudit = vi.fn(async (_e: AuditEntry) => undefined);
    const d = deps({
      write: vi.fn(async () => ({ ...LIVE, email: 'new@beckwithbarrow.com' })),
      appendAudit,
    });
    await mutate(plan(), d);
    expect(appendAudit.mock.calls[0]?.[0]).toMatchObject({
      endpoint: 'connect',
      field: 'email',
      snapshotRef: 'api/backups/content-snapshots/stamp-op.json',
      at: '2026-07-22T00:00:00.000Z',
    });
  });

  it('does not audit a write that failed verification', async () => {
    const appendAudit = vi.fn(async (_e: AuditEntry) => undefined);
    const d = deps({ write: vi.fn(async () => structuredClone(LIVE)), appendAudit });
    await mutate(plan(), d).catch(() => undefined);
    expect(appendAudit).not.toHaveBeenCalled();
  });
});
