---
title: Civic Terminal, built for reading
author: Hugo Colmenares
date: 2026-09-11
tags: [design, typography]
excerpt: A light canvas, a slate console, and a 70-character measure: the rules that keep long sessions calm.
---

Civic Terminal is a documentation-light canvas with IDE-dark code. The reading column never exceeds `70ch`. Navigation and footers use Console Slate so the article remains the brightest surface.

## Type roles

- **Inter** for titles, navigation, and UI.
- **JetBrains Mono** for fences, inline code, and language labels.

Article bodies sit at `1.125rem` to reduce strain. Spacing follows an 8px scale: bit, byte, kilobyte, megabyte.

## Code as an object

Fences use Console Slate, a language label, and a copy control. Horizontal overflow scrolls inside the block so the page width never breaks.

```html
<pre aria-label="Code snippet in HTML">
  <code class="language-html">&lt;article class="article-canvas"&gt;...&lt;/article&gt;</code>
</pre>
```

Links in prose grow a Tech Azure underline on hover. That is the only decoration the body needs.
