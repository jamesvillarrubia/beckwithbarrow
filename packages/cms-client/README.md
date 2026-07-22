# @beckwithbarrow/cms-client

Layer A of Pillar 2.5 — the safe-write client for the Beckwith Barrow Strapi CMS.
**All guardrails live here.** Layer B (the MCP server) wraps this package and holds
no token of its own, so it cannot bypass anything enforced here.

Spec: `reqts/pillar-2.5-cms-write-access.md`.

## Why this lives outside `api/`

It is a pure HTTP client against the Content REST API and imports nothing from the
Strapi app. It is also kept out of `api/` for a concrete reason: `api/tsconfig.json`
is Strapi's stock config and sweeps `./**/*.ts` from the project root with
`module: CommonJS` and `strict: false`, so a `.ts` file under `api/scripts/` would be
pulled into the Strapi server build non-strict.

## Non-negotiables (from the spec)

- **Backups first.** No write ships or runs until content *and* image backups are
  working and confirmed.
- **One write at a time.** Each invocation mutates exactly one document (or one field
  of one single type). No batch writes, no loops over records.
- **Never assume shape.** Every mutation begins by reading the live document; payloads
  are built from what came back, so an unread field cannot be overwritten. Zod
  validates the observed response rather than asserting a believed shape.
- **No deletes.** Not exposed at any layer.

## Status

Read/snapshot layer in progress. No write capability yet — the backup precondition
is not met.
