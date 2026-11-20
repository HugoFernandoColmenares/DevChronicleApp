# Improvement plan

Phased plan derived from [`audit.md`](./audit.md). **Do not treat this document as completed work**—it is the backlog. Prefer Spark-plan constraints (Auth + Firestore + Hosting) unless a phase explicitly opts into Blaze or a new service.

---

## Phase 1 — Quick wins

Ship in a short iteration; low risk; high clarity.

| #   | Action                                                                                                                                       | Addresses | Notes                                                      |
| :-- | :------------------------------------------------------------------------------------------------------------------------------------------- | :-------- | :--------------------------------------------------------- |
| 1.1 | Upgrade **DOMPurify** (and re-run `npm audit`) on the Markdown compile path; add a regression test that dangerous fixtures stay stripped     | C1        | Highest security ROI                                       |
| 1.2 | Patch **@angular/router** (and related Angular 22.x) within the current major                                                                | H5        | Prefer `npm audit fix` without forcing Firebase downgrades |
| 1.3 | Fix **`test:import`** expected slug list (or assert against `readdir` dynamically) so CI is green                                            | H6        |                                                            |
| 1.4 | Update README verification counts (11 entries, not 7) and link this English docs set                                                         | M8        |                                                            |
| 1.5 | Distinguish **empty vs error** copy even when `failed()` is false but `offline` is true; always show Try again when `JournalService.offline` | C2, M4    | Small template/signal change                               |
| 1.6 | Soften Studio nav for anonymous users (hide link, or label “Author sign-in”, or move to footer)                                              | H7        |                                                            |
| 1.7 | Collapse tag cloud: show top N + “More tags”, or move filters below the featured entry                                                       | H8        | Largest UX win on landing/mobile                           |
| 1.8 | Add skip-to-content link targeting `main#main`                                                                                               | M1        |                                                            |
| 1.9 | Generate sitemap URLs from `public/content/*.md` slugs at build time                                                                         | H2        | Matches existing importer source                           |

**Exit criteria:** `npm test`, `npm run test:import`, `npm run lint`, `npm run build` green; landing first viewport shows brand + featured entry without a pill stadium; audit C1 mitigated.

---

## Phase 2 — Core fixes & security

Correctness, abuse resistance, and author safety. **Status: implemented in code (Nov 2026).** App Check
enforcement and full E2E in CI still need secrets/emulators on the runner.

| #   | Action                                                                                                                                                                                  | Addresses | Notes                                                                  |
| :-- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------- | :--------------------------------------------------------------------- |
| 2.1 | Make read failures reliable: map more Firestore/network codes to `offline`; fail the stream when the listen dies; never emit a successful `[]` after an error without clearing `failed` | C2        | Broader codes + cache/offline listen handling + browser online events  |
| 2.2 | Optimistic concurrency: compare `updatedAt` (transaction or precondition) before Studio save; surface conflict UI                                                                       | H4        | `runTransaction` + reload confirm                                      |
| 2.3 | Enable **App Check** (reCAPTCHA v3) on Auth/Firestore                                                                                                                                   | M7        | Scaffolded; activates when `FIREBASE_APPCHECK_SITE_KEY` is set         |
| 2.4 | Studio **export** (JSON or zip of Markdown) for all entries                                                                                                                             | M7        | JSON backup download from Studio list                                  |
| 2.5 | Playwright smoke against emulators: public browse → admin login → create → publish → search → delete                                                                                    | M6        | `npm run test:e2e`; emulator author button                             |
| 2.6 | axe (or equivalent) in unit/E2E CI; fix contrast on pills/muted text; manage focus on route change and SweetAlert                                                                       | M1        | axe in Playwright; FocusService; muted/pill contrast                   |
| 2.7 | Document / script `test:rules` alongside a running stack (alternate ports or `emulators:exec` only)                                                                                     | M6        | `firebase.rules-test.json` port 8180                                   |
| 2.8 | Prerender critical routes **or** Hosting/Cloud Function HTML shell for `/post/:slug` + true HTTP 404                                                                                    | H1, H3    | **Deferred** on Spark; documented in `acabado-publico.md`              |
| 2.9 | Keep dependency cadence: Firebase/Node engine alignment (Node 22 vs packages asking 24)                                                                                                 | H5, L6    | `engines.node: >=22 <25`                                               |

**Exit criteria:** Forced Firestore outage shows retry + offline medal 100% of the time; conflict on dual-tab save; E2E + rules + import in CI; App Check on in staging.

---

## Phase 3 — Design refresh

Make Civic Terminal feel authored, not generated. Preserve slate code fences and reading measure.
**Status: implemented in code (Nov 2026).** Re-capture `docs/screenshots` when convenient.

| #   | Action                                                                                                            | Addresses     | Notes                                                   |
| :-- | :---------------------------------------------------------------------------------------------------------------- | :------------ | :------------------------------------------------------ |
| 3.1 | Replace Inter with a distinctive UI/display pair; keep JetBrains Mono for code; load via `public/fonts`           | L2, design.md | Source Serif 4 + Source Sans 3                          |
| 3.2 | Redefine tokens: richer canvas (subtle grain/grid), ink/slate hierarchy, accent that is not default sky-500       | L2            | Cool ruled paper + teal ink `#0f766e`                   |
| 3.3 | New brand mark (logotype or monogram) that survives without the wordmark                                          | L1            | Ruled notebook plate + mono DC                          |
| 3.4 | Landing as **one composition**: brand, one line, one CTA, one featured entry; filters secondary                   | H8, design.md | Brand as `h1`; filters after featured                   |
| 3.5 | Reduce card chrome where not interactive; featured entry as full-bleed slate plane, not a bordered widget cluster | Design taste  | Rule underlines; featured edge-to-edge                  |
| 3.6 | 2–3 intentional motions (e.g. featured ink fade, fence toolbar appear, filter expand)—not decoration spam         | Design taste  | Hero ink, featured rise, fence toolbar, filter height   |
| 3.7 | Bilingual strategy: UI locale toggle **or** normalize tags/series naming                                          | M3            | `tag-normalize` aliases (e.g. arquitectura)             |
| 3.8 | Restyle confirm modals to match Civic Terminal (or replace SweetAlert with in-app dialog)                         | L2            | Glyph-free Swal, serif title, teal actions              |
| 3.9 | Refresh `docs/screenshots` after the visual pass                                                                  | —             | Marked stale in design.md until re-shot                 |

**Exit criteria:** Brand test—landing without nav still reads as DevChronicle; Lighthouse a11y ≥ 90 on `/` and `/post/:slug`; design.md updated to the new tokens.

---

## Phase 4 — Nice-to-haves

**Status: implemented where actionable (Nov 2026).** Details in [`ops-phase4.md`](./ops-phase4.md).

| #   | Action                                                              | Addresses        | Notes                                      |
| :-- | :------------------------------------------------------------------ | :--------------- | :----------------------------------------- |
| 4.1 | Tree-shake / subset highlight.js languages used in the corpus       | M2               | `highlight.js/lib/core` + registered langs |
| 4.2 | Hosting preview channels per PR                                     | robustez backlog | `firebase-hosting-preview.yml`             |
| 4.3 | Global `ErrorHandler` + optional Sentry free tier                   | robustez         | Envelope reporter when `SENTRY_DSN` set    |
| 4.4 | External uptime check on `/` and `/articles`                        | robustez         | `uptime.yml` (+ `/challenges`)             |
| 4.5 | Scheduled export Action (service account) once manual export exists | M7               | Weekly + `export-firestore.mjs`            |
| 4.6 | Multi-author roles (`editor` / `admin`) if collaborators appear     | Deferred         | Documented; not built                      |
| 4.7 | Privacy-respecting analytics only if a concrete decision needs data | Deferred         | Documented; not built                      |
| 4.8 | Refresh legacy essays that still describe `index.json` as runtime   | L5               | Welcome + markdown source essays updated   |
| 4.9 | Optional full SSR—only if prerender (2.8) proves insufficient       | Deferred         | Spark decision unchanged                   |

---

## Suggested sequencing

```
Phase 1 (Quick wins)
    → Phase 2 (Failure modes, concurrency, App Check, E2E)
        → Phase 3 (Visual identity)
            → Phase 4 (Perf polish, ops extras)
```

Phase 3 can overlap late Phase 2 once failure/security work is not churning shared layout CSS.

---

## Out of scope (for now)

- Rewriting onto a new CMS or database
- Cloud Functions unless chosen for true 404/OG HTML
- Automatic write retries without idempotency keys
- Expanding beyond a single-author MVP until Phase 2 export + concurrency land
