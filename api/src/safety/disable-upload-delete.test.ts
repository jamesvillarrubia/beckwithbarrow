import { describe, it, expect, vi, afterEach } from 'vitest';
import { wrapProviderNoDelete, installNoDeleteOverride } from './disable-upload-delete';

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

describe('installNoDeleteOverride', () => {
  const ORIG_ENV = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = ORIG_ENV; });

  const mkStrapi = (provider: unknown) => ({
    plugin: vi.fn().mockReturnValue(provider ? { provider } : {}),
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });

  it('mutates provider.delete in place to a no-op and returns true', async () => {
    const originalDelete = vi.fn().mockResolvedValue('deleted');
    const provider = { upload: vi.fn(), delete: originalDelete };
    const strapi = mkStrapi(provider);

    expect(installNoDeleteOverride(strapi)).toBe(true);
    await provider.delete({ provider_metadata: { public_id: 'z' } });
    expect(originalDelete).not.toHaveBeenCalled();       // in-place mutation took effect
    expect(strapi.log.info).toHaveBeenCalledOnce();
  });

  it('returns false (logs, no throw) when provider missing in non-production', () => {
    process.env.NODE_ENV = 'development';
    const strapi = mkStrapi(undefined);
    expect(installNoDeleteOverride(strapi)).toBe(false);
    expect(strapi.log.error).toHaveBeenCalledOnce();
  });

  it('FAILS CLOSED: throws when provider missing in production', () => {
    process.env.NODE_ENV = 'production';
    const strapi = mkStrapi(undefined);
    expect(() => installNoDeleteOverride(strapi)).toThrow(/Refusing to start/);
  });
});
