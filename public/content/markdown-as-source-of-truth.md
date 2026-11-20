---
title: Markdown como fuente de verdad
author: Hugo Colmenares
date: 2026-09-12
tags: [markdown, arquitectura]
excerpt: Frontmatter, un importador y una frontera de parseo para que la interfaz nunca sea dueña del formato del contenido.
---

La interfaz recibe HTML seguro. No interpreta YAML, no compila Markdown ni elige el tema del resaltador. Ese trabajo vive en los servicios del núcleo.

## El camino del contenido

1. `scripts/import-content.mjs` lee `public/content/<slug>.md`, separa el frontmatter del cuerpo y sube ambos a Firestore.
2. `JournalService` escucha en Firestore los metadatos y el cuerpo de la entrada.
3. `MarkdownParserService` compila el cuerpo con `marked`.
4. `DOMPurify` elimina los scripts y conserva las clases del resaltador.
5. `SyntaxHighlightService` carga Highlight.js de forma diferida cuando el HTML ya está en pantalla.

```ts
const html = this.parser.compile(body.markdown);
this.sanitizer.bypassSecurityTrustHtml(html);
```

Salta el sanitizador de Angular solo después de purificar. Los nombres de clase personalizados en `pre` y `code` tienen que sobrevivir, o el resaltador no puede ejecutarse.

## Los slugs son datos, no rutas

Un slug puede contener letras minúsculas, números y guiones. Cualquier otra cosa se rechaza antes de consultar Firestore, para que una URL manipulada no pueda apuntar a un documento que no le corresponde.
