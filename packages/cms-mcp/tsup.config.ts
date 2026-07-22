import { defineConfig } from 'tsup';

/**
 * Bundle the hosted handler into ONE self-contained file.
 *
 * noExternal: [/.*​/] pulls every dependency inline — the MCP SDK, zod, and the
 * @beckwithbarrow/cms-client workspace package — so the deployed function imports
 * nothing but Node builtins. That is the whole point: Vercel resolving a pnpm
 * workspace at runtime was the cause of five consecutive deploy failures.
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
