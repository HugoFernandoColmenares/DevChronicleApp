import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { entryFromMarkdown, MARKDOWN_MAX_CHARS } from '../scripts/lib/markdown-entry.mjs';

test('imports the existing catalog by filename slug', () => {
  const names = readdirSync(new URL('../public/content/', import.meta.url))
    .filter((name) => name.endsWith('.md'))
    .sort();
  const entries = names.map((name) => {
    const slug = name.slice(0, -3);
    const raw = readFileSync(new URL(`../public/content/${name}`, import.meta.url), 'utf8');
    return entryFromMarkdown(slug, raw);
  });

  assert.deepEqual(
    entries.map((item) => item.entry.slug),
    [
      'angular-signals-in-practice',
      'civic-terminal-reading',
      'construyendo-apis-por-capas-dotnet',
      'construyendo-apis-por-capas-nestjs',
      'construyendo-apis-por-capas-spring',
      'markdown-as-source-of-truth',
      'welcome-to-devchronicle',
    ],
  );

  const welcome = entries.find((item) => item.entry.slug === 'welcome-to-devchronicle');
  assert.equal(welcome.entry.title, 'Welcome to DevChronicle');
  assert.equal(welcome.entry.summary.startsWith('Why this portal'), true);
  assert.deepEqual(welcome.entry.tags, ['journal', 'markdown']);
  assert.equal(welcome.entry.status, 'published');
  assert.equal(welcome.entry.publishedAt, '2026-09-08T12:00:00.000Z');
  assert.equal(welcome.entry.category, 'journal');
  assert.equal(welcome.entry.series, 'journal');
  assert.equal(welcome.markdown.startsWith('---'), false);
  assert.equal(welcome.entry.readingTimeMinutes >= 1, true);
});

test('is idempotent for the same file', () => {
  const raw = readFileSync(
    new URL('../public/content/welcome-to-devchronicle.md', import.meta.url),
    'utf8',
  );
  assert.deepEqual(
    entryFromMarkdown('welcome-to-devchronicle', raw),
    entryFromMarkdown('welcome-to-devchronicle', raw),
  );
});

test('keeps the filename when frontmatter names another slug', () => {
  const raw = `---
title: Other
date: 2026-09-08
slug: not-the-filename
---
Body
`;
  assert.equal(entryFromMarkdown('the-filename', raw).entry.slug, 'the-filename');
});

test('stores drafts without a publication date', () => {
  const raw = `---
title: Draft
author: Hugo Colmenares
date: 2026-09-08
status: draft
category: angular
series: Signals
tags: [angular]
excerpt: Hidden
---
Still writing.
`;
  const { entry } = entryFromMarkdown('hidden-note', raw);
  assert.equal(entry.status, 'draft');
  assert.equal(entry.publishedAt, null);
  assert.equal(entry.category, 'angular');
  assert.equal(entry.series, 'Signals');
  assert.equal(entry.summary, 'Hidden');
});

test('rejects an oversized note', () => {
  const raw = `---
title: Huge
date: 2026-09-08
---
${'a'.repeat(MARKDOWN_MAX_CHARS)}
`;
  assert.throws(() => entryFromMarkdown('huge-note', raw), /characters/);
});
