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
