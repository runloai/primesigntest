# PrimeSign Code Audit

Date: 2026-06-27  
Repo reviewed: `runloai/primesigntest` at commit `673a471`

## 1. Code Review Summary

Overall code quality rating: **4.5 / 10**

The project has a useful amount of functionality already: a React/Vite public site, a large vanilla `admin.html`, configurable services, portfolio, hero, about, reviews, contact details, and multiple image-upload surfaces. The weak point is that the system is still more of a prototype than a production CMS. The admin panel stores large base64/WebP data URLs inside `config.json`, has no real authentication, no durable publish API in the repo, and very little automated verification.

The biggest architectural issue is that the main client ask, **add/remove/edit images on the site**, is spread across many separate ad hoc flows instead of one reusable image manager. That makes regressions likely: service gallery images, service hero images, service portfolio images, portfolio items, hero background, about images, and advantage images all behave slightly differently.

Critical issues found:

- **Save & Publish is not Netlify-ready.** `admin.html` posts to `http://host:9998/publish`, `/.netlify/functions/publish`, and `/api/publish`, but there is no `netlify.toml`, no Netlify function, and no GitHub commit workflow in the repo. On Netlify this will fail until those files and env vars exist.
- **Admin auth is not security.** Login is hardcoded and stored as `localStorage` boolean. Anyone with `admin.html` and browser devtools can bypass it.
- **Uploaded images are saved as data URLs in JSON.** This works for small demos, but `config.json` can balloon quickly, slowing every visitor and risking failed saves/deploys.
- **Crop/edit is incomplete.** Crop is wired for hero, portfolio items, and regular service gallery images, but not for service hero images, service portfolio images, about images, advantage images, logo, or newly uploaded images before placement.
- **Dynamic categories are not truly synchronized.** The public Arsenal categories are rebuilt from `services`, not from `serviceCategories`, so empty categories created in admin will not show on the Arsenal tabs. Navbar uses `serviceCategories`, so navbar and Arsenal can disagree.
- **XSS risk from admin-controlled HTML.** `dangerouslySetInnerHTML` is used for hero headline and working hours. The admin UI also builds many strings with `innerHTML`.
- **No reproducible install.** There is no lockfile. The reviewed environment also lacked `npm`, so I could not complete a local build in this pass.

Code smells / technical debt:

- `admin.html` is about 5,800 lines and owns routing, state, image processing, config merge, save/publish, modals, toasts, and every editor screen.
- Public site config types are mostly `any`, so schema drift is easy.
- There is duplicated config loading logic across `home.tsx`, `Navbar.tsx`, `Footer.tsx`, `QuoteModal.tsx`, and `FloatingWhatsApp.tsx`.
- Cache-busting appends `Date.now()` to many image URLs. This defeats browser caching, especially for portfolio and service images.
- `dist/` is committed. That can be okay for an EC2 static server, but for Netlify/GitHub deployment it creates drift between source and build output.

## 2. Bug Report

### Confirmed Bugs

1. **Netlify publish endpoint is missing**

   Evidence: `admin.html` `publishConfig()` posts to candidate endpoints, including `/.netlify/functions/publish`, but no `netlify/functions/publish.*` file exists.

   Impact: Admin changes save only to browser `localStorage`; visitors will not reliably see updates after deployment to Netlify.

2. **Arsenal tabs ignore empty admin categories**

   Evidence: `home.tsx` builds categories from `services` via `buildServiceCategoriesFromServices()`. It does not preserve `config.serviceCategories` entries with zero services.

   Impact: Admin can create a category that appears in the navbar but not in the Arsenal section until at least one service is assigned.

3. **Advantage 4-grid images are not actually wired to admin**

   Evidence: public site reads `adminConfig?.advantage?.gridImages`, but admin edits `config.advantage.images` and publishes `advantageImages`. Current `config.json` has `advantage.images`, not `advantage.gridImages`.

   Impact: The public 4-image advantage grid falls back to hardcoded images. The admin "Advantage" image editor is really controlling the six benefit items, not a separate 4-image grid.

4. **Crop button cannot crop service images unless `openCropper()` finds the service image**

   Evidence: `openCropper('service', ..., 'serviceId-index')` has a placeholder comment under `type === 'service'` and does not assign `imageUrl`. `applyCrop()` supports saving service crops, but opening the cropper has no service image lookup.

   Impact: Service gallery crop can show "No image to crop" even though `applyCrop()` later has save logic.

5. **Image crop is unavailable for several client-visible image surfaces**

   Missing crop support:

   - service hero images
   - service portfolio images
   - about 4-grid images
   - advantage benefit images
   - logo
   - image immediately after upload before saving

6. **Image uploads have inconsistent size validation**

   Hero upload checks a 10MB limit; service, portfolio, about, advantage, logo uploads do not consistently check size before `FileReader` and canvas processing.

7. **Publish stores large base64 images in config**

   Every uploaded image is converted to a data URL and stored directly in the JSON payload. This can exceed serverless request limits and makes `/config.json` expensive for every visitor.

8. **Hardcoded admin credentials conflict with the live credentials used during testing**

   Context says `admin/Primesign@2021`; live prompt used `ADMIN` and another password. The code accepts both variants, but this is fragile and not documented in a safe config location.

### Potential Bugs / Edge Cases

- `Math.max(...config.services.map(s => s.id), 0)` can produce `NaN` if any service has a nonnumeric `id`.
- Category IDs are displayed as admin-editable strings and one current category is `my NEW-category`, which violates the stated lowercase-dash URL rule.
- Cropping data URLs from another origin can taint canvas if URL-based images are not CORS-safe.
- `showToast()` injects `message` via `innerHTML`; error text or user-controlled labels can become HTML.
- `loadFromServer()` merges local changes over server config, which can resurrect stale local drafts after a deploy.
- Public site and admin use different category labels and fallbacks, so labels/descriptions can drift.
- Portfolio category options are hardcoded and do not reflect admin categories.
- There is no conflict handling if two admins edit from different browsers.

## 3. Image Management Audit

The client's main ask is image management: add, remove, change, crop/edit, and see those image changes on the public site. Here is the current state.

| Surface | Add/Change | Remove | Reorder | Crop/Edit | Public Site Uses It? | Notes |
|---|---:|---:|---:|---:|---:|---|
| Hero background | Yes | Yes | N/A | Yes | Yes | Best-supported image flow. |
| Service hero image | Yes | Yes | N/A | No | Yes | Needs crop button and `openCropper` support. |
| Service gallery images | Yes | Yes | Yes | Intended, but likely broken | Yes, detail modal/gallery | `applyCrop` saves it, but `openCropper` does not load the source image. |
| Service portfolio images | Yes | Yes | Yes | No | Yes, portfolio section | Important because these feed public work gallery. |
| Portfolio gallery items | Yes | Yes | Yes | Yes | Yes | Strongest gallery flow. |
| Portfolio "pick from services" | Yes | No direct edit before adding | N/A | No | Yes | Duplicates data URL/path into portfolio. |
| About 4-grid images | Yes | Yes | Yes | No | Yes | Needs crop and labels. |
| Advantage benefit images | Yes | Yes | Yes | No | Partially | Public site uses them as 6 benefit icons/images. |
| Advantage 4-grid images | No real admin editor found | No | No | No | Public expects `advantage.gridImages` | Missing feature. |
| Logo image | Yes | Yes | N/A | No | Yes | Needs size validation and crop/fit option. |

### Image UX Recommendations

Build one reusable admin image manager and reuse it everywhere. Each image slot should support:

- Upload from file
- Paste image URL
- Preview before save
- Crop with preset ratios: free, 1:1, 4:3, 16:9, hero wide
- Quality/resize controls
- Replace
- Remove
- Optional label/alt text
- Reorder when the surface is a gallery
- Clear success/failure message
- Save state indicator that says whether it is local-only or published

Recommended internal model:

```json
{
  "url": "/images/generated/file.webp",
  "label": "Storefront LED sign",
  "alt": "LED sign installed at storefront",
  "width": 1600,
  "height": 1200,
  "kind": "portfolio",
  "updatedAt": "2026-06-27T12:00:00.000Z"
}
```

Avoid storing new uploads as long-term data URLs. Use Netlify Blob storage, Cloudinary, S3, or a GitHub-content commit flow that writes image files to `/public/uploads/...` and stores only file paths in `config.json`.

### Image Acceptance Tests For The Next Agent

The next agent should not say "done" until these pass manually in the browser:

1. Add a new service gallery image, save/publish, hard refresh public site, open that service, and see the image.
2. Crop a service gallery image and verify the cropped version appears in admin and public detail modal.
3. Add/change/delete a service hero image and verify the Arsenal card thumbnail changes.
4. Add/change/delete a service portfolio image and verify the public Work Gallery changes.
5. Add/change/delete/reorder the four About images and verify the public About grid changes.
6. Add/change/delete the six Advantage benefit images/labels and verify public Advantage list changes.
7. Add/change/delete the four Advantage grid images. This requires implementing `advantage.gridImages` in admin first.
8. Add a new portfolio image, set it featured, crop it, publish, and verify the featured public gallery image.
9. Upload a very large image and verify the admin rejects or compresses it predictably.
10. Open the site in a fresh/private browser with empty localStorage and verify published images still load.

## 4. Netlify Deployment Guide

### `netlify.toml`

Create this at repo root:

```toml
[build]
  command = "npm ci && npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/publish"
  to = "/.netlify/functions/publish"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

If `admin.html` must be reachable at `/admin.html`, make sure Vite copies it to `dist`. It is currently present in `dist`, but the build script only explicitly copies `public/config.json`, and this repo does not currently have a `public/` folder. Fix the build script before relying on it.

### Netlify Function: `netlify/functions/publish.js`

This is a minimal GitHub commit-based function. It updates `config.json` in the repository. For real production, add stricter auth, schema validation, rate limits, and payload-size checks.

```js
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const adminToken = process.env.ADMIN_PUBLISH_TOKEN;

  if (!token || !owner || !repo || !adminToken) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing environment variables" }) };
  }

  const providedToken = event.headers["x-admin-token"];
  if (providedToken !== adminToken) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const api = "https://api.github.com";
  const fileUrl = `${api}/repos/${owner}/${repo}/contents/config.json?ref=${branch}`;

  const currentResp = await fetch(fileUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    }
  });

  if (!currentResp.ok) {
    return { statusCode: currentResp.status, body: JSON.stringify({ error: "Could not read config.json" }) };
  }

  const current = await currentResp.json();
  const content = Buffer.from(JSON.stringify(payload, null, 2) + "\n", "utf8").toString("base64");

  const updateResp = await fetch(`${api}/repos/${owner}/${repo}/contents/config.json`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Update site config ${new Date().toISOString()}`,
      content,
      sha: current.sha,
      branch
    })
  });

  if (!updateResp.ok) {
    const text = await updateResp.text();
    return { statusCode: updateResp.status, body: JSON.stringify({ error: "GitHub update failed", detail: text }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      services: Array.isArray(payload.services) ? payload.services.length : 0
    })
  };
}
```

Admin-side change needed: send a secret publish token header to the function. Do not hardcode that token into public `admin.html`; if admin remains static, you need a real login/session layer or Netlify Identity.

### Environment Variables

Set these in Netlify:

- `GITHUB_TOKEN`: fine-scoped token with contents read/write for this repo
- `GITHUB_OWNER`: `runloai`
- `GITHUB_REPO`: `primesigntest`
- `GITHUB_BRANCH`: `main`
- `ADMIN_PUBLISH_TOKEN`: random long secret used server-side

### GitHub Actions

Netlify normally auto-deploys from GitHub commits, so a GitHub Actions workflow is optional. If you still want CI:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
```

## 5. Recommendations

### Refactoring

1. Split `admin.html` into modules:
   - `admin/config-store.js`
   - `admin/image-manager.js`
   - `admin/modal-manager.js`
   - `admin/services-editor.js`
   - `admin/portfolio-editor.js`
   - `admin/site-settings-editor.js`

2. Define a shared config schema with Zod or TypeScript and validate:
   - on admin load
   - before publish
   - inside Netlify function
   - inside public site config loader

3. Create one `useSiteConfig()` hook for React so `Navbar`, `Footer`, `Home`, `QuoteModal`, and WhatsApp use the same cached config.

4. Replace `innerHTML` render strings in admin with small DOM helpers or a lightweight component approach.

5. Move image upload/crop/compress into a single utility:

```js
async function processImage(fileOrUrl, {
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85,
  crop = null,
  output = "image/webp"
}) {}
```

### Security

- Replace localStorage auth with real authentication before giving this to a client.
- Do not expose publish capability from a static page without server-side auth.
- Sanitize HTML fields or remove HTML support entirely. Use newline-to-`<br>` rendering instead of raw HTML.
- Validate external image URLs and reject `javascript:` or unsafe schemes.
- Add a Content Security Policy once scripts are split out of inline HTML.

### Performance

- Stop appending `Date.now()` to every image URL. Use a config version (`_publishedAt` or `_version`) when needed.
- Store uploaded images as files, not base64 in config JSON.
- Add width/height metadata and responsive images for public galleries.
- Lazy-load non-hero images, but keep hero image optimized and preloadable.
- Remove committed `dist/` if Netlify builds from source.

### UX

- Admin save indicator should distinguish:
  - unsaved local changes
  - saved locally
  - publishing
  - published successfully
  - publish failed

- Image editor should show:
  - original dimensions
  - output dimensions
  - estimated file size
  - crop ratio selected
  - where this image appears on the public site

- Category editor should enforce lowercase-dash IDs and show a warning before changing IDs used by services.

## 6. Reliability Assessment

Production-ready: **No, not yet.**

What would break under load:

- `config.json` can become huge because image data is embedded directly.
- Every visitor fetches config and many images with cache-busting timestamps.
- Publish endpoint is missing in this repo for Netlify.
- No locking/version check means concurrent edits can overwrite each other.
- Browser localStorage can preserve stale drafts and override newly published config in preview.

Single points of failure:

- One static JSON file is the whole CMS database.
- One giant `admin.html` controls all admin behavior.
- GitHub commit API would become the write database if Netlify publish is implemented.
- Uploaded images embedded in config make the config file itself the asset store.

Data loss scenarios:

- Admin clears browser storage before publishing.
- Two admins publish in close succession.
- GitHub API update fails after local save, leaving admin thinking some changes are saved.
- Oversized image payload fails in Netlify function.
- Invalid config JSON commit breaks public site rendering.

## 7. Quick Wins

Top 5 minimal improvements:

1. Fix service crop opening by loading the service image URL in `openCropper('service')`.
2. Add crop buttons for service hero, service portfolio, about, advantage, and logo images.
3. Add `netlify.toml` and a real `netlify/functions/publish.js`.
4. Make public Arsenal categories come from `serviceCategories`, then attach services under them, including empty categories.
5. Add upload size validation and consistent error messages to every image upload handler.

Next 5:

1. Add a lockfile and CI build check.
2. Remove data URLs from long-term config storage.
3. Replace raw `dangerouslySetInnerHTML` with sanitized/newline-rendered text.
4. Add an admin "Preview public site" button that opens a fresh preview state after save.
5. Add a manual smoke-test checklist into the repo, especially for all image flows.

## 8. Instructions For The Next Agent

Do not treat the context file as truth. Use the code and browser behavior as truth.

Priority order:

1. Make all client-facing image add/remove/change flows work.
2. Make crop/edit available everywhere an image appears publicly.
3. Make Save & Publish actually persist to a deployed environment.
4. Make navbar, Arsenal tabs, and admin categories use one shared source.
5. Then clean up security, performance, and refactoring.

Do not mark image work done until this browser checklist passes:

- Fresh login to admin
- Add image
- Replace image
- Crop image
- Remove image
- Reorder gallery images
- Save/publish
- Hard refresh public site
- Verify in a private browser with empty localStorage

The dangerous false positive is: "the button clicked and no console error happened." That is not a pass. A pass means the user-visible image changed in the correct public section after publish.

## 9. Deeper Whole-App Findings

This section was added after a second pass through the actual source, not just `CONTEXT_FOR_CODEX.md`.

### Source-of-Truth Problems

1. **`serviceCategories` duplicates `services`**

   Current `config.json` stores full service objects twice:

   - top-level `services`
   - nested `serviceCategories[*].items`

   The first nested item is byte-for-byte the same as the first top-level service. This is dangerous because the public site does not consistently use the nested category `items`. If an admin or future script updates only one copy, the UI will drift.

   Recommendation: `serviceCategories` should contain category metadata only:

   ```json
   { "id": "sign-boards", "label": "SIGN BOARDS", "icon": "...", "description": "..." }
   ```

   Services should live only in `services`, with `service.category` pointing to the category ID.

2. **The public Arsenal ignores real category metadata**

   `home.tsx` rebuilds categories from services in `buildServiceCategoriesFromServices()`. It hardcodes display metadata for only:

   - `sign-boards`
   - `promotional`
   - `digital`

   New categories fall back to `cat.toUpperCase()` and `"Professional ${cat} services"`, ignoring the admin label/icon/description.

   Result: admin can create "My Premium Category" with a description, but the public Arsenal may show a crude generated label/description instead.

3. **Empty categories are inconsistent**

   The current `config.json` has empty categories:

   - `tst`
   - `my NEW-category`
   - `debug-test`

   Navbar renders categories from `serviceCategories`, so these can appear in navigation. Public Arsenal tabs are rebuilt from services, so empty categories disappear there.

4. **Invalid category IDs are already in production config**

   Current config includes `my NEW-category`, which violates the admin's own rule: lowercase letters, numbers, and dashes only. This happened because existing category IDs are readonly in edit mode and old/bad values remain.

   Recommendation: add a one-time config migration that normalizes category IDs and rewrites all affected `service.category` fields.

### Public Site Bugs / Odd Decisions

1. **Mobile service dropdown can select the wrong service**

   `MobileDropdownSection.handleItemClick()` receives only `href`, then finds the item with:

   ```ts
   const item = items.find(i => i.href === href);
   ```

   Every service item uses the same `href` (`/#services`), so this usually selects the first service in that dropdown, not the tapped item. Desktop passes the actual item object correctly; mobile should too.

   Fix: change the click handler to pass `item` directly:

   ```tsx
   onClick={(e) => handleItemClick(e, item)}
   ```

2. **Public contact/map settings are split**

   Home contact map uses `settings.mapsUrl` as an iframe `src`. Contact page uses `contact.mapsUrl` as a normal link. Admin exposes both `contact.mapsUrl` and `settings.mapsUrl`. They can drift and they expect different URL formats.

   Recommendation: use two explicit fields:

   - `contact.mapsLinkUrl`
   - `contact.mapsEmbedUrl`

3. **Portfolio filter code exists but does nothing**

   `portfolioFilter`, `portfolioCategories`, `filteredFeaturedItem`, and `filteredNonFeaturedItems` exist, but the filter state is never updated and the filtered arrays are just the original arrays. This is dead UI logic and makes future agents think filtering is already implemented.

4. **Hero carousel state is unused**

   `heroIndex` rotates every 4.5 seconds, but the hero uses only `adminConfig?.hero?.bgImage`. `HERO_SLIDES` and `heroIndex` are currently dead behavior.

5. **Public service image handling can corrupt image objects**

   `displayServices` maps `s.images` with:

   ```ts
   .map((img: string) => cacheBustUrl(img))
   ```

   But config service images are usually objects like `{ url, label }`. In some paths this becomes `"[object Object]?t=..."`. Other paths call `extractImageUrl()` correctly. This inconsistency should be fixed everywhere.

6. **Working hours is raw HTML**

   `workingHours` is rendered with `dangerouslySetInnerHTML` in Navbar, Home, and Contact. This is an XSS footgun for a field edited in admin.

   Recommendation: store working hours as lines/array or plain text and render line breaks safely.

### Admin Panel UX / Reliability Issues

1. **Save button can imply success when publish failed**

   `saveConfig()` first saves to localStorage and marks saved, then tries `publishConfig()`. If publish fails, the admin can still feel like changes are saved because the local save succeeded.

   Recommendation: split status labels:

   - Draft saved locally
   - Publishing...
   - Published to website
   - Publish failed

2. **Local drafts always overlay server config**

   On admin load, server `config.json` is fetched, then localStorage draft is merged on top. This can resurrect stale browser-only changes after a real deploy.

   Recommendation: store `_publishedAt` and `_draftUpdatedAt`; warn before overlaying an older or divergent draft.

3. **Category editor says changes auto-reflect but they do not fully**

   Admin copy says category changes are automatically reflected in navbar and Arsenal. In reality:

   - navbar uses `serviceCategories`
   - Arsenal uses categories rebuilt from `services`
   - empty categories do not show in Arsenal
   - category descriptions/icons do not flow into Arsenal

4. **Service hero image UI says "Shown on service cards" but admin cards ignore it**

   In admin `renderServices()`, the collapsed service card thumbnail uses `service.images[0]`, not `service.heroImage`. Public Arsenal cards do prefer `heroImage`. So admin preview and public site can disagree.

5. **Service portfolio images have no crop/edit**

   These images feed the public Work Gallery, so they are important client-facing images. The UI supports add, label, move, delete, but not crop/replace per image.

6. **About and Advantage image editing is too hidden**

   About image change is triggered by clicking the image or a small "Change" button. Advantage image "Icon" button says it saves an icon preference, but the code only shows a toast and does not store anything.

7. **The admin uses prompts for real editing**

   Portfolio labels and advantage icons use `prompt()`. This is brittle, ugly, and inconsistent with the rest of the admin UI.

8. **Inline HTML string rendering is fragile**

   Admin builds large HTML strings with many inline `onclick`s. One quote in a label or URL can break markup or create an injection issue if escaping is missed.

### Build / Deployment Problems

1. **Build script references missing `public/config.json`**

   `package.json` has:

   ```json
   "build": "vite build && cp -f public/config.json dist/config.json"
   ```

   But the repo has no `public/` directory. That copy step will fail unless a deploy environment creates `public/config.json` first.

2. **No lockfile**

   There is no `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`. That makes build output non-reproducible.

3. **`dist/` is committed**

   Source and build artifacts can drift. If Netlify builds from source, committed `dist/` should be removed. If EC2 serves `dist/`, add explicit release steps.

4. **No Netlify function exists**

   `publishConfig()` expects `/.netlify/functions/publish`, but the repo has no `netlify/functions` directory.

### What I Would Tell The Agent To Fix First

1. **Make the config schema sane**

   Remove nested `serviceCategories[*].items`; keep services only in `services`. Add a migration script.

2. **Create a shared config loader**

   One `src/lib/site-config.ts` should load and normalize config. Navbar, Footer, Home, Contact, WhatsApp, and QuoteModal should all use it.

3. **Fix category sync**

   Public Arsenal should use `serviceCategories` for tabs and metadata, then attach matching services under each category. Empty categories can show an empty state or be intentionally hidden with one explicit rule.

4. **Fix image manager**

   Build one admin image component/function used by hero, services, portfolio, about, advantage, and logo. It must support replace, remove, crop, preview, alt/label, and save status.

5. **Fix publish**

   Add `netlify.toml`, `netlify/functions/publish.js`, real authentication, and payload validation. Until then, rename the button from "Save & Publish" to "Save Draft Locally" when publish endpoint is unavailable.

6. **Fix mobile nav service selection**

   Pass the clicked `item` object into the mobile handler instead of rediscovering it by shared `href`.

7. **Remove raw HTML fields**

   Replace `workingHours` HTML with an array of lines. Replace hero headline HTML with text plus an explicit line-break model.

### Revised Production Readiness

With the deeper pass, production readiness is **3 / 10** for a client-editable site.

The public static website is close enough for a brochure site if config is hand-edited by a developer. The admin panel is not ready as a reliable client CMS until image management and publish persistence are fixed.

## 10. Hard Instruction For The Next Agent

Stop patching individual UI bugs first. The current problem is not one modal, one button, or one image field. The project has a **source-of-truth problem**.

The final rule must be:

> One config schema. One source of truth. Every public section reads from it. Admin edits that same schema. Netlify publishes that schema reliably.

Right now the app has too many partial truths:

- `services`
- `serviceCategories`
- `serviceCategories[*].items`
- `about.images`
- `aboutImages`
- `advantage.images`
- `advantageImages`
- possible/future `advantage.gridImages`
- hardcoded fallback services/categories in React
- localStorage preview overriding published config
- admin labels that claim something reflects on the site when it only half does

That is why repeated iteration keeps creating new inconsistencies. The code currently allows inconsistency.

### Required Data Model Behavior

1. Categories are stored only in `config.serviceCategories`.
2. Services are stored only in `config.services`.
3. A service belongs to a category via `service.categoryId` or one consistently named field. Prefer `categoryId`.
4. Navbar must render categories from `config.serviceCategories`.
5. Arsenal tabs must render categories from `config.serviceCategories`.
6. Services under each Arsenal tab must come from `config.services.filter(service => service.categoryId === category.id)`.
7. Empty categories must have one explicit behavior: either show with an empty state everywhere or hide everywhere. Do not show in navbar but hide in Arsenal.
8. Remove `serviceCategories[*].items` entirely or migrate/ignore it. Do not keep duplicated services there.
9. Admin category add/edit/delete must update the shared category list and all affected services.
10. Public site must not use hardcoded category/service fallbacks once config loads successfully.

### Required Image Model Behavior

Define one image object shape and use it everywhere.

```ts
type SiteImage = {
  url: string;
  label?: string;
  alt?: string;
  width?: number;
  height?: number;
};
```

Use this shape for:

- hero background
- service hero image
- service gallery images
- service portfolio images
- portfolio gallery
- about images
- advantage images
- logo

Every public image editable in admin must support:

- add
- replace/change
- remove
- preview
- crop/edit when the public site crops or frames it
- label/alt text where relevant
- clear save/publish status

Do not store permanent uploads as base64 in `config.json`. Store uploaded files separately and keep URLs in config. Suitable options:

- Cloudinary
- S3/R2
- Netlify Blobs
- GitHub committed files under `public/uploads`

### Suggested Strict Schema

```ts
type SiteConfig = {
  serviceCategories: ServiceCategory[];
  services: Service[];
  hero: HeroConfig;
  portfolio: PortfolioItem[];
  about: AboutConfig;
  advantage: AdvantageConfig;
  contact: ContactConfig;
  settings: SettingsConfig;
};

type ServiceCategory = {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  order?: number;
};

type Service = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  badge?: "popular" | "new" | "";
  heroImage?: SiteImage;
  galleryImages: SiteImage[];
  portfolioImages: SiteImage[];
};

type SiteImage = {
  url: string;
  label?: string;
  alt?: string;
  width?: number;
  height?: number;
};
```

The public site should do boring, reliable rendering:

```ts
const categories = config.serviceCategories;

const servicesByCategory = categories.map(category => ({
  category,
  services: config.services.filter(service => service.categoryId === category.id),
}));
```

No nested duplicated `items`. No guessing category from service name. No hardcoded `sign-boards`, `promotional`, `digital` logic except as default seed data.

### Required Netlify Behavior

1. Add `netlify.toml`.
2. Add `netlify/functions/publish.js` or equivalent.
3. The publish function must validate config before writing.
4. The publish function must commit `config.json` to GitHub or store config/assets in a real backend.
5. Add real authentication. `localStorage` auth is not enough.
6. After publish, the public site in a private browser with empty localStorage must show the change.
7. Uploaded images must not depend on the admin browser's localStorage.

Recommended Netlify flow:

1. GitHub repo is connected to Netlify.
2. Netlify builds from source.
3. Admin calls `/.netlify/functions/publish`.
4. Function authenticates the admin request.
5. Function validates the config schema.
6. Function writes config/images to durable storage.
7. If using GitHub commits, Netlify auto-deploys after the commit.
8. Public site fetches the published config and image URLs.

### Do Not Mark Done Until This Passes

The next agent must verify in a real browser:

1. Add a category in admin.
2. See it in the navbar.
3. See it in the Arsenal behavior according to the chosen empty-category rule.
4. Add a service under that category.
5. See that service under the correct Arsenal tab.
6. See that service in the correct navbar dropdown.
7. Add, replace, crop, and remove images for every public image surface.
8. Save/publish.
9. Hard refresh the public site.
10. Open a private browser with empty localStorage and confirm the published changes still appear.

The dangerous false positive remains:

> "The button clicked and no console error happened."

That is not a pass. A pass means the user-visible public site changes correctly after publish.

## 11. Implementation Recipe For The Next Agent

This is the "how to actually do it" section. Follow this order. Do not start by redesigning the UI. First make the data model reliable, then wire UI to that model.

### Phase 1: Add A Shared Schema And Normalizer

Create:

- `src/lib/site-config.ts`
- `src/lib/site-config-schema.ts` or `src/lib/site-config.ts` with schema/types together

This file should export:

```ts
export type SiteImage = {
  url: string;
  label?: string;
  alt?: string;
  width?: number;
  height?: number;
};

export type ServiceCategory = {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  order?: number;
};

export type Service = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  badge?: "popular" | "new" | "";
  heroImage?: SiteImage;
  galleryImages: SiteImage[];
  portfolioImages: SiteImage[];
};

export type SiteConfig = {
  serviceCategories: ServiceCategory[];
  services: Service[];
  hero: {
    badge?: string;
    headline: string;
    subtitle: string;
    backgroundImage?: SiteImage;
    stats?: { value: string; label: string }[];
  };
  portfolio: {
    id: string;
    image: SiteImage;
    categoryId?: string;
    featured?: boolean;
    order?: number;
  }[];
  about: {
    title?: string;
    subtitle?: string;
    description?: string;
    description2?: string;
    images: SiteImage[];
  };
  advantage: {
    title?: string;
    subtitle?: string;
    benefits: { label: string; icon?: string; image?: SiteImage }[];
    gridImages: SiteImage[];
  };
  contact: Record<string, unknown>;
  settings: Record<string, unknown>;
  footer?: Record<string, unknown>;
  meta?: {
    version?: string;
    publishedAt?: string;
  };
};
```

Also export:

```ts
export function normalizeSiteConfig(raw: any): SiteConfig;
export async function loadSiteConfig(options?: { includeLocalDraft?: boolean }): Promise<SiteConfig>;
export function getServicesByCategory(config: SiteConfig): Array<{ category: ServiceCategory; services: Service[] }>;
export function imageUrl(image?: SiteImage | string | null, fallback?: string): string;
```

`normalizeSiteConfig(raw)` must handle the current legacy config:

- Convert `service.category` to `service.categoryId`.
- Convert `service.desc` to `service.description`.
- Convert `service.images` to `service.galleryImages`.
- Convert `service.heroImage` string to `heroImage: { url }`.
- Convert `service.portfolioImages` to normalized image objects.
- Convert `portfolio[*].url` to `portfolio[*].image.url`.
- Convert `hero.bgImage` to `hero.backgroundImage.url`.
- Convert `aboutImages` or `about.images` to `about.images`.
- Convert `advantageImages` or `advantage.images` to `advantage.benefits`.
- Create `advantage.gridImages` if missing, using the current hardcoded fallback images or a new admin-editable array.
- Strip/ignore `serviceCategories[*].items`.
- Normalize category IDs to lowercase dash IDs and update affected services.

Important: keep backward compatibility while migrating. The public site should consume the normalized shape even if the JSON file is still legacy for one deploy.

### Phase 2: Replace Public Rendering Logic

In `src/pages/home.tsx`, remove category/service guessing:

Do not use:

- `buildServiceCategoriesFromServices()`
- hardcoded `CATEGORY_DETAILS`
- `getCategoryFromServiceName()` for real config data
- `serviceCategories[*].items`

Use this instead:

```ts
const config = await loadSiteConfig();
const groups = getServicesByCategory(config);
```

Render Arsenal tabs from `groups`:

```tsx
{groups.map(({ category }) => (
  <button key={category.id} onClick={() => setActiveServiceCategory(category.id)}>
    {category.label}
  </button>
))}
```

Render services:

```ts
const activeGroup =
  groups.find(group => group.category.id === activeServiceCategory) ?? groups[0];

const activeServices = activeGroup?.services ?? [];
```

Then cards use:

```ts
const cardImage = imageUrl(service.heroImage, imageUrl(service.galleryImages[0], "/images/led/1.webp"));
```

Service detail modal uses:

```ts
const detailImages = service.galleryImages.length
  ? service.galleryImages
  : service.heroImage
    ? [service.heroImage]
    : [];
```

Portfolio should combine:

```ts
const portfolioItems = [
  ...config.portfolio,
  ...config.services.flatMap(service =>
    service.portfolioImages.map((image, index) => ({
      id: `${service.id}-portfolio-${index}`,
      image,
      categoryId: service.categoryId,
      featured: false,
      order: 1000 + index,
    }))
  ),
];
```

Do not mutate data while rendering. Do not append `Date.now()` to every image. Use `config.meta.publishedAt` as a cache key only when necessary:

```ts
function withVersion(url: string, version?: string) {
  if (!version || url.startsWith("data:")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}
```

### Phase 3: Fix Navbar With The Same Config

In `src/components/layout/Navbar.tsx`, stop building categories separately. Use the shared loader/normalizer.

Desktop and mobile should both receive the full item object when clicked.

Correct mobile click pattern:

```tsx
{items.map(item => (
  <a
    key={item.serviceId ?? item.name}
    href={item.href}
    onClick={(event) => handleItemClick(event, item)}
  >
    {item.name}
  </a>
))}
```

Handler:

```ts
function handleItemClick(event: React.MouseEvent, item: DropdownMenuItem) {
  event.preventDefault();
  onItemClick();

  if (item.filter) {
    sessionStorage.setItem("arsenal-category", item.filter);
    window.dispatchEvent(new CustomEvent("arsenal-filter", { detail: item.filter }));
  }

  setLocation("/#services");

  if (item.serviceId) {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("scroll-to-service", {
        detail: { category: item.filter, serviceId: item.serviceId },
      }));
    }, 150);
  }
}
```

Do not rediscover clicked items by `href`; many items share `/#services`.

### Phase 4: Add A Migration Script

Create:

- `scripts/migrate-config.mjs`

It should:

1. Read `config.json`.
2. Normalize it using the same migration logic.
3. Write a clean `config.json`.
4. Preserve a backup as `config.backup.json`.

Expected cleanup:

- Remove `serviceCategories[*].items`.
- Rename bad category IDs.
- Update services to use `categoryId`.
- Convert all images to `SiteImage`.
- Add missing `advantage.gridImages`.
- Remove duplicate top-level `aboutImages` and `advantageImages` after public/admin code no longer needs them.

Run this script once before major admin refactor. Commit the clean config.

### Phase 5: Admin Image Manager

Do not keep writing custom image handlers for each section.

Inside `admin.html`, either create a reusable set of vanilla helpers or, better, split admin into JS modules. Minimum acceptable vanilla helper:

```js
function renderImageManager({
  container,
  image,
  label,
  aspect,
  onChange,
  onRemove,
  onCrop,
  allowUrl = true,
}) {
  // Renders preview, upload button, URL input, crop button, remove button.
}
```

Create a shared image processing API:

```js
async function readImageFile(file) {}
async function processImageToWebP(source, options) {}
function openImageCropper({ image, aspect, onSave }) {}
```

Every image surface should use this same flow:

1. User chooses upload or URL.
2. Admin shows preview.
3. If public surface crops/framed image, offer crop before final save.
4. Save normalized image object `{ url, label, alt, width, height }`.
5. Mark config dirty.

Required admin image surfaces:

- Hero background
- Service hero image
- Service gallery images
- Service portfolio images
- Portfolio gallery items
- About images
- Advantage benefit images
- Advantage grid images
- Logo

For galleries, use helper actions:

```js
function addImage(listPath, image) {}
function replaceImage(listPath, index, image) {}
function removeImage(listPath, index) {}
function moveImage(listPath, index, direction) {}
```

Do not implement separate add/remove/move/crop logic for each gallery.

### Phase 6: Admin Category And Service Editors

Category editor:

- ID must be generated from label by default.
- ID must be lowercase dash only.
- If editing an existing category ID, show a warning because services point to it.
- On category ID change, update every service with that `categoryId`.
- On delete, either block deletion when services exist or ask where to move them. Do not silently move to `"other"` unless `"other"` is a real category.

Service editor:

- Must choose category from `serviceCategories`.
- Must save `categoryId`.
- Must show public-preview hints:
  - hero image appears on Arsenal cards
  - gallery images appear in service detail
  - portfolio images appear in Work Gallery

### Phase 7: Netlify Publish Implementation

Create:

- `netlify.toml`
- `netlify/functions/publish.js`
- optionally `netlify/functions/upload-image.js` if not using Cloudinary/S3 directly

`netlify.toml`:

```toml
[build]
  command = "npm ci && npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/publish"
  to = "/.netlify/functions/publish"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Fix `package.json` first. Current build script references missing `public/config.json`. Use one of these:

Option A, keep `config.json` in root and copy it:

```json
"build": "vite build && cp -f config.json dist/config.json && cp -f admin.html dist/admin.html"
```

Option B, move public assets to `public/` properly:

```json
"build": "vite build"
```

For the publish function:

1. Authenticate request.
2. Parse JSON.
3. Validate against schema.
4. Read current `config.json` SHA from GitHub.
5. Write new `config.json` to GitHub.
6. Return success only after GitHub accepts the commit.

Do not let admin show "Published" until the function returns success.

### Phase 8: Asset Storage

Avoid long-term base64 image storage in config.

Best practical options:

1. **Cloudinary**: easiest image upload/crop/transforms for this kind of client site.
2. **S3/R2**: reliable but more setup.
3. **GitHub committed uploads**: okay for small sites, but GitHub repo can grow quickly.
4. **Netlify Blobs**: possible, but make sure public URLs and deploy behavior are understood.

If using GitHub uploads:

- function receives image file as base64 or multipart
- writes it to `public/uploads/YYYY/MM/filename.webp`
- stores `/uploads/YYYY/MM/filename.webp` in config
- commits both image and config changes

Do not put large `data:image/...` strings into `config.json` except as a temporary local preview before upload.

### Phase 9: Verification Tests To Add

Add at least a manual smoke-test doc:

- `TESTING_CHECKLIST.md`

Better: add Playwright tests:

- `tests/admin-image-flow.spec.ts`
- `tests/category-sync.spec.ts`

Minimum manual tests:

1. Add category.
2. Add service under category.
3. Confirm navbar category appears.
4. Confirm Arsenal tab appears.
5. Confirm service appears under correct tab.
6. Change service category.
7. Confirm navbar and Arsenal both update.
8. Add service hero image.
9. Confirm Arsenal card image updates.
10. Add service gallery image.
11. Confirm service detail modal includes it.
12. Crop service gallery image.
13. Confirm cropped version appears publicly.
14. Add service portfolio image.
15. Confirm Work Gallery includes it.
16. Replace About image.
17. Confirm About grid updates.
18. Replace Advantage grid image.
19. Confirm Advantage grid updates.
20. Publish.
21. Open private browser.
22. Confirm all published changes still exist without localStorage.

### Phase 10: What Not To Do

Do not:

- Patch only the currently visible broken button.
- Add more duplicated arrays to config.
- Add another hardcoded fallback category list.
- Keep guessing category from service name.
- Store permanent uploaded images as base64 JSON.
- Say Netlify is done without a real publish function.
- Keep `localStorage` as the only persistence layer.
- Mark done without checking private browser public output.
