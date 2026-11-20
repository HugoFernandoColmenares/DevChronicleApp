---
title: Markdown como fuente de verdad
author: Hugo Colmenares
date: 2026-09-12
tags: [markdown, architecture]
excerpt: Frontmatter, documentos en Firestore y un límite de parser para que la UI no posea el formato del contenido.
---

La UI recibe HTML seguro. No parsea YAML para el catálogo en vivo, no elige el tema del resaltador ni inventa el estado de publicación. Esos trabajos viven en servicios de núcleo y en el importador que convierte `public/content/*.md` en entradas de Firestore.

## La ruta de lectura

1. `JournalService` escucha las `entries` publicadas (y `entries/{slug}/body/current` en el lector).
2. `MarkdownParserService` compila el cuerpo Markdown almacenado con `marked`.
3. `DOMPurify` elimina scripts y conserva las clases de resaltado.
4. `SyntaxHighlightService` carga bajo demanda un **subconjunto** de lenguajes de Highlight.js después de enlazar el HTML.

```ts
const article = this.parser.compile(markdown);
this.sanitizer.bypassSecurityTrustHtml(article);
```

Solo omite el sanitizador de Angular después de la purificación. Los nombres de clase en `pre` y `code` deben sobrevivir; si no, el resaltador no puede ejecutarse.

## Importación frente a runtime

`public/content` es el corpus de autoría e importación. El descubrimiento en runtime ya no depende de `/content/index.json`. Las notas creadas solo en Studio viven en Firestore hasta que las exportes o las reflejes de nuevo en Markdown.

## Los slugs son datos, no rutas

Un slug admite letras minúsculas, números y guiones. Cualquier otra cosa se rechaza antes de pedir el documento, para que una URL fabricada no recorra el árbol del cliente.
