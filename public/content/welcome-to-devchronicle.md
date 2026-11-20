---
title: Welcome to DevChronicle
author: Hugo Colmenares
date: 2026-09-08
tags: [journal, markdown]
excerpt: Why this portal stores every entry as local markdown and treats the reading column as the product.
---

DevChronicle is a markdown-driven journal. The interface exists to retrieve notes quickly, keep code readable, and stay out of the way of the prose.

## What belongs here

Architecture decisions, Angular practice, and short essays that you would otherwise lose in a chat log or a scratch file. Each entry starts as a `.md` file in `public/content`. The importer upserts that corpus into Cloud Firestore; the live catalog reads published documents, not a static `index.json`.

> Content is the product. Chrome is a retrieval tool.

## How an entry is published

1. Add a markdown file with YAML frontmatter under `public/content`.
2. Run the importer (`npm run import:emulator` locally, or `node scripts/import-content.mjs --project <id>` for the cloud project).
3. Open `/post/<slug>` to read the compiled article from Firestore.

```ts
export interface ArticleMetadata {
  slug: string;
  title: string;
  author: string;
  publishedAt: string | null;
  tags: string[];
  summary: string;
}
```

Studio can also create and publish entries directly. Markdown in `public/content` remains the durable import source for seeding and recovery.
