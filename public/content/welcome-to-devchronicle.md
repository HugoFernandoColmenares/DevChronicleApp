---
title: Welcome to DevChronicle
author: Hugo Colmenares
date: 2026-09-08
tags: [journal, markdown]
excerpt: Why this portal stores every entry as local markdown and treats the reading column as the product.
---

DevChronicle is a local, markdown-driven journal. The interface exists to retrieve notes quickly, keep code readable, and stay out of the way of the prose.

## What belongs here

Architecture decisions, Angular practice, and short essays that you would otherwise lose in a chat log or a scratch file. Each entry is a `.md` file in `public/content`, listed by `index.json`.

> Content is the product. Chrome is a retrieval tool.

## How an entry is published

1. Add a markdown file with YAML frontmatter.
2. Register the same metadata in `public/content/index.json`.
3. Open `/post/<slug>` to read the compiled article.

```ts
export interface ArticleMetadata {
  slug: string;
  title: string;
  author: string;
  date: string;
  tags: string[];
  excerpt: string;
}
```

The landing grid reads only the index. The viewer fetches one file. That split keeps the first paint light.
