import type { UID } from '@strapi/strapi';

export interface RelationOrderSyncTarget {
  uid: UID.ContentType;
  relationField: string;
}

/**
 * Content types where publish must force-resync relation order.
 * Strapi 5's publish step syncs relation add/remove but leaves the join-table
 * order stale for entries that stayed connected across a draft edit (only
 * disconnect+reconnect gets a fresh order). Add a one-line entry here for any
 * future draftAndPublish content type with an orderable relation.
 */
export const RELATION_ORDER_SYNC_TARGETS: readonly RelationOrderSyncTarget[] = [
  { uid: 'api::home.home', relationField: 'projects' },
];
