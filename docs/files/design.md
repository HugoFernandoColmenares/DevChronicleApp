# Diseño — Libreta de apuntes

La superficie pública de DevChronicle es una **libreta de apuntes de software**: un escritorio neutro, una hoja con renglones y línea de margen, pestañas separadoras como navegación y notas adhesivas para los avisos. La promesa del producto sigue siendo encontrar y leer con comodidad: la libreta enmarca la prosa y el código, no compite con ellos.

Este archivo describe el sistema tal como está implementado en `src/styles.css` y en los estilos de cada sección. Sustituye a la dirección anterior, «Civic Terminal», que la Fase 3 del plan de mejoras pedía renovar.

## Marca y voz

- **Nombre:** DevChronicle, con la nota manuscrita «libreta de apuntes de software» bajo la marca.
- **Voz:** directa y técnica, en español. Solo se conservan en inglés los nombres propios de software (Firebase Studio, Android Studio, etc.).
- **Marca gráfica:** monograma «DC» sobre una hoja con renglones (`site-header.html`).

## Tokens (`:root` en `src/styles.css`)

| Token                | Claro     | Oscuro           | Rol                                         |
| :------------------- | :-------- | :--------------- | :------------------------------------------ |
| `--color-desk`       | `#e6e9e2` | `#0d131a`        | Escritorio detrás de la hoja                |
| `--color-paper`      | `#fcfcf8` | `#151d27`        | Hoja                                        |
| `--color-surface`    | `#ffffff` | `#1b2532`        | Fichas, campos y tarjetas                   |
| `--color-rule`       | `#dfe8f1` | slate al 11 %    | Renglones                                   |
| `--color-margin`     | `#e9a7a7` | rojo al 38 %     | Línea de margen y detalles de ficha         |
| `--color-ink`        | `#1c2631` | `#e5ecf3`        | Texto principal                             |
| `--color-muted`      | `#4a5767` | `#a9b6c4`        | Texto secundario                            |
| `--color-accent`     | `#0f766e` | `#2dd4bf`        | Tinta azul petróleo: botones, foco, enlaces |
| `--color-accent-ink` | `#0d5f58` | `#5eead4`        | Texto de acento sobre papel                 |
| `--color-marker`     | `#fff1a6` | amarillo al 28 % | Resaltador                                  |
| `--color-sticky`     | `#fdf0b5` | `#3a3417`        | Nota adhesiva                               |
| `--color-slate`      | `#172131` | `#0b1119`        | Bloques de código                           |

Contraste (WCAG AA): tinta sobre papel ≈ 15:1, texto secundario ≈ 7:1, acento sobre papel ≈ 5,4:1 y texto blanco sobre el botón de acento ≈ 5,5:1. En oscuro, tinta ≈ 14:1 y acento ≈ 9:1. Los números decorativos del 404/503 llevan `aria-hidden`.

El modo oscuro se activa con `prefers-color-scheme: dark` («libreta nocturna»): solo cambian los tokens, no la composición.

## Tipografía

| Familia        | Uso                                                                  |
| :------------- | :------------------------------------------------------------------- |
| Source Serif 4 | Titulares y títulos de tarjetas                                      |
| Source Sans 3  | Interfaz y prosa del lector (muy legible)                            |
| Caveat (OFL)   | **Solo acentos cortos**: antetítulos, notas al margen, nota adhesiva |
| JetBrains Mono | Código, editor, metadatos y etiquetas                                |

Todas están alojadas en `public/fonts` (licencias OFL; la de Caveat está en `public/fonts/LICENSE-caveat.txt`). La manuscrita nunca se usa para párrafos ni para texto por debajo de ~1,5 rem.

## Patrones de composición

- **Shell:** escritorio → cabecera con marca y pestañas (Diario / Artículos / Desafíos, y Estudio solo para cuentas autoras) → hoja con renglones, margen rojo y perforaciones → pie sobre el escritorio. La pestaña activa se funde con la hoja.
- **Portada:** antetítulo manuscrito, marca, línea del producto con resaltador y acciones → «Temas del cuaderno» (nube de etiquetas con 8 visibles y botón «Más etiquetas») → ficha destacada con la nota adhesiva «Lo más reciente» → «Publicadas recientemente» → «Entradas anteriores».
- **Archivo (`/articles`):** introducción y regreso → búsqueda → etiquetas → conteo de resultados → apuntes paginados (6 por página).
- **Lector (`/post/:slug`):** columna de ~70ch; cabecera con metadatos en monoespaciada y una raya de tinta; bloques de código color pizarra con botón de copiar.
- **Desafíos:** fichas con margen rojo; el detalle repite la columna del lector.
- **404 y 503:** número manuscrito en tinta roja, titular y dos acciones.
- **Estudio:** mismos tokens sobre la misma hoja; filas como fichas, editor de dos columnas con vista previa en vivo y diálogos de SweetAlert2 con la paleta del sitio.

## Estados de caída y copia sin conexión

- **Sello «Diario sin conexión»** en la cabecera siempre que `JournalService.offline` sea verdadero.
- **Nota adhesiva «Estás leyendo sin conexión»** encima del contenido cuando la página muestra la copia estática (`/offline/journal.json`) o datos de la caché del navegador. Dice la fecha de la copia, avisa que puede estar desactualizada y ofrece «Intentar de nuevo».
- Si no hay copia, se muestra el estado de error con «Intentar de nuevo». Una entrada inexistente nunca se rellena con la copia.

## Movimiento

Mínimo y con `prefers-reduced-motion`: entrada suave del encabezado de la portada y de la ficha destacada, subrayado de los títulos al pasar el cursor y una ligera inclinación de las notas adhesivas (se anula con movimiento reducido).

## Accesibilidad

Enlace «Saltar al contenido», `<main>` enfocable, navegación etiquetada, `aria-pressed` en los filtros, `aria-expanded` en «Más etiquetas», `aria-live` en resultados y en la nota sin conexión, `aria-current` en el paginador y foco visible de 2 px. La prueba E2E corre axe sobre la portada.

## Capturas

Las capturas de `docs/screenshots/` se generan con `npm run screenshots` contra los emuladores (Auth + Firestore) con datos importados de `public/content` y la cuenta falsa `admin@devchronicle.test`. Nunca se usan credenciales reales.
