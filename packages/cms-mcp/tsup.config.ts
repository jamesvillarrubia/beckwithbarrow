import { defineConfig } from 'tsup';

/**
 * Bundle the hosted handler into ONE self-contained file.
 *
 * noExternal pulls every dependency inline — the MCP SDK, zod, and the
 * @beckwithbarrow/cms-client workspace package — so the deployed function imports
 * nothing but Node builtins. Vercel cannot resolve the workspace import at runtime;
 * bundling removes the need to.
 *
 * The output is committed, and CI fails if it drifts from source. See README.
 */
export default defineConfig({
  entry: { 'mcp/[secret]': 'src/handler/entry.ts' },
  outDir: 'api',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  bundle: true,
  noExternal: [/.*/],
  splitting: false,
  clean: true,
  dts: false,
  sourcemap: false,
  outExtension: () => ({ js: '.js' }),
});
