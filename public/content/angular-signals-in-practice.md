---
title: Angular signals in practice
author: Hugo Colmenares
date: 2026-09-10
tags: [angular, architecture]
excerpt: How signal inputs, computed state, and deferred views keep a content site small and explicit.
---

Angular 22 treats signals as the default input surface. DevChronicle uses them for article cards, tag filters, and compiled HTML so change detection stays local.

## Inputs without decorators

```ts
@Component({
  selector: 'dev-article-card',
  templateUrl: './article-card.html',
})
export class ArticleCardComponent {
  article = input.required<ArticleMetadata>();
  featured = input(false);
}
```

The card does not fetch. It receives metadata and renders. Fetching stays in `ContentFetcherService`.

## Defer the heavy work

Syntax highlighting is lazy-loaded when an article body exists. The viewer placeholder is a skeleton, not an empty page.

```html
@defer (when compiledHtml()) {
  <div class="markdown-body" [innerHTML]="compiledHtml()"></div>
} @placeholder {
  <dev-skeleton-loader />
}
```

Keep the highlighter behind that gate. The landing page never pays for it.
