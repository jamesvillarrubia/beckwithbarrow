import { describe, it, expect, vi } from 'vitest';
import type { UID } from '@strapi/strapi';
import type { RelationOrderStrapi } from './relation-order-sync';
import { createRelationOrderSyncMiddleware } from './relation-order-sync';

/**
 * Unit coverage for the middleware's error boundary: `resyncPublishedRelationOrder`
 * runs after Strapi's own publish has already succeeded, so a failure inside it
 * must never make a successful publish look failed to the caller.
 */
describe('createRelationOrderSyncMiddleware error handling', () => {
  it('returns the successful publish result even when resyncPublishedRelationOrder throws', async () => {
    const logError = vi.fn();
    const strapi: RelationOrderStrapi = {
      getModel: () => {
        throw new Error('boom: model lookup failed');
      },
      documents: () => ({ findOne: vi.fn() }),
      db: { query: () => ({ findOne: vi.fn(), findMany: vi.fn(), update: vi.fn() }) },
      log: { error: logError, warn: vi.fn() },
    };

    const middleware = createRelationOrderSyncMiddleware(strapi, [
      { uid: 'api::home.home' as UID.ContentType, relationField: 'projects' },
    ]);

    const publishResult = { ok: true, documentId: 'doc-1' };
    const ctx = {
      uid: 'api::home.home',
      action: 'publish',
      params: { documentId: 'doc-1' },
    };
    const next = async () => publishResult;

    const result = await middleware(ctx, next);

    expect(result).toBe(publishResult);
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
