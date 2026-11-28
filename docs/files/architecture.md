# Architecture

DevChronicleApp is the Angular 22 client for **DevChronicle**, a markdown-driven software journal. Runtime data lives in Cloud Firestore. The browser compiles Markdown to HTML. Deployment targets the Firebase Spark plan: Authentication (Google), Firestore, and Hosting only—no Cloud Functions, Cloud Storage, or paid add-ons.

Related repositories: [DevChronicle](https://github.com/HugoFernandoColmenares/DevChronicle) (legacy orchestration) and [DevChronicleApi](https://github.com/HugoFernandoColmenares/DevChronicleApi) (legacy Rust/SQLite API). Neither is the runtime source of truth anymore. `public/content/*.md` remains the **import** source for seeding Firestore.

## Runtime topology

```
Browser (Angular SPA)
  ├─ Firebase Auth  → Google sign-in (Studio only)
  └─ Cloud Firestore
       ├─ entries/{slug}              metadata card
       ├─ entries/{slug}/body/current { markdown }
       ├─ challenges/{slug}           coding drill (prompt / hint / solution)
       ├─ admins/{uid}                Studio author gate (console/Admin SDK only)
       └─ editors/{uid}               API/MCP publisher gate (console/Admin SDK only)

Firebase Hosting → dist/DevChronicle (SPA rewrite to index.html)
tools/devchronicle-mcp → local stdio MCP → Firestore REST API
```

Local development uses the Auth (9099), Firestore (8080), and Emulator UI (4000) under project id `demo-devchronicle`. Production placeholder project id is `devchronicle-hugo`.

## Application structure

| Path                                         | Responsibility                                                                   |
| :------------------------------------------- | :------------------------------------------------------------------------------- |
| `src/app/core/firebase`                      | App, Auth, and Firestore factories; emulator connects                            |
| `src/app/core/models`                        | `ArticleMetadata`, entry/challenge normalization, `JournalError`                 |
| `src/app/core/services`                      | Auth, journal, Markdown+DOMPurify, subset Highlight.js, SEO, focus, ErrorHandler |
| `src/app/core/guards`                        | `adminGuard`, `unsavedChangesGuard`                                              |
| `src/app/core/rxjs`                          | `retryTransient` for offline reads                                               |
| `src/app/features/landing`                   | Featured + recent + grid catalog with tag filters                                |
| `src/app/features/articles`                  | Paginated archive, search, tags                                                  |
| `src/app/features/challenges`                | Firestore-backed coding drills (prompt / hint / solution)                        |
| `src/app/features/article-viewer`            | Reader, 404/503 states                                                           |
| `src/app/features/not-found`                 | Global wildcard 404                                                              |
| `src/app/features/admin`                     | Login, denied, article/challenge lists and editors, studio chrome                |
| `src/app/shared`                             | Header, footer, cards, tags, skeleton, copy button, offline medal                |
| `public/content`                             | Markdown import corpus                                                           |
| `scripts/`                                   | Env writer, site meta, importer, challenge migration, emulator seed              |
| `tools/devchronicle-mcp`                     | Local stdio MCP server for drafting and publishing                               |
| `firestore.rules` / `firestore.indexes.json` | Security + catalog composite index                                               |
| `docs/files`                                 | Design, architecture, audit, ops notes                                           |

The shell (`App`) always mounts the site header/footer and a `<main>` outlet. Change detection is zoneless (`provideZonelessChangeDetection`). Feature routes are lazy-loaded.

## Routes

| Path                              | Component                       | Notes                                   |
| :-------------------------------- | :------------------------------ | :-------------------------------------- |
| `/`                               | `LandingComponent`              | Public catalog                          |
| `/articles`                       | `ArticlesComponent`             | Archive; `/articulos` redirects here    |
| `/challenges`                     | `ChallengesComponent`           | Practice catalog; `/desafios` redirects |
| `/challenges/:slug`               | `ChallengeDetailComponent`      | Prompt, hint, solution reveals          |
| `/post/:slug`                     | `ArticleViewerComponent`        | Reader; invalid slug → not-found UI     |
| `/admin/login`                    | `AdminLoginComponent`           | Google popup                            |
| `/admin/denied`                   | `AdminDeniedComponent`          | Signed in, missing `admins/{uid}`       |
| `/admin`                          | `AdminListComponent`            | `adminGuard`                            |
| `/admin/new`, `/admin/edit/:slug` | `AdminEditorComponent`          | `adminGuard` + `unsavedChangesGuard`    |
| `/admin/challenges`               | `AdminChallengeListComponent`   | `adminGuard`                            |
| `/admin/challenges/new`           | `AdminChallengeEditorComponent` | `adminGuard` + `unsavedChangesGuard`    |
| `/admin/challenges/edit/:slug`    | `AdminChallengeEditorComponent` | `adminGuard` + `unsavedChangesGuard`    |
| `/404`, `**`                      | `NotFoundComponent`             | Soft 404 (HTTP 200 via Hosting rewrite) |

## Auth and authorization

1. Studio uses Google only (`signInWithPopup` + `select_account`).
2. `AuthService` tracks `user` and `isAdmin` signals. Admin = existence of `admins/{uid}` (no role field).
3. `adminGuard`: anonymous → `/admin/login`; non-admin → `/admin/denied`.
4. Clients cannot create/list/update/delete `admins` or `editors` documents (rules deny). Production admins are created in the Firebase console; emulators use `npm run seed:admin` (`local-admin` / `admin@devchronicle.test`).
5. `editors/{uid}` is the limited API/MCP role: it can create and update drafts, but cannot delete, publish, or change roles while `editorStatusAllowed()` stays in draft-only mode. The emulator seed creates `publicador@devchronicle.test`.

## Data model

**`entries/{slug}`** (document id = slug): `slug`, `title`, `summary`, `tags[]`, `category`, `series`, `author`, `status` (`draft`|`published`), `publishedAt` (timestamp or `null` for drafts), `updatedAt`, `readingTimeMinutes`.

**`entries/{slug}/body/current`**: `{ markdown }` only, max &lt; 200_000 characters. Split so the catalog query does not download essay bodies and so a long note can use the 1 MiB document cap alone.

**`challenges/{slug}`**: `slug`, `title`, `summary`, `difficulty` (`warmup`|`practice`|`stretch`), `tags[]`, `language`, `prompt`, `hint`, `solution`, optional `articleSlug`/`articleTitle`, `order`, `status`, `publishedAt`, `updatedAt`. One document; drills are short enough that no body subcollection is needed.

**Rules (summary):** public read of published entries, bodies, and challenges; drafts invisible to the public (surfaced as not-found); writes require `isAdmin()` or `editors/{uid}` and the matching `validEntry`/`validChallenge`; body id must be `current`. Editors are limited to drafts by `editorStatusAllowed()`.

**Indexes:** `entries (status, publishedAt)` for the public catalog; `challenges (status, order)` for the public drill list; `challenges (status, articleSlug, order)` for article-scoped drills.

Article saves use a transaction (metadata + body) and compare `updatedAt` for optimistic concurrency. Challenge saves use the same transaction/conflict pattern. Deletes remove both article documents; challenge deletes remove one document.

## Rendering pipeline

1. Catalog: `onSnapshot` query `status == published` ordered by `publishedAt`.
2. Reader: watch entry + `body/current`, then `MarkdownParserService.compile` (`marked` → `DOMPurify.sanitize`) → `[innerHTML]` via ` DomSanitizer.bypassSecurityTrustHtml`.
3. Syntax highlighting is lazy-loaded (`highlight.js` chunk) and copy buttons are attached to fences.
4. Public reads wrap the stream with `retryTransient` (2 attempts, 400 ms then 800 ms) for errors classified as `offline`.

## SEO and hosting

`SeoService` sets title, description, robots, canonical, Open Graph, Twitter, article meta, and JSON-LD per view. Studio is `noindex` (client + Hosting `X-Robots-Tag`). `robots.txt` and `sitemap.xml` are generated at build from `NG_APP_SITE_URL`. The sitemap unions repository Markdown slugs with published Firestore entries and challenges; a failed REST read falls back to repository content so the build stays green. The workflow also runs on a daily schedule to refresh the sitemap without a push. Social crawlers do not execute the SPA, so per-article share cards need prerender/SSR (documented debt).

## Build and verification

| Command                                                | Role                                                                    |
| :----------------------------------------------------- | :---------------------------------------------------------------------- |
| `npm start`                                            | `ng serve` against emulators (`environment.development.ts`)             |
| `npm run build`                                        | Write production env + site meta, then `ng build` → `dist/DevChronicle` |
| `npm test`                                             | Angular Vitest unit suite (~43 tests)                                   |
| `npm run test:import`                                  | Node tests for the Markdown importer                                    |
| `npm run test:rules`                                   | Firestore rules via emulator + Vitest                                   |
| `npm run lint`                                         | Prettier check                                                          |
| `npm run emulators` / `import:emulator` / `seed:admin` | Local stack                                                             |
| `npm run migrate:challenges:emulator`                  | Create the bundled drills in the Firestore emulator (add `-- --apply`)  |
| `cd tools/devchronicle-mcp && npm install`             | Install the local MCP server dependencies                               |

CI: `.github/workflows/firebase-hosting.yml` builds on `main` and deploys Hosting when secrets are present.

## Constraints (by design)

- Spark-only: no Cloud Functions, no managed backups, no App Check yet.
- `admins` (Studio) and `editors` (API/MCP) are binary allow-lists; no per-field roles.
- Challenges keep a bundled offline fallback until an offline snapshot covers them.
- Soft 404s remain HTTP 200 under the Hosting SPA rewrite.
