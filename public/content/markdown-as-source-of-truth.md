---
title: Markdown as the source of truth
author: Hugo Colmenares
date: 2026-09-12
tags: [markdown, architecture]
excerpt: Frontmatter, an index file, and a parser boundary so the UI never owns content formatting.
---

The UI receives safe HTML. It does not parse YAML, compile markdown, or choose a highlighter theme. Those jobs live in core services.

## The fetch path

1. `ContentFetcherService` loads `/content/index.json` or `/content/<slug>.md`.
2. `MarkdownParserService` splits frontmatter from the body and compiles with `marked`.
3. `DOMPurify` removes scripts while keeping highlight classes.
4. `SyntaxHighlightService` lazy-loads Highlight.js after the HTML is bound.

```ts
const article = this.parser.parse(raw, slug);
this.sanitizer.bypassSecurityTrustHtml(article.html);
```

Bypass the Angular sanitizer only after purification. Custom class names on `pre` and `code` must survive, or the highlighter cannot run.

## Slugs are data, not paths

A slug may contain lowercase letters, numbers, and hyphens. Anything else is rejected before the HTTP call so a crafted URL cannot walk the `public` tree.
