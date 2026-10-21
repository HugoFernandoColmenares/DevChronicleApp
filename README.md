# DevChronicleApp

DevChronicleApp is the frontend of DevChronicle, a markdown journal. It is an Angular 22 application. The client requests published entries from `/api/v1`, compiles Markdown in the browser, and renders a Civic Terminal reading surface: a light canvas, slate chrome, and dark code fences. Inter and JetBrains Mono are served from `public/fonts`.

When the API does not respond, the same routes read the local catalog in `public/content`. The orchestration repository is [DevChronicle](https://github.com/HugoFernandoColmenares/DevChronicle). The API is [DevChronicleApi](https://github.com/HugoFernandoColmenares/DevChronicleApi).

## Surfaces

The landing page lists the latest entry as a featured slate card, then the remaining articles in a responsive grid. Tags filter the catalog without leaving the page.

![DevChronicle landing page](docs/screenshots/landing-desktop.png)

The article route (`/post/:slug`) keeps the body within 70 characters, lazy-loads syntax highlighting, and offers a copy control on each fence.

![Article reading view](docs/screenshots/article-desktop.png)

Narrow viewports stack the grid and wrap the display heading. The captures below were taken while the API was unreachable, so they show the local catalog.

![Landing page on a narrow viewport](docs/screenshots/landing-mobile.png)

## Requirements

- Node.js 22 or later
- npm 12 or later (this repository pins `packageManager`)

## Setup

```bash
copy .env-template .env
npm install
```

On macOS or Linux, use `cp .env-template .env`.

`.env` is ignored by git. Local values such as `NG_APP_SITE_NAME`, `NG_APP_API_BASE`, `NG_APP_CONTENT_BASE`, and `NG_APP_ANALYTICS_ID` belong there. The running application reads the mirrored defaults in `src/environments/environment.ts`. Development builds replace that file with `environment.development.ts`. `ng serve` forwards `/api` to `http://127.0.0.1:8080` through `proxy.conf.json`.

## Scripts

```bash
npm start
```

Serves the application at `http://localhost:4200/`.

```bash
npm run build
```

Writes an optimized bundle to `dist/DevChronicle`.

```bash
npm test
```

Runs the Vitest suite through the Angular unit-test builder.

## Architecture

The source tree is flat and organized by feature:

| Path | Responsibility |
| :--- | :--- |
| `src/app/core` | Models, API fetching, Markdown parsing, Highlight.js loading, notifications |
| `src/app/features` | Landing catalog and article viewer |
| `src/app/shared` | Cards, tags, copy control, skeleton, offline status, site header and footer |
| `public/content` | Local catalog (`index.json` and `.md`) used when the API is unreachable |
| `public/fonts` | Vendored Inter and JetBrains Mono |

Routing lives in `src/app/app.routes.ts`. The catalog is `/`. The viewer is `/post/:slug`. Unknown paths redirect home.

Components use signal inputs, deferred views for compiled HTML, and zoneless change detection. Parser output is purified with DOMPurify before it is bound with `[innerHTML]`. A content request is sent only when the slug matches `[a-z0-9-]+`.

User-facing alerts go through `NotificationService` (`src/app/core/services/notification.service.ts`), which styles SweetAlert2 to the Civic Terminal palette.

`docs/files/design_guidelines.md` and `docs/files/architecture_guidelines.md` are local briefs and are listed in `.gitignore`.

## Reading entries

The catalog request is `GET /api/v1/articles`. An entry request is `GET /api/v1/articles/{slug}` and returns `{ metadata, markdown }`. The Markdown body has no frontmatter. Title, date, author, and tags come from `metadata`. Creating and editing are API operations authenticated with the author token. This client has no administration form.

If the API cannot be reached, because of a dropped connection, a proxy failure, or a 5xx response, the client reads `public/content/index.json` and `public/content/<slug>.md`. Those files still carry frontmatter, which the parser splits before rendering. The first failure opens one alert, “API is offline”. A reload in the same tab does not repeat it. After that, `dev-service-status` keeps a status line in the header until a later request succeeds. The status stays hidden while the API answers. A `404` from a live API remains “Article not found” and does not open the local file. If the API and the local file both fail, the page shows “Unable to load the journal”.

## Author

Hugo Fernando Colmenares. Public repositories: [HugoFernandoColmenares](https://github.com/HugoFernandoColmenares?tab=repositories).

This repository is [DevChronicleApp](https://github.com/HugoFernandoColmenares/DevChronicleApp).

| Project | Role |
| :--- | :--- |
| [DevChronicleApp](https://github.com/HugoFernandoColmenares/DevChronicleApp) | Angular frontend |
| [DevChronicleApi](https://github.com/HugoFernandoColmenares/DevChronicleApi) | Rust API and SQLite |
| [DevChronicle](https://github.com/HugoFernandoColmenares/DevChronicle) | Docker Compose orchestration |

## License

Private project. All rights reserved unless the repository owner states otherwise.
