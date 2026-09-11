import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import type { Core, UID } from '@strapi/strapi';
import { resyncPublishedRelationOrder } from './relation-order-sync';

/**
 * Regression coverage for the Strapi 5 relation-order-on-republish bug:
 * publish syncs relation add/remove but can leave join-table ORDER stale for
 * relation entries that stayed connected across a draft edit. Boots a real
 * Strapi instance against an isolated local SQLite file (no mocks).
 *
 * The first test exercises the full contract end to end (publish, reorder,
 * republish, read back) through the actual document-service publish
 * pipeline. The second test isolates `resyncPublishedRelationOrder` itself
 * against a manufactured draft/published mismatch, independent of whether
 * Strapi's own publish already closes the gap on a given version/database.
 */

const TEST_DB_FILENAME = `.tmp/test-relation-order-${process.pid}-${Date.now()}.db`;

function ensureTestEnv(): void {
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = TEST_DB_FILENAME;
  process.env.APP_KEYS ||= 'testKey1,testKey2';
  process.env.API_TOKEN_SALT ||= 'test-api-token-salt';
  process.env.ADMIN_JWT_SECRET ||= 'test-admin-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT ||= 'test-transfer-token-salt';
  process.env.JWT_SECRET ||= 'test-jwt-secret';
  process.env.ENCRYPTION_KEY ||= 'test-encryption-key';
}

let strapi: Core.Strapi;

describe('home.projects relation order survives a republish (integration)', () => {
  beforeAll(async () => {
    ensureTestEnv();
    const { createStrapi, compileStrapi } = require('@strapi/strapi') as typeof import('@strapi/strapi');
    const appContext = await compileStrapi();
    strapi = await createStrapi({ ...appContext, serveAdminPanel: false }).load();
  }, 180_000);

  afterAll(async () => {
    // Strapi's own `destroy()` ends with a bare `process.removeAllListeners()`
    // (no event name — every event, on the real Node `process`). Vitest's
    // worker pool runs this file in a forked child process and relies on its
    // own `process.on('message', ...)` IPC listener to report the task back
    // to the pool; wiping it makes the pool see the fork exit "unexpectedly"
    // even though every test already passed. Snapshot and restore the
    // process-level listeners Strapi's destroy() would otherwise erase.
    const preservedEvents = ['message', 'disconnect', 'uncaughtException', 'unhandledRejection'] as const;
    const preservedListeners = preservedEvents.map((event) => [event, process.listeners(event)] as const);

    if (strapi) {
      await strapi.destroy();
    }

    for (const [event, listeners] of preservedListeners) {
      for (const listener of listeners) {
        process.on(event as never, listener as never);
      }
    }
    const dbPath = path.join(__dirname, '..', '..', TEST_DB_FILENAME);
    for (const ext of ['', '-journal', '-wal', '-shm']) {
      if (fs.existsSync(dbPath + ext)) fs.rmSync(dbPath + ext);
    }
  });

  // Strapi's native connect-with-position reordering already preserves order
  // (baseline, not fix coverage): this test passes identically with the fix's
  // middleware disabled, verified on SQLite (this suite's DB driver; no Postgres
  // test harness exists in this repo to check that driver too). It guards
  // Strapi's own publish behavior, not resyncPublishedRelationOrder.
  it("Strapi's native connect-with-position reordering already preserves order (baseline, not fix coverage)", async () => {
    const projectUid = 'api::project.project' as UID.ContentType;
    const homeUid = 'api::home.home' as UID.ContentType;

    async function createPublishedProject(title: string) {
      const draft = await strapi.documents(projectUid).create({ data: { title } });
      const published = await strapi.documents(projectUid).publish({ documentId: draft.documentId });
      return published.entries[0] as unknown as { documentId: string };
    }

    const projectA = await createPublishedProject('Project A');
    const projectB = await createPublishedProject('Project B');
    const projectC = await createPublishedProject('Project C');

    const homeDraft = await strapi.documents(homeUid).create({
      data: {
        title: 'Home',
        projects: {
          connect: [
            { documentId: projectA.documentId },
            { documentId: projectB.documentId },
            { documentId: projectC.documentId },
          ],
        },
      },
    });

    await strapi.documents(homeUid).publish({ documentId: homeDraft.documentId });

    // Reorder the draft: move C to the front. This is a connect-with-position
    // move, matching how the admin UI reorders relations — A and B are never
    // disconnected, only C's position changes.
    await strapi.documents(homeUid).update({
      documentId: homeDraft.documentId,
      data: {
        projects: {
          connect: [{ documentId: projectC.documentId, position: { start: true } }],
        },
      },
    });

    await strapi.documents(homeUid).publish({ documentId: homeDraft.documentId });

    const publishedHome = await strapi.documents(homeUid).findOne({
      documentId: homeDraft.documentId,
      status: 'published',
      populate: { projects: { fields: ['documentId'] } },
    });

    const publishedOrder = (publishedHome?.projects as Array<{ documentId: string }>).map(
      (p) => p.documentId,
    );

    expect(publishedOrder).toEqual([
      projectC.documentId,
      projectA.documentId,
      projectB.documentId,
    ]);
  }, 60_000);

  it('resyncPublishedRelationOrder pushes the current draft order onto the published entity', async () => {
    const projectUid = 'api::project.project' as UID.ContentType;
    const homeUid = 'api::home.home' as UID.ContentType;

    async function createPublishedProject(title: string) {
      const draft = await strapi.documents(projectUid).create({ data: { title } });
      const published = await strapi.documents(projectUid).publish({ documentId: draft.documentId });
      return published.entries[0] as unknown as { documentId: string };
    }

    const projectA = await createPublishedProject('Fn Project A');
    const projectB = await createPublishedProject('Fn Project B');
    const projectC = await createPublishedProject('Fn Project C');

    const homeDraft = await strapi.documents(homeUid).create({
      data: {
        title: 'Fn Home',
        projects: {
          connect: [
            { documentId: projectA.documentId },
            { documentId: projectB.documentId },
            { documentId: projectC.documentId },
          ],
        },
      },
    });
    await strapi.documents(homeUid).publish({ documentId: homeDraft.documentId });

    // Reorder the DRAFT only — do not republish. The published entity still
    // reflects the old [A, B, C] order; the draft now says [C, A, B]. This is
    // exactly the "draft has moved on, published hasn't caught up" state the
    // fix's helper is responsible for closing on the next publish.
    await strapi.documents(homeUid).update({
      documentId: homeDraft.documentId,
      data: {
        projects: {
          connect: [{ documentId: projectC.documentId, position: { start: true } }],
        },
      },
    });

    const publishedBefore = await strapi.documents(homeUid).findOne({
      documentId: homeDraft.documentId,
      status: 'published',
      populate: { projects: { fields: ['documentId'] } },
    });
    expect((publishedBefore?.projects as Array<{ documentId: string }>).map((p) => p.documentId)).toEqual([
      projectA.documentId,
      projectB.documentId,
      projectC.documentId,
    ]);

    await resyncPublishedRelationOrder(
      strapi as unknown as Parameters<typeof resyncPublishedRelationOrder>[0],
      { uid: homeUid, relationField: 'projects' },
      homeDraft.documentId,
      undefined,
    );

    const publishedAfter = await strapi.documents(homeUid).findOne({
      documentId: homeDraft.documentId,
      status: 'published',
      populate: { projects: { fields: ['documentId'] } },
    });
    expect((publishedAfter?.projects as Array<{ documentId: string }>).map((p) => p.documentId)).toEqual([
      projectC.documentId,
      projectA.documentId,
      projectB.documentId,
    ]);
  }, 60_000);

  it('excludes a draft-only project (never published) from the resync instead of erroring or corrupting order', async () => {
    const projectUid = 'api::project.project' as UID.ContentType;
    const homeUid = 'api::home.home' as UID.ContentType;

    async function createPublishedProject(title: string) {
      const draft = await strapi.documents(projectUid).create({ data: { title } });
      const published = await strapi.documents(projectUid).publish({ documentId: draft.documentId });
      return published.entries[0] as unknown as { documentId: string };
    }

    const projectA = await createPublishedProject('Unpub Project A');
    const projectB = await createPublishedProject('Unpub Project B');
    // Draft-only: created but never published, so it has no published counterpart row.
    const projectDraftOnly = await strapi.documents(projectUid).create({
      data: { title: 'Unpub Project Draft-Only' },
    });

    const homeDraft = await strapi.documents(homeUid).create({
      data: {
        title: 'Unpub Home',
        projects: {
          connect: [{ documentId: projectA.documentId }, { documentId: projectB.documentId }],
        },
      },
    });
    await strapi.documents(homeUid).publish({ documentId: homeDraft.documentId });

    // Connect the never-published project into the draft, ahead of A and B.
    // The draft order is now [draft-only, A, B]; the draft-only entry has no
    // published row for the resync to point at.
    await strapi.documents(homeUid).update({
      documentId: homeDraft.documentId,
      data: {
        projects: {
          connect: [{ documentId: projectDraftOnly.documentId, position: { start: true } }],
        },
      },
    });

    await expect(
      resyncPublishedRelationOrder(
        strapi as unknown as Parameters<typeof resyncPublishedRelationOrder>[0],
        { uid: homeUid, relationField: 'projects' },
        homeDraft.documentId,
        undefined,
      ),
    ).resolves.toBeUndefined();

    const publishedAfter = await strapi.documents(homeUid).findOne({
      documentId: homeDraft.documentId,
      status: 'published',
      populate: { projects: { fields: ['documentId'] } },
    });

    expect((publishedAfter?.projects as Array<{ documentId: string }>).map((p) => p.documentId)).toEqual([
      projectA.documentId,
      projectB.documentId,
    ]);
  }, 60_000);
});
