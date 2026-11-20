---
title: Angular Signals en la práctica
author: Hugo Colmenares
date: 2026-09-10
tags: [angular, arquitectura]
excerpt: Cómo las entradas con signals, el estado derivado y las vistas diferidas mantienen un sitio de contenido pequeño y explícito.
---

Angular 22 trata a los signals como la superficie de entrada por defecto. DevChronicle los usa en las tarjetas de artículos, los filtros de etiquetas y el HTML compilado, para que la detección de cambios se quede en el lugar donde ocurre.

## Entradas sin decoradores

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

La tarjeta no consulta datos. Recibe los metadatos y los dibuja. Leer de Firestore es trabajo de `JournalService`.

## Aplaza el trabajo pesado

El resaltado de sintaxis se carga de forma diferida cuando ya existe el cuerpo del artículo. El marcador de posición del visor es un esqueleto, no una página vacía.

```html
@defer (when compiledHtml()) {
  <div class="markdown-body" [innerHTML]="compiledHtml()"></div>
} @placeholder {
  <dev-skeleton-loader />
}
```

Mantén el resaltador detrás de esa condición. La portada nunca paga por él.
