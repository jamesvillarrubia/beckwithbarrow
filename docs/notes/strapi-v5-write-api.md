# Strapi v5 write API — research notes (for Pillar 2.5)

Researched 2026-06-17 from docs.strapi.io (v5). Underpins `reqts/pillar-2.5-cms-write-access.md`.

## API tokens (the scoped no-delete token)
- Token types: **read-only**, **full-access**, **custom**.
- **Custom** tokens are granular **per content-type, per action** (find, findOne, create,
  update, delete, publish — individual checkboxes). So we CAN grant **create + update + publish
  and leave delete OFF** — exactly what Pillar 2.5 needs.
- Auth header: `Authorization: bearer <token>`.
- Token value is shown once at creation UNLESS `admin.secrets.encryptionKey` is set. This repo
  HAS `ENCRYPTION_KEY` in `api/.env`, so on prod the token stays viewable in the admin — good
  (can re-copy if lost). Store it in env, gitignored, never committed.

## REST shapes (v5 uses `documentId`, not numeric id, in write URLs)

| Op | Method + URL | Body |
|---|---|---|
| Create (collection) | `POST /api/:pluralApiId` | `{ "data": { ...fields } }` |
| Update (collection) | `PUT /api/:pluralApiId/:documentId` | `{ "data": { ...partial } }` (send `null` to clear a field) |
| Update (single type) | `PUT /api/:singularApiId` | `{ "data": { ...partial } }` |
| Read draft/published | `GET ...?status=draft` or `?status=published` | (default = published) |

**Content-type API ids here:**
- Collections (pluralApiId): `projects`, `press-articles`, `categories`.
- Single types (singularApiId): `home`, `approach`, `about`, `connect`, `press`, `global`, `menu`.

## Reordering an ordered relation (the Press #1/#2 and Home #7 use case)
Update the PARENT document, replacing the relation in the desired order with `set` (longhand):
```
PUT /api/press/   (press is a single type holding pressArticles)
{ "data": { "pressArticles": { "set": [
  { "documentId": "<article-A>" },
  { "documentId": "<article-B>" }
] } } }
```
- `set` replaces all relations **in the order specified** (simplest for a full reorder).
- `connect` + `position: { before | after | start | end }` inserts at a position (for nudges).
- Do NOT connect the same relation twice (validation error).
- For home: `PUT /api/home` with `{ data: { projects: { set: [...] } } }`.

## Publish — VERIFY at implementation (open item)
Draft & Publish is ON for: `project`, `press-article`, `home`, and one other single type;
OFF for `connect`, `about`, `global`, `menu` (writes to those are immediately live).
The exact publish-via-REST mechanism in v5 is not pinned down in the public docs from this pass.
Candidates to verify against LOCAL Strapi during implementation:
1. `?status=published` query param on the POST/PUT write (write straight to published).
2. Write draft, then a publish call (Document Service `publish`, or an admin/custom route).
3. A thin custom controller in the Strapi app exposing a safe `publish(documentId)` action.
The safe-write client must abstract "publish" behind one function so the chosen mechanism is
swappable without touching callers. Test the real behavior locally before any prod use.

## Implications for the design
- Reorder + create + update + publish are all expressible via the Content REST API with a
  custom token — no admin API needed, no delete capability granted.
- `documentId` (string) is the write key; the client must resolve title/slug → documentId via a
  read first.
- Media upload (additive) uses `POST /api/upload` (multipart) — separate from content writes.
