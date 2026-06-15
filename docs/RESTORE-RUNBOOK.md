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
1. Pull the latest backup commit; run `git lfs pull` to materialize binaries.
2. Verify files locally: `python3 scripts/restore-cloudinary.py --dry-run`.
3. Check which assets are actually missing on Cloudinary:
   `CLOUDINARY_SECRET=... python3 scripts/restore-cloudinary.py --verify-only`.
4. Restore (re-uploads with EXACT public_id, so DB references keep working):
   `python3 scripts/restore-cloudinary.py`  (type RESTORE to confirm).
5. Verify the live site and the Strapi media library.

## What NOT to do
- Never run `strapi transfer` / `strapi import` / `deploy:cloud` to "fix" this.
- Restoration uploads binaries; it never touches the database.
