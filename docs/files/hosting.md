# Hosting and deploy

Firebase Hosting serves the Angular build as an SPA. `firebase.json` publishes `dist/DevChronicle/browser` and rewrites all routes to `index.html` so `/post/:slug` and `/admin` survive a refresh.

`npm run build` runs `scripts/write-environment.mjs`. That script reads `.env` (without overriding variables already in the environment) and writes `src/environments/environment.production.ts` (gitignored). Missing `FIREBASE_*` values leave placeholders so the build still finishes; those placeholders are not valid for a real site.

## Firebase project setup (Spark)

1. Create project `devchronicle-hugo`.
2. Create native Firestore. Storage is not required.
3. Enable Authentication → Google.
4. Register a web app and copy the config into secrets / `.env` (see `.env.example`).
5. Note the author account uid and create `admins/{uid}` in Firestore.
6. Enable Authentication → Email/password, create the publisher account, and create `editors/{uid}` in Firestore. Disable public sign-up if the console offers it.
7. Add Hosting domains to Google authorized domains.
8. Create a service-account JSON for GitHub (Firebase Admin). Store the full JSON (or base64) in `FIREBASE_SERVICE_ACCOUNT`.

## GitHub secrets

| Secret                         | Use                                           |
| :----------------------------- | :-------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT`     | Service-account JSON                          |
| `FIREBASE_API_KEY`             | Web config                                    |
| `FIREBASE_AUTH_DOMAIN`         | Web config                                    |
| `FIREBASE_PROJECT_ID`          | Must be `devchronicle-hugo`                   |
| `FIREBASE_STORAGE_BUCKET`      | From web config; the app does not use Storage |
| `FIREBASE_MESSAGING_SENDER_ID` | Web config                                    |
| `FIREBASE_APP_ID`              | Web config                                    |
| `FIREBASE_APPCHECK_SITE_KEY`   | Optional reCAPTCHA v3 for App Check           |
| `SENTRY_DSN`                   | Optional unhandled-error envelopes            |

The web key ships in the client bundle. It is not an admin credential. Never commit the service account.

## App Check (optional, Spark)

1. Firebase Console → App Check → register the web app with **reCAPTCHA v3**.
2. Store the site key in `.env` / `FIREBASE_APPCHECK_SITE_KEY`.
3. Enable enforcement for Firestore (and Auth if desired) only after production sends tokens.
4. With emulators or without a key, `initAppCheck` is a no-op.

## Workflows

| Workflow                       | Trigger                                   | Behavior                                                                                                                                         |
| :----------------------------- | :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| `firebase-hosting.yml`         | push to `main` / manual / daily 13:30 UTC | Lint, tests, emulator E2E, build; deploy Hosting+rules+indexes. The full `public/content` import only runs when `IMPORT_MARKDOWN_ON_DEPLOY=true` |
| `firebase-hosting-preview.yml` | pull request                              | Build + `hosting:channel:deploy pr-<n>` (7 days) when secrets exist                                                                              |
| `uptime.yml`                   | every 6 hours                             | HTTP 200 on `/`, `/articles`, `/challenges`                                                                                                      |
| `scheduled-export.yml`         | Sundays 06:00 UTC / manual                | Firestore JSON export → artifact (30 days)                                                                                                       |

If Firebase secrets are missing, deploy/import/export steps explain why and keep the job green.

Manual first seed (only for a deliberate reseed; it overwrites Studio edits):

```bash
node scripts/import-content.mjs --project devchronicle-hugo
```

The daily scheduled run refreshes `sitemap.xml` from Firestore. It does not reseed content.

Scheduled / local backup (in addition to Studio **Export backup**):

```bash
npm run export:cloud
```

See [`ops-phase4.md`](./ops-phase4.md) for Phase 4 ops detail.
