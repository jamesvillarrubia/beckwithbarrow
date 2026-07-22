# Backup Precondition — Confirmation Record

**Date:** 2026-07-22 · **Run:** [29947784136](https://github.com/jamesvillarrubia/beckwithbarrow/actions/runs/29947784136)
**Gates:** `reqts/pillar-2.5-cms-write-access.md` §0.1 — no CMS write capability ships or runs
until both backup halves work **and are confirmed**. Confirmation means a verified
restore-readiness check, not a green workflow tick.

**Verdict: PRECONDITION MET.** Both halves confirmed restore-ready.

## Half 1 — Content / DB

Built in PR #42 (`packages/cms-client`), read-only, token-free.

| Endpoint | Records | Bytes | Populate paths |
|---|---|---|---|
| about | 1 | 6,773 | 2 |
| approach | 1 | 2,409 | 1 |
| categories | 3 | 830 | 0 |
| connect | 1 | 311 | 0 |
| global | 1 | 591 | 0 |
| home | 1 | 410,217 | 6 |
| menu | 1 | 943 | 0 |
| press | 1 | 81,665 | 2 |
| press-articles | 9 | 80,422 | 1 |
| projects | 15 | 390,225 | 3 |

**10/10, none degraded.** Committed to `backups` at `90ae7c9`, under
`api/backups/content/2026-07-22T18-42-10Z/`.

Checks performed:
- Every file parses as valid JSON **read directly from the branch** (`git show origin/backups:...`),
  not from a local working copy.
- Byte counts in CI are **identical** to a local run — determinism holds across machines, not
  merely across runs on one machine.
- Nested relations captured (press → pressArticles → cover); regenerable Cloudinary `formats`
  stripped.
- Secret-leak guard clean.

## Half 2 — Cloudinary images

Existing `api/scripts/safe-backup.mjs`, unchanged by PR #42.

```
Strapi files: 0, Cloudinary assets: 203
Referenced: 0, Orphans: 203, Restorable in plan: 203, Unmatched: 0
Incremental: 0 to download, 203 already backed up (skipped)
```

- **203 assets, 203 restorable, 0 unmatched.**
- **0 downloaded** — the incremental fix (PR #19) held, so this run spent essentially no
  Cloudinary bandwidth. This is the specific failure mode that caused the July overage.
- "No Strapi token — CLOUDINARY-ONLY mode" is expected; there is no usable Strapi API token,
  so assets are backed up without record mapping. Every asset remains restorable.

### The check that actually matters

All 203 assets are stored as git-lfs pointers. A pointer proves nothing on its own — this repo
has already been bitten by pointers that were never smudged (PR #28). So one asset was restored
end-to-end:

```
asset:        api/backups/assets/agricola_001_79b9a5f78b_hmdvaj.jpg
pointer oid:  922456a385c100ddf402ad2552082ead4c49510c8637c19dd74a40a9d9c7d722
declared:     2,194,455 bytes
downloaded:   2,194,455 bytes
sha256:       922456a385c100ddf402ad2552082ead4c49510c8637c19dd74a40a9d9c7d722   ← matches
decodes as:   JPEG 5016x3840, Canon EOS 5D Mark III
```

The LFS batch API issued a download href, the bytes came back, and the hash matches the pointer
exactly. The binaries are genuinely retrievable, not just referenced.

## Limits of this confirmation

State them plainly so nobody over-reads it:

- **One asset was byte-verified, not all 203.** The other 202 were confirmed present and
  pointer-valid, and the LFS store answered for the one tested. A full sweep would cost ~830 MB
  of bandwidth, which is the exact thing the incremental fix exists to avoid.
- **No full restore was rehearsed.** Recovery remains humans-only and supervised per
  `docs/RESTORE-RUNBOOK.md`; this record establishes the *inputs* to a restore are sound.
- **Cloudinary-only mode** means no Strapi record↔asset mapping is captured. Restoring which
  entry used which image would lean on the content snapshots (half 1), which is precisely why
  both halves are required.

## What this unblocks

Spec §0.1 is satisfied, so implementation of the write path may begin. Still required before any
**live** write:

1. A Custom Strapi API token from James — create + update + publish enabled, **delete unchecked**
   — in `STRAPI_CMS_WRITE_TOKEN` (gitignored).
2. Live validation order per §0.5: a no-op write first (identical value to a low-stakes field),
   then the press reorder (#1/#2).
