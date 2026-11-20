---
title: Signals de Angular en la práctica
author: Hugo Colmenares
date: 2026-09-10
tags: [angular, architecture]
excerpt: Cómo los signal inputs, el estado computed y las vistas diferidas mantienen un sitio de contenido pequeño y explícito.
---

Angular 22 trata los signals como la superficie de entrada por defecto. DevChronicle los usa en las tarjetas de artículo, los filtros por etiqueta y el HTML compilado para que la detección de cambios siga siendo local.

## Inputs sin decoradores

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

La tarjeta no hace fetch. Recibe metadatos y renderiza. La obtención de datos permanece en `JournalService`.

## Diferir el trabajo pesado

El resaltado de sintaxis se carga de forma diferida cuando existe el cuerpo del artículo. El marcador de posición del lector es un esqueleto, no una página vacía.

```html
@defer (when compiledHtml()) {
  <div class="markdown-body" [innerHTML]="compiledHtml()"></div>
} @placeholder {
  <dev-skeleton-loader />
}
```

Mantén el resaltador detrás de esa puerta. La portada nunca paga ese coste.
