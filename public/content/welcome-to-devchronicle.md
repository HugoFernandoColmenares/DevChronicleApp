---
title: Bienvenida a DevChronicle
author: Hugo Colmenares
date: 2026-09-08
tags: [journal, markdown]
excerpt: Por qué este portal guarda cada entrada como Markdown local y trata la columna de lectura como el producto.
---

DevChronicle es un diario impulsado por Markdown. La interfaz existe para recuperar notas con rapidez, mantener el código legible y no interponerse en la prosa.

## Qué cabe aquí

Decisiones de arquitectura, práctica con Angular y ensayos cortos que de otro modo se perderían en un chat o en un archivo suelto. Cada entrada empieza como un `.md` en `public/content`. El importador vuelca ese corpus a Cloud Firestore; el catálogo en vivo lee documentos publicados, no un `index.json` estático.

> El contenido es el producto. El cromo es una herramienta de recuperación.

## Cómo se publica una entrada

1. Añade un Markdown con frontmatter YAML bajo `public/content`.
2. Ejecuta el importador (`npm run import:emulator` en local, o `node scripts/import-content.mjs --project <id>` en la nube).
3. Abre `/post/<slug>` para leer el artículo compilado desde Firestore.

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

Studio también puede crear y publicar entradas directamente. El Markdown en `public/content` sigue siendo la fuente durable para sembrar y recuperar el diario.
