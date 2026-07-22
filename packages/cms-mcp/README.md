# @beckwithbarrow/cms-mcp

Layer B — MCP server exposing the safe-write CMS client as tools.

## Transports

- **stdio** (`src/index.ts`) — local, spawned by Claude Code / Desktop. The token never
  leaves the machine.
- **HTTP** (`api/mcp/[secret].ts`) — hosted on Vercel, authenticated by a secret path
  segment.

Both build their tools from `src/server.ts`, so they cannot drift in what they expose or
what they permit. Neither has a delete tool.

## Nothing generated is committed

The HTTP handler is committed as TypeScript source; Vercel compiles it and resolves the
workspace normally. An earlier attempt committed a pre-built bundle, which works but can
be merged stale — a defect waiting to happen. That is fixed at the root instead: stray
`frontend/pnpm-workspace.yaml` and `api/pnpm-workspace.yaml` files were making pnpm treat
those directories as separate workspace roots, which broke lockfile resolution (forcing
`--no-frozen-lockfile`) and workspace linking (breaking the function).

`@beckwithbarrow/cms-client` is built by `pnpm build` before the function is bundled,
because Node cannot import TypeScript at runtime.
