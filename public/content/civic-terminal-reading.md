---
title: Civic Terminal, pensado para leer
author: Hugo Colmenares
date: 2026-09-11
tags: [design, typography]
excerpt: Un lienzo de papel, una pizarra slate y una medida de 70 caracteres: las reglas que mantienen calmadas las sesiones largas.
---

Civic Terminal es un lienzo de lectura con código en tono pizarra. La columna de lectura no supera `70ch`. La navegación y el pie usan slate para que el artículo siga siendo la superficie más clara.

## Roles tipográficos

- **Source Serif 4** para la marca y los titulares.
- **Source Sans 3** para la interfaz y la prosa.
- **JetBrains Mono** para cercas de código, código en línea y etiquetas de lenguaje.

Los cuerpos van a `1.125rem` para reducir fatiga. El espaciado sigue una escala de 8px: bit, byte, kilobyte, megabyte.

## El código como objeto

Las cercas usan fondo slate, una etiqueta de lenguaje y un control de copia. El desbordamiento horizontal se desplaza dentro del bloque para que el ancho de página no se rompa.

```html
<pre aria-label="Code snippet in HTML">
  <code class="language-html">&lt;article class="article-canvas"&gt;...&lt;/article&gt;</code>
</pre>
```

Los enlaces en la prosa ganan un subrayado en el acento teal al pasar el cursor. Esa es la única decoración que el cuerpo necesita.
