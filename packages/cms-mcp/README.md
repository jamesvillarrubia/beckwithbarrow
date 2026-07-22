# @beckwithbarrow/cms-mcp

Layer B — MCP server exposing the safe-write CMS client as tools.

## The committed bundle

`api/mcp/[secret].js` is **generated and committed on purpose**.

Vercel deploys it as-is with no build step, so nothing is resolved or compiled at deploy
time. That is deliberate: five consecutive deploy failures came from asking Vercel to
resolve a pnpm workspace and compile TypeScript inside a serverless function, and one
self-contained file removes that entire class of problem.

**After changing anything under `src/` or in `@beckwithbarrow/cms-client`, rebuild:**

```bash
pnpm --filter @beckwithbarrow/cms-mcp build   # rebuilds the dependency, then bundles
git add packages/cms-mcp/api
```

The tradeoff is that the bundle can go stale if someone forgets. That is a real cost,
accepted in exchange for a deployment that cannot fail on dependency resolution.

## Transports

- **stdio** (`src/index.ts`) — local, spawned by Claude Code / Desktop. Token never
  leaves the machine.
- **HTTP** (`src/handler/entry.ts` → the bundle) — hosted on Vercel, authenticated by a
  secret path segment.

Both build their tools from `src/server.ts`, so they cannot drift in what they expose.
Neither has a delete tool.
