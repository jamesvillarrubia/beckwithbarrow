#!/usr/bin/env python3
"""
Restore Cloudinary Images from Local Backups

Uploads local image files to Cloudinary with the EXACT public_id that
Strapi expects, so all existing URLs and database references work
without any DB changes.

Usage:
  # Dry run (no uploads, just verify matches):
  python3 scripts/restore-cloudinary.py --dry-run

  # Actually upload:
  python3 scripts/restore-cloudinary.py

  # Upload a specific project only:
  python3 scripts/restore-cloudinary.py --project "Hillside Farmhouse"
"""

import json
import os
import sys
import argparse
import time

try:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api
except ImportError:
    print("ERROR: cloudinary package not installed. Run:")
    print("  pip3 install cloudinary")
    sys.exit(1)

# ── Configuration ─────────────────────────────────────────────────────
CLOUD_NAME = os.environ.get("CLOUDINARY_NAME")
API_KEY = os.environ.get("CLOUDINARY_KEY")
# API_SECRET must be provided via environment variable
API_SECRET = os.environ.get("CLOUDINARY_SECRET")

PLAN_FILE = os.path.join(
    os.path.dirname(__file__),
    "..", "api", "backups", "cloudinary-upload-plan.json"
)


def main():
    parser = argparse.ArgumentParser(description="Restore Cloudinary images")
    parser.add_argument("--dry-run", action="store_true", help="Verify matches without uploading")
    parser.add_argument("--project", type=str, help="Only restore a specific project")
    parser.add_argument("--verify-only", action="store_true", help="Check which images already exist on Cloudinary")
    args = parser.parse_args()

    # Any path that calls the Cloudinary API (verify-only AND upload) needs creds.
    # Only --dry-run is purely local (checks files on disk) and needs none.
    if not args.dry_run:
        missing_creds = []
        if not CLOUD_NAME:
            missing_creds.append("CLOUDINARY_NAME")
        if not API_KEY:
            missing_creds.append("CLOUDINARY_KEY")
        if not API_SECRET:
            missing_creds.append("CLOUDINARY_SECRET")
        if missing_creds:
            print(f"ERROR: Missing required environment variable(s): {', '.join(missing_creds)}")
            print("  export CLOUDINARY_NAME='your_cloud_name'")
            print("  export CLOUDINARY_KEY='your_api_key'")
            print("  export CLOUDINARY_SECRET='your_api_secret'")
            sys.exit(1)

    # Configure Cloudinary
    cloudinary.config(
        cloud_name=CLOUD_NAME,
        api_key=API_KEY,
        api_secret=API_SECRET,
        secure=True,
    )

    # Load upload plan
    plan_path = os.path.normpath(PLAN_FILE)
    if not os.path.exists(plan_path):
        print(f"ERROR: Upload plan not found at {plan_path}")
        print("Run the mapping script first.")
        sys.exit(1)

    with open(plan_path) as f:
        plan = json.load(f)

    matched = plan["matched"]
    unmatched = plan["unmatched"]

    if args.project:
        matched = [m for m in matched if m["project"] == args.project]
        print(f"Filtered to project '{args.project}': {len(matched)} images")

    print(f"Total images to restore: {len(matched)}")
    if unmatched:
        print(f"WARNING: {len(unmatched)} unmatched images will be skipped!")
    print()

    # ── Dry Run ───────────────────────────────────────────────────────
    if args.dry_run:
        print("=== DRY RUN — verifying file matches ===\n")
        missing_files = []
        for img in matched:
            path = img["local_path"]
            exists = os.path.exists(path)
            size = os.path.getsize(path) if exists else 0
            status = f"{size/1024:.0f}KB" if exists else "MISSING!"
            if not exists:
                missing_files.append(img)
            print(f"  {'OK' if exists else 'XX'} {img['public_id']:50s} {status:>8s}  ({img['project']})")

        print(f"\n{'='*60}")
        print(f"Files found: {len(matched) - len(missing_files)}/{len(matched)}")
        if missing_files:
            print(f"MISSING FILES: {len(missing_files)}")
            for m in missing_files:
                print(f"  - {m['local_path']}")
        else:
            print("All files verified. Ready to upload.")
        return

    # ── Verify Only ───────────────────────────────────────────────────
    if args.verify_only:
        print("=== Checking which images exist on Cloudinary ===\n")
        existing = 0
        missing = 0
        for img in matched:
            try:
                result = cloudinary.api.resource(img["public_id"])
                existing += 1
                print(f"  EXISTS  {img['public_id']}")
            except cloudinary.exceptions.NotFound:
                missing += 1
                print(f"  MISSING {img['public_id']}")
            except Exception as e:
                print(f"  ERROR   {img['public_id']}: {e}")
            time.sleep(0.1)  # Rate limit

        print(f"\nExisting: {existing}, Missing: {missing}")
        return

    # ── Upload ────────────────────────────────────────────────────────
    print("=== UPLOADING TO CLOUDINARY ===")
    print(f"Cloud: {CLOUD_NAME}")
    print(f"Images: {len(matched)}")
    print()

    confirm = input("Type 'RESTORE' to proceed: ")
    if confirm != "RESTORE":
        print("Aborted.")
        return

    print()
    success = 0
    failed = []
    skipped = 0

    for i, img in enumerate(matched, 1):
        public_id = img["public_id"]
        local_path = img["local_path"]

        if not os.path.exists(local_path):
            print(f"  [{i}/{len(matched)}] SKIP (file missing): {public_id}")
            failed.append({"image": img, "error": "local file missing"})
            continue

        try:
            # Check if already exists (skip if so)
            try:
                cloudinary.api.resource(public_id)
                print(f"  [{i}/{len(matched)}] SKIP (already exists): {public_id}")
                skipped += 1
                continue
            except cloudinary.exceptions.NotFound:
                pass  # Good, we need to upload it

            # Upload with exact public_id — NO folder, NO unique suffix
            result = cloudinary.uploader.upload(
                local_path,
                public_id=public_id,
                unique_filename=False,
                overwrite=True,
                resource_type="image",
                tags=["strapi", "restored"],
            )

            print(f"  [{i}/{len(matched)}] OK    {public_id} ({result.get('bytes', 0)/1024:.0f}KB)")
            success += 1

            # Rate limit: ~2 uploads/sec to stay within free tier limits
            time.sleep(0.5)

        except Exception as e:
            print(f"  [{i}/{len(matched)}] FAIL  {public_id}: {e}")
            failed.append({"image": img, "error": str(e)})

    # ── Summary ───────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"Uploaded:  {success}")
    print(f"Skipped:   {skipped}")
    print(f"Failed:    {len(failed)}")
    print(f"Total:     {len(matched)}")

    if failed:
        print("\nFailed uploads:")
        for f in failed:
            print(f"  {f['image']['public_id']}: {f['error']}")

        # Save failed list for retry
        with open(os.path.join(os.path.dirname(plan_path), "cloudinary-failed.json"), "w") as fout:
            json.dump(failed, fout, indent=2)
        print("\nFailed list saved to cloudinary-failed.json for retry.")


if __name__ == "__main__":
    main()
