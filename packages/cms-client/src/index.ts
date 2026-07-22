/**
 * Public surface of the safe-write client (Layer A).
 *
 * Anything that wraps this — the CLI, the MCP server — inherits every guardrail,
 * because the guardrails live in the exported functions rather than in the callers.
 *
 * Note what is deliberately NOT exported: there is no delete, at any level. The write
 * transport exposes only `update`, and nothing here adds to that.
 */

export { mutate } from './mutate.js';
export type {
  MutationPlan,
  MutationTarget,
  MutationDeps,
  MutationResult,
  AuditEntry,
  ContentKind,
  VerifyAs,
} from './mutate.js';

export { revertPlanFor } from './revert.js';

export { describeFields, summariseType, renderSummary } from './describe.js';
export type { TypeSummary, FieldInfo, FieldType } from './describe.js';

export { createWriteTransport, documentUrl } from './transport.js';
export type { WriteTransport, UpdateOptions, HttpFn } from './transport.js';

export {
  createMutationDeps,
  createReader,
  readToken,
  loadSnapshot,
  DEFAULT_BASE_URL,
} from './runtime.js';
export type { RuntimeOptions } from './runtime.js';

export { fetchDeep, fetchAllPages, discoverPopulatePaths, parseEnvelope } from './content.js';
export type { Transport, Envelope, DeepFetch } from './content.js';

export { candidatesFromSchemas } from './discover.js';
export type { SchemaFile, Candidate } from './discover.js';

export { relationFieldsOf, buildPopulateQuery, isMediaDocument } from './relations.js';

export { stripRegenerable, stableStringify } from './snapshot.js';
