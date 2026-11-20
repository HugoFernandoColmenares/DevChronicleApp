# Design — Civic Terminal

DevChronicle’s public surface is nicknamed **Civic Terminal**: a field notebook for working software notes. The product promise is retrieval and readability—chrome should disappear behind prose and code.

This file is the English source of truth for the UI system as implemented in `src/styles.css` and feature styles (**Phase 3 refresh, Nov 2026**). Older Spanish path [`diseno.md`](./diseno.md) redirects here.

## Brand and voice

- **Name:** DevChronicle — hero-level on the landing (`h1.hero__brand`). The product line “Field notes for working software.” supports it; it must not overpower the brand.
- **Voice:** Direct, technical. UI English; many entries in Spanish. Tag chips are normalized to a single lowercase English preference where bilingual duplicates exist (`arquitectura` → `architecture`).
- **Mark:** Notebook plate SVG with ruled lines and a mono **DC** monogram—readable without the wordmark.

## Tokens (`:root` in `src/styles.css`)

| Token                                | Value                 | Role                                    |
| :----------------------------------- | :-------------------- | :-------------------------------------- |
| `--color-canvas`                     | `#ecefe6`             | Cool ruled-paper page background        |
| `--color-surface`                    | `#f7f8f3`             | Cards/forms/surfaces on the paper       |
| `--color-slate`                      | `#162032`             | Header, footer, featured plane, code    |
| `--color-accent`                     | `#0f766e`             | Teal ink links, CTAs, focus, tag washes |
| `--color-accent-ink`                 | `#115e59`             | Accent text on light surfaces           |
| `--color-ink`                        | `#14201a`             | Body text                               |
| `--color-muted`                      | `#3f5349`             | Secondary copy                          |
| `--color-divider`                    | `#cfd8d0`             | Rules, borders                          |
| `--color-string` / `--color-keyword` | `#34d399` / `#f0abfc` | Syntax accents on slate fences          |
| `--font-display`                     | Source Serif 4        | Brand, headings, featured titles        |
| `--font-ui`                          | Source Sans 3         | UI and prose                            |
| `--font-mono`                        | JetBrains Mono        | Code, kickers, meta, brand mark         |

Self-hosted fonts live under `public/fonts`. Focus uses a 2px accent outline (`:focus-visible`). Body uses a subtle horizontal rule texture (notebook), not a flat fill.

## Layout patterns

- **Landing:** One composition — brand + one line + one CTA → full-bleed featured slate plane → tag filters (collapsed) → recent rail → earlier grid.
- **Archive (`/articles`):** Intro + search + tags + paginated list (6 per page).
- **Reader (`/post/:slug`):** ~70ch column (`.article-canvas`), slate code fences, copy toolbar that appears on fence hover/focus.
- **Challenges:** Practice catalog + revealable hint/solution.
- **Studio:** Same tokens; list rows; editor form + Markdown preview. Confirms use SweetAlert2 restyled as Civic Terminal (no generic glyph icons).
- **Shell:** Slate header/footer; skip link; route focus to `#main`; offline medal when `JournalService.offline`.

## Components

Interactive catalog units use underline/rule affordances rather than bordered widget cards. Featured is a full-bleed slate plane. Tags are mono chips with accent wash. Pills mark draft/published in Studio.

## Motion

Three authored moments (respect `prefers-reduced-motion`):

1. Landing hero ink fade (blur → clear).
2. Featured plane rise.
3. Code-fence toolbar appear on hover/focus; filter panel height ease on “More tags”.

## Accessibility baselines

- Skip link, `main#main` with route focus, landmarks, filter `role="group"`, pager labels, `aria-live` on archive results, decorative marks `aria-hidden`.
- Contrast tuned for muted text and accent pills on the paper canvas.

## Screenshots

Captures under `docs/screenshots/` are refreshed with `npm run screenshots` against `ng serve` + emulators (1440×900 desktop, 390×844 mobile).

## Art direction

**Committed world:** Cool field notebook under a desk lamp—ruled paper, serif authorship, teal ink accent, deep slate for terminal/code. Avoid Inter + sky-500 kits, purple glow, and cream + terracotta clichés.
