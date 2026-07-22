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

  /**
   * Observed on production 2026-07-22: writing to `global` re-published it, moving
   * publishedAt — even though the checked-in schema says draftAndPublish is false for
   * that type. The live schema and the repo disagree.
   */
  it('tolerates publishedAt moving from one timestamp to another (a re-publish)', async () => {
    const d = deps({
      write: vi.fn(async () => ({
        ...LIVE,
        publishedAt: '2026-07-22T20:41:02.077Z',
        email: 'new@beckwithbarrow.com',
      })),
    });
    const withPublished = { ...LIVE, publishedAt: '2025-10-07T00:22:42.260Z' };
    const dd = deps({ ...d, read: vi.fn(async () => structuredClone(withPublished)) });
    await expect(mutate(plan(), dd)).resolves.toMatchObject({ applied: true });
  });

  /** A publish-state change IS visible on the live site, so it must never be waved through. */
  it('still fails when publishedAt goes null — an accidental unpublish', async () => {
    const before = { ...LIVE, publishedAt: '2025-10-07T00:22:42.260Z' };
    const d = deps({
      read: vi.fn(async () => structuredClone(before)),
      write: vi.fn(async () => ({ ...before, publishedAt: null, email: 'new@beckwithbarrow.com' })),
    });
    await expect(mutate(plan(), d)).rejects.toThrow(/collateral.*publishedAt/i);
  });

  it('still fails when publishedAt appears from null — an accidental publish', async () => {
    const before = { ...LIVE, publishedAt: null };
    const d = deps({
      read: vi.fn(async () => structuredClone(before)),
      write: vi.fn(async () => ({
        ...before,
        publishedAt: '2026-07-22T20:41:02.077Z',
        email: 'new@beckwithbarrow.com',
      })),
    });
    await expect(mutate(plan(), d)).rejects.toThrow(/collateral.*publishedAt/i);
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

describe('mutate — ordered relations', () => {
  /**
   * A relation write sends an array of documentIds but reads back an array of full
   * documents, so plain equality can never verify it. Ordered relations are exactly
   * where order is the whole point (press.pressArticles), so the comparison has to be
   * order-aware rather than value-equal.
   */
  const PRESS = {
    documentId: 'press-1',
    pressArticles: [
      { documentId: 'a', title: 'A' },
      { documentId: 'b', title: 'B' },
      { documentId: 'c', title: 'C' },
    ],
    updatedAt: '2026-07-01T00:00:00.000Z',
  };

  const relationPlan = (next: string[]): MutationPlan => ({
    target: { endpoint: 'press', kind: 'singleType' },
    field: 'pressArticles',
    nextValue: next,
    verifyAs: 'relation-order',
  });

  function pressDeps(afterOrder: string[]): MutationDeps {
    return deps({
      read: vi.fn(async () => structuredClone(PRESS)),
      write: vi.fn(async () => ({
        ...PRESS,
        pressArticles: afterOrder.map((id) => ({ documentId: id, title: id.toUpperCase() })),
      })),
    });
  }

  it('verifies by comparing documentId order, not raw value equality', async () => {
    await expect(mutate(relationPlan(['c', 'a', 'b']), pressDeps(['c', 'a', 'b']))).resolves
      .toMatchObject({ applied: true });
  });

  it('fails when the server returns a different order than requested', async () => {
    await expect(
      mutate(relationPlan(['c', 'a', 'b']), pressDeps(['a', 'b', 'c'])),
    ).rejects.toThrow(/did not land/i);
  });

  it('fails when an article silently goes missing from the relation', async () => {
    await expect(mutate(relationPlan(['a', 'b', 'c']), pressDeps(['a', 'b']))).rejects.toThrow(
      /did not land/i,
    );
  });

  it('recognises rewriting the same order as a no-op', async () => {
    const result = await mutate(relationPlan(['a', 'b', 'c']), pressDeps(['a', 'b', 'c']));
    expect(result.noop).toBe(true);
    expect(result.applied).toBe(true);
  });

  it('reports before and after as id order, which is what a human needs to read', async () => {
    const result = await mutate(relationPlan(['c', 'b', 'a']), pressDeps(['c', 'b', 'a']));
    expect(result.before).toEqual(['a', 'b', 'c']);
    expect(result.after).toEqual(['c', 'b', 'a']);
  });

  it('refuses a relation-order write whose value is not a list of ids', async () => {
    const bad: MutationPlan = {
      target: { endpoint: 'press', kind: 'singleType' },
      field: 'pressArticles',
      nextValue: [{ documentId: 'a' }],
      verifyAs: 'relation-order',
    };
    await expect(mutate(bad, pressDeps(['a']))).rejects.toThrow(/documentId strings/i);
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
