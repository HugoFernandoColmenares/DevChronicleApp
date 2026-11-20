---
title: Bienvenido a DevChronicle
author: Hugo Colmenares
date: 2026-09-08
tags: [diario, markdown]
excerpt: Por qué este portal guarda cada entrada como un archivo Markdown y trata la columna de lectura como el producto.
---

DevChronicle es un diario basado en Markdown. La interfaz existe para encontrar las notas rápido, mantener el código legible y no estorbar a la prosa.

## Qué cabe aquí

Decisiones de arquitectura, práctica con Angular y ensayos cortos que de otro modo se perderían en un chat o en un archivo de borradores. Cada entrada nace como un archivo `.md` en `public/content`, y un script la importa a Firestore, que es de donde la app lee en producción.

> El contenido es el producto. El marco es solo una herramienta para encontrarlo.

## Cómo se publica una entrada

1. Escribe un archivo Markdown con frontmatter YAML.
2. Impórtalo a Firestore con `npm run import:emulator` (o con `--project` para la nube), o créalo directamente desde el Estudio en `/admin`.
3. Abre `/post/<slug>` para leer el artículo ya compilado.

```ts
export interface ArticleMetadata {
  slug: string;
  title: string;
  author: string;
  summary: string;
  tags: string[];
  category: string;
  series: string;
  publishedAt: string | null;
  updatedAt: string;
  status: 'draft' | 'published';
  readingTimeMinutes: number;
}
```

La portada y el archivo leen solo los metadatos. El visor trae el cuerpo de una sola entrada. Esa separación mantiene liviana la primera carga.
