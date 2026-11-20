# DevChronicleApp — Product & Engineering Audit

**Product:** DevChronicle (Angular package `dev-chronicle`)  
**Domain:** Markdown-driven journal for architecture notes, Angular practice, and technical essays  
**Audit date:** 20 Nov 2026 (America/Bogota)  
**Environment audited:** `npm run emulators` + `import:emulator` + `seed:admin` + `npm start` at `http://127.0.0.1:4200/`  
**Evidence:** Screenshots in [`docs/screenshots/`](../screenshots/); architecture in [`architecture.md`](./architecture.md); design system in [`design.md`](./design.md)

This document ranks findings by severity. It does **not** implement fixes.

---

## Executive summary

The public reading surface works end-to-end against emulators: catalog, search, tags, pagination, reader with code copy, soft 404s, Google Studio auth, unsaved-change guards, and production `npm run build` all succeed. The main risks are (1) Firestore failures that present as an empty journal instead of a recoverable error, (2) HTML sanitizer CVEs on the Markdown → `[innerHTML]` path, (3) SEO limits of a pure SPA (soft 404s, thin sitemap, generic social previews), and (4) a visual identity that reads as a competent default kit rather than a hand-crafted field journal.

---

## Method

| Angle            | What was exercised                                                                                                                                                                                       |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regular user     | Landing, tag filters, archive search (hit + empty), article read + code copy, 404s, Studio login gate, mobile 390px                                                                                      |
| QA / engineering | Routing & redirects, admin / denied / list / editor, unsaved dialog, rules review, DOMPurify usage, SEO meta sampling, a11y spot checks, `npm test` / `lint` / `build`, `npm audit`, importer test drift |
| Design taste     | Tokens, typography, chrome, tag density, Studio vs public consistency, originality vs generic AI/default patterns                                                                                        |

Roles: **anonymous reader** and **single admin author** (`admins/{uid}`). There is no third role.

---

## Critical

### C1 — Sanitizer dependency CVEs on the HTML render path

- **Evidence:** `npm audit --omit=dev` reports multiple **DOMPurify** advisories (≤3.4.16), including DOM XSS classes (detached subtree handlers, template/reparse issues). Production path: `MarkdownParserService.compile` → `DOMPurify.sanitize` → `bypassSecurityTrustHtml` in the reader and Studio preview (`src/app/core/services/markdown-parser.service.ts`, `article-viewer.ts`, `admin-editor.ts`).
- **Why critical:** Published Markdown is the product. Any sanitizer bypass becomes stored XSS for every reader.
- **Screenshot / code:** Rendered article with HTML body — [`article-desktop.png`](../screenshots/article-desktop.png), [`article-code-desktop.png`](../screenshots/article-code-desktop.png).

### C2 — Firestore outage presented as an empty catalog

- **Evidence:** With Firestore requests forced to fail (`8080` aborted / HTTP 500), `/articles` and `/` rendered **“No entries are published yet.”** with **zero** “Try again” buttons and **no** “Journal offline” medal—after several seconds. Designed failure UI exists in `articles.html` / `landing.html` (`failed()` → alert + Try again) and is covered by unit tests, but the live failure mode observed did not flip `failed()`.
- **Why critical:** Readers (and the author) conclude the journal was wiped or unpublished; recovery affordance never appears. README verification step 7 assumes the opposite.
- **Screenshots:** [`articles-failure-as-empty-desktop.png`](../screenshots/articles-failure-as-empty-desktop.png), [`landing-retry-desktop.png`](../screenshots/landing-retry-desktop.png). Designed retry chrome (DOM using production classes when live path did not engage): [`articles-retry-desktop.png`](../screenshots/articles-retry-desktop.png).

---

## High

### H1 — Soft HTTP 200 for unknown URLs and missing posts

- **Evidence:** Hosting SPA rewrite serves `index.html` for all paths; client shows NotFound / “not published” UI with `noindex`, but status remains 200. Documented in Spanish ops notes and README.
- **Impact:** Crawlers and uptime monitors mis-classify missing URLs; link equity and monitoring suffer.
- **Screenshots:** [`not-found-desktop.png`](../screenshots/not-found-desktop.png), [`article-not-found-desktop.png`](../screenshots/article-not-found-desktop.png), [`not-found-mobile.png`](../screenshots/not-found-mobile.png).

### H2 — Sitemap omits every article slug

- **Evidence:** Generated `public/sitemap.xml` lists only `/` and `/articles`. Eleven published posts are invisible to sitemap consumers.
- **Impact:** Discovery of the core content graph depends entirely on crawl from the catalog HTML.

### H3 — Per-article Open Graph previews impossible without prerender

- **Evidence:** Live meta on `/post/welcome-to-devchronicle` is correct **after** JS (`BlogPosting` JSON-LD, canonical, description). Social crawlers see only `index.html` site-wide card (`acabado-publico.md`).
- **Impact:** Shares of individual essays look generic.

### H4 — No optimistic concurrency on Studio saves

- **Evidence:** `JournalService.save` batches `set` without reading/comparing `updatedAt`. Two tabs → silent last-write-wins. Called out in `robustez-mvp.md`.
- **Impact:** For a long Markdown essay, silent overwrite is data loss.

### H5 — Production dependency advisories beyond DOMPurify

- **Evidence:** `npm audit --omit=dev`: **@angular/router** DoS advisories (22.0.0–22.2.0; less severe without SSR but still unpatched in tree), **@grpc/grpc-js** via Firebase, **zod** transitive. Full tree reports 39 issues including criticals in dev tooling.
- **Impact:** Upgrade hygiene and supply-chain risk; Node engine warnings already show Firebase packages wanting Node ≥24 while the repo requires Node 22.

### H6 — Importer unit test out of date with the content corpus

- **Evidence:** `npm run test:import` fails: expected 7 slugs, catalog now has 11 (new tutorials under `public/content/`). Assertion is a hard-coded list in `tests/markdown-entry.test.mjs`.
- **Impact:** CI signal is red/noisy; regressions in the importer can hide behind an already-failing suite.

### H7 — Public nav exposes Studio to every visitor

- **Evidence:** Header always links Journal / Articles / **Studio** ([`landing-desktop.png`](../screenshots/landing-desktop.png)). Anonymous users hit a Google wall that explains `admins` internals ([`admin-login-desktop.png`](../screenshots/admin-login-desktop.png)).
- **Impact:** Confuses readers; leaks authoring surface; weakens first-run story (“is this my blog admin?”).

### H8 — Tag cloud dominates first viewport

- **Evidence:** Landing places a dense, bilingual chip wall above the featured entry ([`landing-desktop.png`](../screenshots/landing-desktop.png), [`landing-mobile.png`](../screenshots/landing-mobile.png)). Mobile especially pushes the featured card below the fold.
- **Impact:** Core content (the newest essay) loses discoverability to filter chrome.

---

## Medium

### M1 — Accessibility gaps vs WCAG-minded baselines

- **Evidence:** Spot check on `/`: `<main>` present but **no `id`**, **no skip link**; no route-change focus management found. Kickers/muted text and accent-washed pills may fail contrast in places (`.pill--on` uses 16% accent wash + `#0369a1`). SweetAlert discard dialog is custom-styled ([`admin-unsaved-changes.png`](../screenshots/admin-unsaved-changes.png))—focus trap/labeling not covered by automated a11y CI (none configured).
- **Impact:** Keyboard and screen-reader users work harder; regressions undetected.

### M2 — Bundle weight: syntax highlighter lazy chunk ~976 kB raw

- **Evidence:** Production build lists lazy `index` chunk **975.62 kB** (gzip ~244 kB)—highlight.js path. Initial total ~776 kB raw / ~208 kB transfer. Budgets exist (`900kB` / `1.2MB` initial) but the lazy highlight payload is large for a reading site.
- **Impact:** First code fence visit pays a heavy download on slower networks.

### M3 — English UI / Spanish content friction

- **Evidence:** UI strings English; titles, summaries, and many tags Spanish ([`articles-desktop.png`](../screenshots/articles-desktop.png)). Duplicate conceptual tags (`architecture` / `arquitectura`).
- **Impact:** Search and filters feel inconsistent; tag cloud noise increases.

### M4 — Empty and error copy are easy to confuse

- **Evidence:** Empty catalog (“No entries are published yet.”) vs failed load vs “No articles match these filters.” ([`articles-empty-search-desktop.png`](../screenshots/articles-empty-search-desktop.png)). Combined with C2, empty becomes the wrong default metaphor for failure.

### M5 — Denied state is sparse; login explains security internals

- **Evidence:** [`admin-denied-desktop.png`](../screenshots/admin-denied-desktop.png), [`admin-login-desktop.png`](../screenshots/admin-login-desktop.png). Login mentions `admins` collection by name—accurate for the author, odd for anyone else who clicks Studio.

### M6 — No E2E suite; rules tests collide with a running emulator

- **Evidence:** No Playwright/Cypress in repo. `npm run test:rules` failed here with “port 8080 taken” while `npm run emulators` was already up—docs assume exclusive emulator use.
- **Impact:** Auth popup, Hosting headers, and true offline medal flows are manual-only.

### M7 — App Check, export, and automated backup absent

- **Evidence:** Spark MVP backlog in `robustez-mvp.md`. Client can be scripted against public reads; author has no one-click export from Studio.

### M8 — README local verification counts are stale

- **Evidence:** README still says “7 published entries” / “Showing 1–6 of 7”; emulator import now yields **11** entries ([`articles-desktop.png`](../screenshots/articles-desktop.png) “Showing 1–6 of 11”).

---

## Low

### L1 — Brand mark is a flat accent square

- **Evidence:** Header/footer mark across all shots. Memorable name, forgettable glyph.

### L2 — Inter + sky `#0ea5e9` + `#fafafa` reads as default kit

- **Evidence:** Token set in `styles.css`; landing/archive screenshots. Overlaps common AI/Tailwind starter aesthetics (see Design taste).

### L3 — Studio active nav state easy to miss

- **Evidence:** On list/editor screens, slate-on-slate active styles are subtle ([`admin-list-desktop.png`](../screenshots/admin-list-desktop.png)).

### L4 — Angular CLI analytics flag written locally

- **Evidence:** `angular.json` gained `"analytics": false` during this audit’s first `ng serve`. Harmless but noisy in PRs if unintended.

### L5 — Legacy content still describes `index.json` as runtime

- **Evidence:** Welcome entry preview text still narrates file-based publishing ([`admin-editor.png`](../screenshots/admin-editor.png) preview pane) while runtime is Firestore—confusing for new readers of that essay.

### L6 — `packageManager` pins npm 12; environment had npm 10.9.9

- **Evidence:** Install succeeded with engine warnings. Minor contributor friction.

---

## Angle A — Regular user

**First impression:** Calm, readable, professional. The line “Field notes for working software.” is clear. The slate featured card signals “this is a reading product.”

**Friction:**

1. Tag wall before content (especially mobile).
2. Studio in primary nav invites a dead-end Google prompt.
3. Mixed languages without explanation.
4. Search lives only on `/articles`—landing has filters but no text search.
5. If Firestore blips, the site can look abandoned (C2).

**What works:** Archive search (`nestjs` → one hit — [`articles-search-desktop.png`](../screenshots/articles-search-desktop.png)); empty search clear CTA ([`articles-empty-search-desktop.png`](../screenshots/articles-empty-search-desktop.png)); reader column and copy-on-fence; 404s offer two exits; unsaved guard protects the author ([`admin-unsaved-changes.png`](../screenshots/admin-unsaved-changes.png)).

---

## Angle B — QA & engineering checklist

| Area                 | Status              | Notes                                                                               |
| :------------------- | :------------------ | :---------------------------------------------------------------------------------- |
| Routing / deep links | OK                  | `/articulos` → `/articles`; wildcard 404; invalid slug treated as not published     |
| Auth / RBAC          | OK for MVP          | Google + `admins/{uid}`; denied page works; clients cannot write `admins`           |
| Rules                | Strong              | Field validation, body size, published-only public reads; `test:rules` suite exists |
| Validation           | OK                  | Slug pattern before fetch; reactive form validators in editor                       |
| Editor robustness    | Good                | Dirty tracking, `beforeunload`, SweetAlert confirm                                  |
| Concurrency          | Gap                 | H4                                                                                  |
| Search               | Good                | Accent folding in archive; unit coverage                                            |
| SEO / metadata       | Partial             | Client meta solid; H1–H3 limit production sharing/crawl                             |
| a11y                 | Partial             | M1                                                                                  |
| Performance          | Mixed               | Initial OK-ish; highlight chunk heavy (M2)                                          |
| Console / network    | Clean on happy path | No page errors observed on public routes during capture                             |
| Tests                | Mixed               | 43/43 unit pass; `test:import` fail (H6); rules need free Firestore port            |
| Dependencies         | At risk             | C1, H5                                                                              |
| Build / deploy       | OK                  | `npm run build` succeeded; Hosting workflow present                                 |

---

## Angle C — Design taste verdict

The UI is **competent and coherent**, not broken: slate chrome, canvas page, sky accent, Inter + JetBrains Mono, featured slate card. It does **not** yet feel hand-crafted for a personal engineering chronicle. Concrete tells:

- Inter + `#0ea5e9` on `#fafafa` is a stock “modern SaaS/docs” combo.
- Logo is a literal accent square.
- Tag pills and card grids look like a component-library catalog, not a notebook.
- No photographic or illustrative anchor—atmosphere is flat fill only.
- SweetAlert question-mark modal is generic third-party chrome on an otherwise custom shell.

**Suggested art direction:** “Field notebook under a desk lamp”—warm paper or cool blueprint grain (not cream cliché #F4F1EA + terracotta), a display face with ink character (avoid Inter), monospace for brand numerals/kickers, one full-bleed texture or photograph of a real desk/terminal behind the landing intro, and a landing composition that is **brand + one line + one featured entry** without a pill stadium in the first viewport. Keep slate code fences; they are the strongest distinctive element today.

---

## Screenshot index

| File                                                 | State                        |
| :--------------------------------------------------- | :--------------------------- |
| `landing-desktop.png`                                | Home, desktop                |
| `landing-mobile.png`                                 | Home, mobile                 |
| `landing-tag-filter-desktop.png`                     | Tag filter active            |
| `landing-series.png` / `landing-earlier-desktop.png` | Recent / earlier sections    |
| `landing-retry-desktop.png`                          | Failure presented as empty   |
| `articles-desktop.png`                               | Archive                      |
| `articles-mobile.png`                                | Archive mobile               |
| `articles-search-desktop.png`                        | Search `nestjs`              |
| `articles-empty-search-desktop.png`                  | No matches                   |
| `articles-failure-as-empty-desktop.png`              | Outage → empty copy          |
| `articles-retry-desktop.png`                         | Designed Try again UI        |
| `article-desktop.png` / `article-mobile.png`         | Reader                       |
| `article-code-desktop.png`                           | Code fence                   |
| `post-*.png`                                         | Sample posts / code / mobile |
| `article-not-found-desktop.png`                      | Missing slug                 |
| `not-found-desktop.png` / `not-found-mobile.png`     | Wildcard 404                 |
| `admin-login-desktop.png` / `admin-login-mobile.png` | Unauthenticated Studio       |
| `admin-auth-emulator-widget.png`                     | Auth emulator account picker |
| `admin-denied-desktop.png`                           | Non-author                   |
| `admin-list-desktop.png`                             | Entry list                   |
| `admin-editor.png` / `admin-editor-new-desktop.png`  | Edit / create                |
| `admin-unsaved-changes.png`                          | Discard confirm              |

---

## Verification commands run

| Command                | Result                                                   |
| :--------------------- | :------------------------------------------------------- |
| `npm test`             | Pass — 43 tests                                          |
| `npm run lint`         | Pass                                                     |
| `npm run build`        | Pass → `dist/DevChronicle`                               |
| `npm run test:import`  | Fail — stale slug list (H6)                              |
| `npm run test:rules`   | Could not start second Firestore emulator (port in use)  |
| `npm audit --omit=dev` | 7 production-tree issues (incl. DOMPurify, router, grpc) |
