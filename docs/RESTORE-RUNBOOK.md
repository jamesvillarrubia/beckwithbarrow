# Disaster Recovery Runbook — Cloudinary / Strapi

## When to use
Images are missing on the live site, or DB→image links are broken.

## Preconditions
- A backup exists under `api/backups/<stamp>/` and `api/backups/assets/` (git-lfs).
- `api/backups/cloudinary-upload-plan.json` is present.

## Environment setup
Before running any step that contacts Cloudinary, export all three credentials:

```bash
export CLOUDINARY_NAME='your_cloud_name'
export CLOUDINARY_KEY='your_api_key'
export CLOUDINARY_SECRET='your_api_secret'
```

All three are required — `CLOUDINARY_NAME` and `CLOUDINARY_KEY` are no longer hardcoded
in the restore script. Omitting any one of them will produce a clear error message and
abort before touching Cloudinary.

## Procedure (humans only — supervised)
> Run every command **from the repository root** — `local_path` values in the upload-plan
> (e.g. `api/backups/assets/...`) are resolved relative to the current working directory.

1. Pull the latest backup commit; run `git lfs pull` to materialize binaries.
2. Install the SDK if needed: `pip3 install cloudinary`.
3. Verify files locally (no creds needed): `python3 scripts/restore-cloudinary.py --dry-run`.
4. Check which assets are actually missing on Cloudinary:
   `python3 scripts/restore-cloudinary.py --verify-only`  (needs all three CLOUDINARY_* exported).
5. Restore (re-uploads with EXACT public_id, so DB references keep working):
   `python3 scripts/restore-cloudinary.py`  (type RESTORE to confirm).
6. Verify the live site and the Strapi media library.

## What NOT to do
- Never run `strapi transfer` / `strapi import` / `deploy:cloud` to "fix" this.
- Restoration uploads binaries; it never touches the database.

## Important: the orphan-not-destroy guarantee only protects DEPLOYED builds
The startup override (`api/src/index.ts`) that turns deletion into orphaning is only active
on a Strapi process running **this** codebase. The 2026-03-19 incident was a transfer with
**production** credentials, executed cloud-side. Therefore: the guarantee is real only once
this build is deployed to Strapi Cloud. Before trusting it, confirm the deployed Strapi Cloud
build logs `[safety] Cloudinary auto-delete disabled` on boot. In production the server is
configured to **refuse to start** if it cannot install the override (fail-closed).
