# AI Instructions — Beckwith Barrow

## ⛔ NEVER RUN THESE (irreversible data loss)

The following destroy or sever the database→Cloudinary image links. On 2026-03-19 a
`strapi transfer` with production credentials destroyed **201 Cloudinary images**.
An AI agent must NEVER run, suggest running, or auto-chain into any of these:

- `strapi transfer` (any direction) — wipes the destination, deleting Cloudinary assets
- `strapi import` / `pnpm restore` — overwrites the database
- `strapi deploy` / any `deploy:cloud*` — production push
- any `delete:cloud-media*` — deletes Cloudinary binaries directly

These are gated behind `api/scripts/guard-forbidden.mjs` and are humans-only,
supervised, per `docs/RESTORE-RUNBOOK.md`.

## ✅ Safe operations

- `pnpm --filter ./api backup:safe` (or `cd api && pnpm backup:safe`) — read-only (GET) backup of content + assets
- Content edits via the Strapi admin UI
- Code/design changes via the normal branch → verify → tiered-merge workflow

---

## Project Overview

**Beckwith Barrow** is a portfolio website with:
- **Backend**: Strapi CMS (`/api` directory) — runs on localhost:1337
- **Frontend**: React app (`/frontend` directory) — runs on localhost:5173
- **Database**: Local SQLite for development, PostgreSQL for production
- **Cloud**: Strapi Cloud instance for production hosting
- **Media**: Images stored in Cloudinary (linked via Strapi media library)

## Available Safe Scripts

### Read-only backup
- `pnpm --filter api backup:safe` — GET-only dump of Strapi content + Cloudinary manifest + binary assets
- `pnpm --filter api backup:safe:dry-run` — preview without writing files
- `pnpm --filter api backup:list` — list existing backup archives

### Development utility scripts
- `pnpm --filter api seed:example` — seed initial data (local only)
- `pnpm --filter api fix:formats` — repair format configuration
- `pnpm --filter api fix:formats:force` — force repair

## Configuration Requirements

### Strapi Cloud Operations (READ ONLY)
**Required**: `api/strapi-cloud.env` file with:
```bash
export STRAPI_CLOUD_BASE_URL="https://your-project.strapiapp.com"
export STRAPI_CLOUD_API_TOKEN="your-api-token"
```

**Setup**:
```bash
cd api
cp strapi-cloud.env.example strapi-cloud.env
# Edit with your values — use READ-ONLY tokens only
source strapi-cloud.env
```

## Directory Structure Reference

```
api/
├── scripts/                    # Automation scripts
│   ├── guard-forbidden.mjs    # Blocks destructive ops — do not bypass
│   ├── safe-backup.mjs        # Read-only backup orchestrator
│   ├── lib/build-manifest.mjs # Pure manifest/upload-plan builder
│   ├── seed.js                # Initial data seeding
│   └── [various fix scripts]
├── backups/                   # Backup output (safe-backup.mjs writes here)
│   ├── assets/                # Binary image files (git-lfs)
│   └── <stamp>/               # Per-run content JSON dumps
├── src/safety/                # Runtime safety wrappers
│   └── disable-upload-delete.ts  # Suppresses Cloudinary auto-delete
├── public/uploads/            # Local media files (dev only)
├── strapi-cloud.env           # Cloud credentials (never commit)
└── strapi-cloud.env.example   # Template for cloud config
```

## What NOT to Create

Do NOT create scripts that:
- Call `strapi transfer`, `strapi import`, `strapi export`, or `strapi deploy`
- Call `DELETE` or `PUT` on Cloudinary's API
- Modify or delete Strapi media records in bulk
- Chain into `guard-forbidden.mjs` with the override env var set

When in doubt, check `docs/RESTORE-RUNBOOK.md` for the supervised procedure, or ask the user to confirm.

---

**Last Updated**: 2026-06-15
**Version**: 2.0 — Rewritten to forbid destructive ops after 2026-03-19 incident
