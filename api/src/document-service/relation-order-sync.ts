import {
  RELATION_ORDER_SYNC_TARGETS,
  type RelationOrderSyncTarget,
} from '../config/relation-order-sync';

interface RelatedDocumentRef {
  documentId: string;
}

interface DbRow {
  id: number;
  documentId: string;
}

interface DbQueryLike {
  findOne: (params: unknown) => Promise<{ id: number } | null>;
  findMany: (params: unknown) => Promise<DbRow[]>;
  update: (params: unknown) => Promise<unknown>;
}

interface DocumentsServiceLike {
  findOne: (params: unknown) => Promise<Record<string, unknown> | null>;
}

interface ModelLike {
  attributes: Record<string, { target?: string } | undefined>;
}

export interface RelationOrderStrapi {
  getModel: (uid: string) => ModelLike;
  documents: (uid: string) => DocumentsServiceLike;
  db: { query: (uid: string) => DbQueryLike };
  log: { error: (...args: unknown[]) => void; warn: (...args: unknown[]) => void };
}

export interface DocumentServiceMiddlewareContext {
  uid: string;
  action: string;
  params: { documentId?: string; locale?: string };
}

export type DocumentServiceMiddleware = (
  ctx: DocumentServiceMiddlewareContext,
  next: () => Promise<unknown>,
) => Promise<unknown>;

/**
 * Rewrites the PUBLISHED entry's relation join rows to match the current
 * draft's relation order. Runs after Strapi's own publish has already
 * created/repointed the published rows; this only fixes ordering, using the
 * db query engine's `set` (full replace, order preserved) rather than a
 * second raw-knex hack.
 */
export async function resyncPublishedRelationOrder(
  strapi: RelationOrderStrapi,
  target: RelationOrderSyncTarget,
  documentId: string,
  locale: string | undefined,
): Promise<void> {
  const { uid, relationField } = target;

  const attribute = strapi.getModel(uid).attributes[relationField];
  const targetUid = attribute?.target;
  if (!targetUid) {
    strapi.log.warn(
      `[relation-order-sync] ${uid}.${relationField} has no relation target attribute; skipping resync.`,
    );
    return;
  }

  const draftDoc = await strapi.documents(uid).findOne({
    documentId,
    locale,
    status: 'draft',
    populate: { [relationField]: { fields: ['documentId'] } },
  });

  const related = (draftDoc?.[relationField] as RelatedDocumentRef[] | undefined) ?? [];
  if (related.length === 0) {
    strapi.log.warn(
      `[relation-order-sync] ${uid}.${relationField} draft documentId=${documentId} has no related entries; skipping resync.`,
    );
    return;
  }

  const orderedDocumentIds = related.map((ref) => ref.documentId);

  const publishedTargets = await strapi.db.query(targetUid).findMany({
    where: { documentId: { $in: orderedDocumentIds }, publishedAt: { $ne: null } },
    select: ['id', 'documentId'],
  });
  const publishedIdByDocumentId = new Map(publishedTargets.map((row) => [row.documentId, row.id]));

  const orderedPublishedIds = orderedDocumentIds
    .map((docId) => publishedIdByDocumentId.get(docId))
    .filter((id): id is number => id !== undefined);
  if (orderedPublishedIds.length === 0) {
    strapi.log.warn(
      `[relation-order-sync] ${uid}.${relationField} documentId=${documentId} has no published counterparts among its draft relations; skipping resync.`,
    );
    return;
  }

  const publishedOwner = await strapi.db.query(uid).findOne({
    where: { documentId, publishedAt: { $ne: null } },
    select: ['id'],
  });
  if (!publishedOwner) {
    strapi.log.warn(
      `[relation-order-sync] ${uid} documentId=${documentId} has no published owner row; skipping resync.`,
    );
    return;
  }

  await strapi.db.query(uid).update({
    where: { id: publishedOwner.id },
    data: { [relationField]: { set: orderedPublishedIds } },
  });
}

/**
 * Document Service middleware: on every `publish` action for a configured
 * uid, force the published relation order back in line with the draft's
 * current order. Wire with `strapi.documents.use(createRelationOrderSyncMiddleware(strapi))`.
 */
export function createRelationOrderSyncMiddleware(
  strapi: RelationOrderStrapi,
  targets: readonly RelationOrderSyncTarget[] = RELATION_ORDER_SYNC_TARGETS,
): DocumentServiceMiddleware {
  return async (ctx, next) => {
    const result = await next();

    if (ctx.action !== 'publish' || !ctx.params.documentId) {
      return result;
    }

    const target = targets.find((candidate) => candidate.uid === ctx.uid);
    if (!target) return result;

    try {
      await resyncPublishedRelationOrder(strapi, target, ctx.params.documentId, ctx.params.locale);
    } catch (err) {
      // A failure here runs after Strapi's own publish already succeeded; it must not
      // make a successful publish look failed to the caller. Log and swallow.
      strapi.log.error(
        `[relation-order-sync] Failed to resync relation order for ${ctx.uid} documentId=${ctx.params.documentId}:`,
        err,
      );
    }

    return result;
  };
}
