# Phase 4 — Ops extras

Nice-to-haves shipped alongside the Spark MVP. Deferred items stay deferred on purpose.

## Shipped

| Item                         | Where                                                                |
| :--------------------------- | :------------------------------------------------------------------- |
| Highlight.js language subset | `SyntaxHighlightService` loads `core` + corpus languages only        |
| Hosting preview channels     | `.github/workflows/firebase-hosting-preview.yml` on each PR          |
| Global `ErrorHandler`        | `GlobalErrorHandler` + optional `SENTRY_DSN` envelope                |
| Uptime ping                  | `.github/workflows/uptime.yml` curls `/`, `/articles`, `/challenges` |
| Scheduled Firestore export   | `.github/workflows/scheduled-export.yml` + `npm run export:cloud`    |
| Legacy essay refresh         | `welcome-to-devchronicle.md`, `markdown-as-source-of-truth.md`       |

## Deferred (conscious)

| Item                                  | Why                                                                       |
| :------------------------------------ | :------------------------------------------------------------------------ |
| Multi-author `editor` / `admin` roles | Single-author MVP; `admins/{uid}` stays binary until collaborators appear |
| Privacy-respecting analytics          | No product decision that needs telemetry yet                              |
| Full SSR / Functions HTML shell       | Remains Spark-bound; see `acabado-publico.md` Phase 2 decision            |

## Secrets / vars

| Name                                    | Used by                                                           |
| :-------------------------------------- | :---------------------------------------------------------------- |
| Existing `FIREBASE_*` + service account | Preview deploy, scheduled export                                  |
| `SENTRY_DSN` (optional)                 | Client error envelopes                                            |
| `vars.NG_APP_SITE_URL`                  | Uptime base URL (defaults to `https://devchronicle-hugo.web.app`) |

## Local export

```bash
npm run emulators
npm run export:emulator
# or
npm run export:cloud   # needs GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT
```
