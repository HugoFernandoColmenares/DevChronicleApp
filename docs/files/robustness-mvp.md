# Robustness without leaving the MVP

Prioritize fixes that reduce real failures without changing scope: Angular on Hosting, Firestore, Google Auth, and the Spark plan. Nothing here requires Cloud Functions, a new backend, or a paid plan.

Phases 1–4 of [`improvement-plan.md`](./improvement-plan.md) implement most of the original backlog. This file remains the narrative checklist.

## Already in code

- Unsaved-changes guard + `beforeunload` in Studio.
- Transient read retries (`retry-transient`) and visible **Try again** / offline medal.
- Optimistic concurrency on Studio save (`updatedAt` transaction).
- Broader offline error mapping and cache-aware listeners.
- DOMPurify upgrade path, skip link, route focus, axe smoke in Playwright.
- Studio JSON export + scheduled CI export + hosting preview channels.
- Global `ErrorHandler` with optional Sentry DSN.
- Highlight.js language subset.
- Firestore rules tests on an alternate emulator port (8180).

## Deferred on purpose

- Multi-author `editor` / `admin` roles.
- Privacy-respecting analytics until a concrete decision needs data.
- Full SSR / Functions HTML shell for true HTTP 404 and per-article OG (see [`public-finish.md`](./public-finish.md)).

## Verification checklist

- [ ] `npm test`, `npm run test:rules`, and `npm run build`.
- [ ] Walk the README against emulators.
- [ ] Lighthouse mobile on `/` and `/post/:slug` (aim ≥ 90 accessibility / SEO).
- [ ] Stop Firestore mid-load and confirm retry + recovery.
- [ ] Edit the same entry in two tabs and confirm conflict handling.
- [ ] Export, delete a test entry, and re-import.
