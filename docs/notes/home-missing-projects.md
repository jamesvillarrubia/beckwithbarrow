# Investigation — Ardis punch-list #7 (two missing Home projects)

**Date:** 2026-06-16 · **Method:** read-only GET to the public prod API
(`https://striking-ball-b079f8c4b0.strapiapp.com/api/projects`, same endpoint the live site uses).

## Ask
Ardis wants two projects added to the Home page (`home.projects` relation):
- **Byers-Dunne poolhouse** — ref: https://www.karenbeckwith.com/2020-williamstown-pool-house
- **blockeight** — ref: https://www.karenbeckwith.com/blockeight

## Finding
**Neither project exists in Strapi yet.** There are **15** Project records; none match
poolhouse / williamstown / byers / dunne / blockeight:

```
Garden Home, Lakeside Landing, Hearth House, Beach Cottage, Historic Lenox Home,
Modern Lake House, Cutwater House, Meadow House, Summer Hill House, Woodland Retreat,
The Crafted Home, Hillside Farmhouse, Artist's Bungalow, Coastal Hideaway, The Stable
```

## Consequence
This is **not** a simple "add to the home relation." Two **new Project records must be
created first** (title, description, cover + gallery images via Cloudinary), then added to
the `home.projects` ordered relation. Both steps are CMS/admin actions in Strapi — **out of
scope for an unattended local run** (creating prod content is an external action).

## Recommended action (for James/Ardis)
1. In Strapi admin, create Project "Byers-Dunne Poolhouse" (or chosen title) — copy
   title/description from the KBC reference page; upload the photos Ardis has on hand.
2. Create Project "Block Eight" (slug `blockeight`) likewise.
3. Add both to **Home Page → projects** in the desired order.
4. (Optional, agent-assist) If you want, the agent can draft the title/description text from
   the two KBC reference pages for you to paste — that part is doable, the record creation +
   image upload is yours to do in the admin (or explicitly delegate).

No code change is involved; this is purely CMS content creation.
