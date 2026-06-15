type Logger = { warn: (msg: string) => void };
type UploadProvider = {
  upload?: unknown;
  uploadStream?: unknown;
  delete?: (...args: unknown[]) => unknown;
  [key: string]: unknown;
};

/**
 * Returns a copy of the upload provider whose `delete` is a logged no-op.
 * Deleting a Strapi file record then ORPHANS the Cloudinary asset instead of
 * destroying it. Orphans are cheap and cleanable; destroyed originals are gone.
 * This directly neutralizes the 2026-03-19 mass-deletion failure mode.
 */
export function wrapProviderNoDelete(
  provider: UploadProvider,
  logger: Logger,
): UploadProvider {
  return {
    ...provider,
    async delete(...args: unknown[]): Promise<void> {
      const file = args[0] as { url?: string; provider_metadata?: { public_id?: string } } | undefined;
      const id = file?.provider_metadata?.public_id ?? file?.url ?? 'unknown';
      logger.warn(`[safety] Cloudinary delete suppressed (orphaned, not destroyed): ${id}`);
    },
  };
}

type StrapiLike = {
  plugin?: (name: string) => { provider?: UploadProvider } | undefined;
  log: Logger & { info: (msg: string) => void; error: (msg: string) => void };
};

/**
 * Locate the live upload provider and mutate its `delete` in place to the no-op.
 * Mutating in place (not replacing the object) matters: the upload service AND the
 * data-transfer engine call `strapi.plugin('upload').provider.delete(...)` by dynamic
 * property access at call time, so the override is seen by every later caller —
 * including `strapi transfer`/`import`, the exact 2026-03-19 vector.
 *
 * FAIL-CLOSED: if the provider handle can't be found (e.g. a future Strapi upgrade
 * relocates it), this throws in production so the server refuses to start rather than
 * silently re-arming deletion. In non-production it logs and returns false so local
 * dev isn't blocked.
 */
export function installNoDeleteOverride(strapi: StrapiLike): boolean {
  const provider = strapi.plugin?.('upload')?.provider;
  if (provider && typeof provider.delete === 'function') {
    provider.delete = wrapProviderNoDelete(provider, strapi.log).delete;
    strapi.log.info('[safety] Cloudinary auto-delete disabled (records orphan, not destroy)');
    return true;
  }
  const msg = '[safety] Could not locate upload provider.delete — auto-delete NOT disabled.';
  strapi.log.error(msg);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${msg} Refusing to start to avoid re-arming Cloudinary deletion.`);
  }
  return false;
}
