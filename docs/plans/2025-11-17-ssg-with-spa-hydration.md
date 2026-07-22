# Convert Site to Static SSG with SPA Hydration

> **STATUS (re-checked 2026-07-22): NOT STARTED — but partly superseded. Do not execute as written.**
>
> Written 2025-11-17 and stranded on the (now deleted) `feature/static-ssg-with-spa` branch.
> Salvaged for the still-valid Phase 1 design. Re-scope before implementing:
>
> - **Phase 2 (automated rebuilds) is DONE, differently.** The Vercel deploy hook is now
>   created and managed declaratively by Pulumi (`infra/webhooks.ts`; read the URL with
>   `cd infra && pulumi stack output deployHookUrl --show-secrets`). Ignore the manual
>   "Vercel project settings → Git → Deploy Hooks" instructions in Phase 2 below. The only
>   outstanding piece is registering that URL as a Strapi webhook.
> - **Build-time data fetching already exists.** `frontend/scripts/generate-static-data.ts`
>   snapshots the prod API into `frontend/src/generated/static-data.json`, which seeds React
>   Query. So step 7's "fetch all projects at build time" is largely built — the gap is
>   *rendering HTML*, not *fetching data*. Reuse the snapshot instead of re-fetching.
> - **Per-page meta tags already ship** via react-helmet-async (PR #21). Prerendering would
>   make them visible to non-JS crawlers, which is the actual remaining SEO win.
> - **The build script is a live constraint.** `frontend/package.json` deliberately uses a
>   `generate-all` script rather than `prebuild`, because npm's `prebuild` lifecycle would
>   double-run the generator against the live Strapi API. Any new build step must preserve
>   that.
>
> Net: steps 1–6 and 8 are still the right shape; steps 7 and Phase 2 need rewriting.

## Overview

Transform the Vite React SPA into a static-first site that pre-renders HTML at build time for SEO, then hydrates into a full SPA. Content from Strapi will be fetched during build and embedded in the static HTML.

## Implementation Approach

### 1. Install SSR Dependencies

Add packages needed for server-side rendering and HTML generation:

- `react-dom/server` (already available)
- `cheerio` - for HTML manipulation
- `node-fetch` or use axios in Node context

```bash
pnpm add -D cheerio @types/cheerio
```

### 2. Create Build-Time Pre-render Script

Create `frontend/scripts/prerender.mjs` that will:

- Fetch all routes from Strapi (projects list to get slugs)
- Define static routes: `/`, `/about`, `/approach`, `/connect`, `/press`
- Use Vite's SSR build output to render React components server-side
- Generate HTML for each route with proper meta tags and embedded data
- Write HTML files to `dist/` directory

Key files to modify/create:

- `frontend/scripts/prerender.mjs` - main pre-render script
- `frontend/src/entry-server.tsx` - SSR entry point (renders app to string)
- `frontend/src/entry-client.tsx` - rename current `main.tsx`, handles hydration

### 3. Update Vite Configuration

Modify `frontend/vite.config.ts`:

- Add SSR build configuration
- Create two build outputs: client bundle and SSR bundle
- Configure proper entry points

### 4. Modify App for SSR Compatibility

Update `frontend/src/App.tsx`:

- Accept initial data as prop for SSR
- Skip React Query persistence during SSR
- Use dehydrated state for hydration

### 5. Update HTML Template

Modify `frontend/index.html`:

- Add placeholder comments for injecting SEO meta tags
- Add placeholder for initial state (`window.__INITIAL_DATA__`)
- Ensure script tags are correctly positioned for hydration

### 6. Update Build Scripts

Modify `frontend/package.json`:

- Update `build` script to run pre-rendering after Vite build
- Add `build:client` and `build:server` scripts

### 7. Handle Dynamic Routes

The pre-render script will:

- Fetch all projects from Strapi: `GET /api/projects`
- Extract slugs from project data
- Generate static HTML for each `/project/:slug` route

### 8. Configure Vercel for Static Output

Update `frontend/vercel.json`:

- Ensure proper routing for SPA fallback (for non-pre-rendered routes)
- Keep current API function for email

## Key Technical Details

**Data Flow:**

1. **Build time**: Fetch from Strapi → Render to HTML → Embed data in `window.__INITIAL_DATA__`
2. **Runtime**: React hydrates using `__INITIAL_DATA__` → SPA takes over → Future navigations use React Query as before

**SEO Benefits:**

- Search engines receive fully rendered HTML with content
- Meta tags (title, description, og:image) properly set per page
- No JavaScript required for initial content rendering

**Minimal Changes:**

- Existing components remain unchanged
- React Query continues to work for client-side navigation
- Only build process and entry points change

## Files to Create/Modify

**New files:**

- `frontend/scripts/prerender.mjs`
- `frontend/src/entry-server.tsx`
- `frontend/src/entry-client.tsx` (rename from `main.tsx`)

**Modified files:**

- `frontend/vite.config.ts` - add SSR config
- `frontend/src/App.tsx` - accept initial data prop
- `frontend/index.html` - add meta tag placeholders
- `frontend/package.json` - update build scripts
- `frontend/vercel.json` - ensure proper routing

## Trade-offs & Considerations

**Pros:**

- Excellent SEO - full HTML with content at load time
- Fast initial page load - no API call needed
- Works without JavaScript (progressive enhancement)
- Minimal code changes to existing components

**Cons:**

- Build time increases (must fetch all content from Strapi)
- Content updates require rebuild and redeploy
- Requires Strapi to be accessible during build (use production API)

**Alternative Considered:**

Using `vite-plugin-ssr` (Vike) would provide more features but requires significant refactoring of the routing structure. This approach is cleaner for your "minimal change" requirement.

## Phase 2: Automated Rebuilds (Post-SSG Implementation)

Once the SSG is working, set up automated content updates:

### Configure Vercel Deploy Hook

1. Go to Vercel project settings → Git → Deploy Hooks
2. Create new hook named "Strapi Content Update"
3. Copy the webhook URL (e.g., `https://api.vercel.com/v1/integrations/deploy/...`)

### Configure Strapi Webhooks

In Strapi admin panel (Settings → Webhooks):

1. Create webhook pointing to Vercel deploy hook URL
2. Trigger on events:
   - `entry.create`
   - `entry.update`
   - `entry.delete`
   - `entry.publish`
   - `entry.unpublish`
3. Select content types: Projects, Home, About, Approach, Connect, Press
4. Test the webhook to verify connection

### Testing the Flow

1. Update content in Strapi
2. Verify webhook fires (check Strapi webhook logs)
3. Verify Vercel rebuild starts (check Vercel dashboard)
4. Wait 2-3 minutes for build to complete
5. Confirm changes are live on site

**Result:** Content updates in Strapi automatically trigger rebuilds. Site updates within 2-3 minutes of publishing changes.

## Implementation Todos

- [ ] Install SSR dependencies (cheerio, types)
- [ ] Create SSR entry points (entry-server.tsx, entry-client.tsx)
- [ ] Update vite.config.ts with SSR build configuration
- [ ] Modify App.tsx to support SSR with initial data
- [ ] Create prerender.mjs script to generate static HTML
- [ ] Update index.html with meta tag placeholders
- [ ] Update package.json build scripts
- [ ] Test the static build and verify HTML output
- [ ] Configure Vercel deploy hooks (Phase 2)
- [ ] Configure Strapi webhooks (Phase 2)

