import { describe, it, expect, vi } from 'vitest';
import { wrapProviderNoDelete } from './disable-upload-delete';

describe('wrapProviderNoDelete', () => {
  it('replaces delete with a no-op that never calls the original', async () => {
    const originalDelete = vi.fn().mockResolvedValue('deleted');
    const logger = { warn: vi.fn() };
    const provider = { upload: vi.fn(), uploadStream: vi.fn(), delete: originalDelete };

    const wrapped = wrapProviderNoDelete(provider, logger);
    const result = await wrapped.delete({ url: 'x', provider_metadata: { public_id: 'abc' } });

    expect(originalDelete).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('preserves upload and uploadStream untouched', () => {
    const provider = { upload: vi.fn(), uploadStream: vi.fn(), delete: vi.fn() };
    const wrapped = wrapProviderNoDelete(provider, { warn: vi.fn() });
    expect(wrapped.upload).toBe(provider.upload);
    expect(wrapped.uploadStream).toBe(provider.uploadStream);
  });

  it('is idempotent — wrapping twice still no-ops', async () => {
    const originalDelete = vi.fn();
    const wrapped = wrapProviderNoDelete(
      wrapProviderNoDelete({ delete: originalDelete }, { warn: vi.fn() }),
      { warn: vi.fn() },
    );
    await wrapped.delete({ url: 'y' });
    expect(originalDelete).not.toHaveBeenCalled();
  });
});
