# Public finish: 404, metadata, and crawl

The catalog, reader, and Studio were already covered. This document describes the finish that turns the client into a publishable site: 404 page, per-view title and description, canonical, Open Graph, Twitter Cards, structured data, `robots.txt`, `sitemap.xml`, and the social image.

## Per-view metadata

`SeoService` (`src/app/core/services/seo.service.ts`) is the only writer of `<head>`. Each view calls `setPage()` in its constructor, or `setArticle()` once the reader has Firestore metadata.

- **Landing:** title, description, and `WebSite` JSON-LD.
- **Archive `/articles`:** title, description, and `CollectionPage` JSON-LD.
- **Reader `/post/:slug`:** title, description, `og:type=article`, dates, author, and `BlogPosting` JSON-LD.
- **404 and errors:** `noindex, nofollow` and no structured data.
- **Studio:** `noindex` from the client and from Hosting.

The service updates, without duplicates:

- `<title>`
- `meta[name=description]` and `meta[name=robots]`
- `link[rel=canonical]` from `environment.siteUrl`
- Open Graph and Twitter tags
- Article meta when type is `article`
- `<script type="application/ld+json">` with id `devchronicle-jsonld`

Fallback description and social image live in `environment.ts`. `scripts/write-environment.mjs` copies `NG_APP_SITE_URL` into the production environment, and `scripts/write-site-meta.mjs` generates `robots.txt` and `sitemap.xml` (including every `public/content/*.md` slug plus `/challenges`).

## SPA limits

Social crawlers (WhatsApp, X, Facebook, LinkedIn) **do not run JavaScript**. They see raw `index.html`, so the shared card is the site-wide one. Google does render the client and reads per-article metadata.

Per-article social previews would need prerender or a function that serves HTML per path. Neither is on the current Spark plan.

## 404 page

The wildcard route loads `NotFoundComponent` (`/404` reuses it). It sets `noindex`, offers archive and journal exits, and uses Civic Terminal tokens.

Hosting still returns HTTP 200 for unknown paths while `firebase.json` rewrites everything to `index.html`. True HTTP 404 needs SSR, prerender, or a function.

### Phase 2 decision (Spark)

Prerender/SSR and per-slug HTML via Cloud Functions remain **deferred**. The sitemap already lists content slugs at build time, and Google renders the SPA.

## robots.txt and sitemap.xml

- `robots.txt` allows the catalog, blocks `/admin`, `/admin/**`, `/articulos`, and `/desafios`, and declares the sitemap.
- `sitemap.xml` lists `/`, `/articles`, `/challenges`, and every content slug under `/post/...`.
- Hosting adds `X-Robots-Tag: noindex, nofollow` on `/admin` and `/admin/**`, plus `nosniff` and a strict referrer policy.

## Social image

`public/social/devchronicle-cover.png` (1200×630) is referenced from `index.html` and `SeoService`. Refresh it when the visual system changes if the card should match Civic Terminal Phase 3 tokens.

## Verification

1. `npm run build` and `npm test`.
2. Open `/`, `/articles`, `/post/<slug>`, `/post/no-existe`, and `/ruta-inexistente`.
3. Check `<title>`, description, canonical, `og:*`, and JSON-LD on each.
4. Confirm 404 and error views show `noindex`.
5. Share the home page and confirm the generic card.
