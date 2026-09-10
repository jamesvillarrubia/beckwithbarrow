# MISTAKES.md

## 2026-09-10: bootstrap query wiped the draft Home page's project relations on every boot

**What happened:** The admin Content Manager showed zero connected projects on the Home
single type. The public API still returned all 14, in order.

**Root cause:** `api/src/index.ts`'s `bootstrap()` runs an UPDATE on every Strapi boot that
repoints join-table rows from draft project ids to published project ids, meant to fix the
published Home row's relations. The query carried no `home_id` filter, so it also repointed
the draft Home row's own join entries. Strapi's admin Content Manager reads the draft row and
requires draft-status targets; once those entries pointed at published projects instead, the
draft-scoped relation lookup matched nothing and returned `projects: []`.

**Consequence:** Every Strapi Cloud restart re-broke the admin display, even after manually
reconnecting the projects, since the next boot repointed the freshly-added draft entries again.

**Prevention:** Any one-time or startup data-repair query against a Strapi 5 draft/publish
table must scope itself to the specific row(s) it's fixing (here: `homes.published_at IS NOT
NULL`), never to the whole table. Draft and published rows keep separate join-table entries;
an unscoped fix for one status silently corrupts the other.
