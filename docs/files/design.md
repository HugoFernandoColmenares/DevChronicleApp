# Design — Civic Terminal

DevChronicle’s public surface is nicknamed **Civic Terminal**: a reading room for working software notes. The product promise is retrieval and readability—chrome should disappear behind prose and code.

Spanish operational notes for the same tokens live in [`diseno.md`](./diseno.md). This file is the English source of truth for the current UI system as implemented in `src/styles.css` and feature styles.

## Brand and voice

- **Name:** DevChronicle (hero-level on landing as the header brand; landing H1 is the product line “Field notes for working software.”)
- **Voice:** Direct, technical, bilingual content (UI English; many entries and tags in Spanish).
- **Mark:** A 1×1 accent square beside the wordmark—functional, not illustrative.

## Tokens (`:root` in `src/styles.css`)

| Token                                | Value                     | Role                                       |
| :----------------------------------- | :------------------------ | :----------------------------------------- |
| `--color-canvas`                     | `#fafafa`                 | Page background                            |
| `--color-slate`                      | `#1e293b`                 | Header, footer, featured card, code chrome |
| `--color-accent`                     | `#0ea5e9`                 | Links, CTAs, focus ring, tag washes        |
| `--color-accent-ink`                 | `#0369a1`                 | Accent text on light surfaces              |
| `--color-ink`                        | `#0f172a`                 | Body text                                  |
| `--color-muted`                      | `#475569`                 | Secondary copy, kickers (WCAG-friendlier)  |
| `--color-divider`                    | `#e2e8f0`                 | Rules, card borders                        |
| `--color-string` / `--color-keyword` | `#10b981` / `#8b5cf6`     | Syntax accents                             |
| `--font-ui`                          | Inter (+ system fallback) | UI and prose                               |
| `--font-mono`                        | JetBrains Mono            | Code, editor, 404 numerals                 |

Self-hosted fonts live under `public/fonts`. Focus uses a 2px accent outline (`:focus-visible`).

## Layout patterns

- **Landing:** Intro copy → dense tag filters → featured slate card → “Recently published” compact rail → “Earlier entries” grid.
- **Archive (`/articles`):** Intro + back button → search → tags → result count → paginated grid (6 per page).
- **Reader (`/post/:slug`):** ~70ch column (`.article-canvas`), slate code fences, copy control per fence.
- **Studio:** Same tokens; list rows with status pills; editor is a two-column form + live Markdown preview. SweetAlert2 confirms discard/delete and is themed to the palette.
- **Shell:** Slate header (Journal / Articles / Studio) and slate footer. Offline medal appears in the header when `JournalService.offline` is true.

## Components

Cards (`.article-card`) are the primary interactive catalog unit—bordered light cards, featured variant fills slate. Tags are accent-washed chips. Pills mark draft/published in Studio. Skeleton loaders reserve catalog space while Firestore resolves.

## Motion and atmosphere

Motion is minimal: underline/gradient link treatments and hover border shifts on cards. There is no hero imagery, illustration system, or ambient texture—atmosphere comes almost entirely from typography contrast (slate vs canvas) and the featured card.

## Accessibility baselines present today

- Landmark `<main>`, primary `nav` label, filter `role="group"`, pager labels, `aria-live` on archive results, `aria-current` on pages, decorative `aria-hidden` marks, focus-visible styles.
- Gaps (skip link, route focus management, contrast on some muted/accent mixes, SweetAlert focus traps) are tracked in the audit.

## Screenshots

Captures under `docs/screenshots/` were taken against `ng serve` + emulators at 1440×900 (desktop) and 390×844 (mobile), including Studio authenticated flows via the Auth emulator account `admin@devchronicle.test`.

## Art direction (current vs intended)

**Current:** Clean developer-blog utilitarian. Distinctive mostly in naming (“Civic Terminal”, slate featured card) but visually close to a default Inter + sky-blue Tailwind-like kit.

**Intended refresh (see improvement plan Phase 3):** Treat the journal like a field notebook—tactile paper grain or subtle ruled canvas, a display face with more authorship than Inter, monospace as a first-class brand signal, and fewer pill clusters. Keep the slate/code relationship; evolve the landing so the brand and the first entry share one composition instead of a dashboard of filters-then-cards.
