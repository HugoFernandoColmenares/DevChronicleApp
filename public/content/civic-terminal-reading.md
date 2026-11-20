---
title: Civic Terminal, pensado para leer
author: Hugo Colmenares
date: 2026-09-11
tags: [design, typography]
excerpt: Un lienzo claro, una consola color pizarra y una medida de 70 caracteres: las reglas que mantienen tranquilas las sesiones largas de lectura.
---

Civic Terminal es un lienzo claro, al estilo de la documentación, con código en tema oscuro de IDE. La columna de lectura nunca supera `70ch`. La navegación y los pies de página usan Console Slate para que el artículo sea siempre la superficie más brillante.

## Roles tipográficos

- **Inter** para títulos, navegación e interfaz.
- **JetBrains Mono** para bloques de código, código en línea y etiquetas de lenguaje.

El cuerpo del artículo usa `1.125rem` para cansar menos la vista. El espaciado sigue una escala de 8 px: bit, byte, kilobyte, megabyte.

## El código como objeto

Los bloques de código usan Console Slate, una etiqueta de lenguaje y un control para copiar. El desbordamiento horizontal se desplaza dentro del bloque, así que el ancho de la página nunca se rompe.

```html
<pre aria-label="Fragmento de código en HTML">
  <code class="language-html">&lt;article class="article-canvas"&gt;...&lt;/article&gt;</code>
</pre>
```

Los enlaces del texto estrenan un subrayado Tech Azure al pasar el cursor. Es la única decoración que el cuerpo necesita.
