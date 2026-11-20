---
title: Markdown as the source of truth
author: Hugo Colmenares
date: 2026-09-12
tags: [markdown, architecture]
excerpt: Frontmatter, Firestore documents, and a parser boundary so the UI never owns content formatting.
---

The UI receives safe HTML. It does not parse YAML for the live catalog, choose a highlighter theme, or invent publishing state. Those jobs live in core services and in the importer that turns `public/content/*.md` into Firestore entries.

## The read path

1. `JournalService` listens to published `entries` (and `entries/{slug}/body/current` for the reader).
2. `MarkdownParserService` compiles the stored Markdown body with `marked`.
3. `DOMPurify` removes scripts while keeping highlight classes.
4. `SyntaxHighlightService` lazy-loads a **subset** of Highlight.js languages after the HTML is bound.

```ts
const article = this.parser.compile(markdown);
this.sanitizer.bypassSecurityTrustHtml(article);
```

Bypass the Angular sanitizer only after purification. Custom class names on `pre` and `code` must survive, or the highlighter cannot run.

## Import vs runtime

`public/content` is the authoring/import corpus. Runtime discovery no longer depends on `/content/index.json`. New cloud-only Studio posts exist in Firestore until you export or mirror them back into Markdown.

## Slugs are data, not paths

A slug may contain lowercase letters, numbers, and hyphens. Anything else is rejected before a document fetch so a crafted URL cannot walk the client tree.
