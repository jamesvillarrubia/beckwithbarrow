# Build-time Static Data + Auto-rebuild via Strapi Webhooks

**Branch:** feature/static-data-cdn-cache
**Created:** 2026-03-30
**Status:** Ready for implementation

## Objective

Eliminate cold-start latency for first-time visitors by pre-generating all Strapi data at
build time and serving it from Vercel's CDN. When she publishes content in Strapi, a
webhook automatically triggers a Vercel rebuild — no manual steps required.

## Approach

1. A build script fetches all page data from Strapi and writes `src/generated/static-data.json`
2. `App.tsx` seeds the React Query cache with that data before any component mounts
3. Every page renders immediately from the CDN-served static data
4. React Query revalidates in the background if stale (24h threshold)
5. On publish in Strapi → Strapi webhook → Vercel deploy hook → rebuild → fresh static data

## Key Decisions

- **Seed React Query cache, not replace it**: `setQueryData()` at startup. No page component changes needed — they all use `useQuery` which checks the cache first.
- **Static data is a build artifact**: gitignored, regenerated on every deploy.
- **Both webhook resources are IaC**: Vercel deploy hook via REST API, Strapi webhook via admin API, both managed by Pulumi dynamic resources.
- **Strapi admin token moves to Pulumi secrets**: `strapi-cloud.env` plaintext tokens replaced with a comment-only template.

## Implementation Steps

- [ ] **Step 1**: Write `frontend/scripts/generate-static-data.ts`
- [ ] **Step 2**: Update `frontend/package.json` build script + add `src/generated/` to `.gitignore`
- [ ] **Step 3**: Update `App.tsx` to seed React Query cache from static data at startup
- [ ] **Step 4**: Add Vercel deploy hook + Strapi webhook dynamic resources to `infra/index.ts`
- [ ] **Step 5**: Add `strapiAdminApiToken` Pulumi secret, sanitize `api/strapi-cloud.env`
- [ ] **Step 6**: Test end-to-end locally, then deploy

## Files Created / Modified

| File | Change |
|------|--------|
| `frontend/scripts/generate-static-data.ts` | New — fetches all Strapi data, writes static JSON |
| `frontend/src/generated/static-data.json` | New (gitignored build artifact) |
| `frontend/src/generated/.gitkeep` | New — keeps directory in git |
| `frontend/src/App.tsx` | Seed React Query cache from static data |
| `frontend/package.json` | Add `generate-static` script, update `build` |
| `frontend/.gitignore` | Add `src/generated/static-data.json` |
| `infra/index.ts` | Add Vercel deploy hook + Strapi webhook resources |
| `infra/Pulumi.prod.yaml` | Add `strapiAdminApiToken` secret |
| `api/strapi-cloud.env` | Replace real tokens with comment-only template |

## Static Data Endpoints

| React Query Key | Endpoint | Populate |
|-----------------|----------|----------|
| `["global-settings"]` | `GET /global` | — |
| `["menu"]` | `GET /menu` | `menuItem` |
| `["home"]` | `GET /home` | `leftImage,rightImage,quote,projects.cover` |
| `["about"]` | `GET /about` | `*` |
| `["approach"]` | `GET /approach` | `coverImage,servicesList,stages.image` |
| `["connect"]` | `GET /connect` | — |
| `["press-page"]` | `GET /press` | `pressArticles.cover` |
| `["projects", { "limit": undefined, "featured": undefined }]` | `GET /projects` | `images,cover,categories` |

## Pulumi Resources

### Vercel Deploy Hook (dynamic resource)
```
POST https://api.vercel.com/v1/projects/{projectId}/deploy-hooks
Authorization: Bearer $VERCEL_API_TOKEN
{ "name": "strapi-publish", "ref": "main" }
→ outputs: hookUrl
```

### Strapi Webhook (dynamic resource)
```
POST https://striking-ball-b079f8c4b0.strapiapp.com/admin/webhooks
Authorization: Bearer strapiAdminApiToken (Pulumi secret)
{
  "name": "vercel-rebuild",
  "url": hookUrl,
  "events": ["entry.publish", "entry.unpublish", "media.create", "media.delete"],
  "enabled": true
}
```

## Open Questions

- [ ] Confirm the Strapi `STRAPI_CLOUD_API_TOKEN` has permission to create admin webhooks (vs needing a JWT-based admin token)
- [ ] Confirm `VERCEL_API_TOKEN` env var is set in the local environment for Pulumi to use
