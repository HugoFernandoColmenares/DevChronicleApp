# Diseño — Civic Terminal

La superficie pública de DevChronicle se apoda **Civic Terminal**: una sala de lectura para notas de software que funciona. La promesa del producto es encontrar y leer con comodidad: el marco debe desaparecer detrás de la prosa y el código.

Las notas operativas en español sobre los mismos tokens están en [`diseno.md`](./diseno.md). Este archivo describe el sistema de interfaz actual tal como está implementado en `src/styles.css` y en los estilos de cada sección.

## Marca y voz

- **Nombre:** DevChronicle (marca en la cabecera; el H1 de la portada es la línea del producto, "Notas de campo para software que funciona.")
- **Voz:** directa y técnica. La interfaz y el contenido están en español; algunas etiquetas conservan términos técnicos en inglés.
- **Marca gráfica:** un cuadrado de acento de 1×1 junto al nombre: funcional, no ilustrativo.

## Tokens (`:root` en `src/styles.css`)

| Token                                | Valor                            | Rol                                                      |
| :----------------------------------- | :------------------------------- | :------------------------------------------------------- |
| `--color-canvas`                     | `#fafafa`                        | Fondo de la página                                       |
| `--color-slate`                      | `#1e293b`                        | Cabecera, pie, tarjeta destacada y marco del código      |
| `--color-accent`                     | `#0ea5e9`                        | Enlaces, llamadas a la acción, anillo de foco, etiquetas |
| `--color-accent-ink`                 | `#0369a1`                        | Texto de acento sobre superficies claras                 |
| `--color-ink`                        | `#0f172a`                        | Texto del cuerpo                                         |
| `--color-muted`                      | `#64748b`                        | Texto secundario y antetítulos                           |
| `--color-divider`                    | `#e2e8f0`                        | Líneas y bordes de tarjetas                              |
| `--color-string` / `--color-keyword` | `#10b981` / `#8b5cf6`            | Acentos de sintaxis                                      |
| `--font-ui`                          | Inter (con respaldo del sistema) | Interfaz y prosa                                         |
| `--font-mono`                        | JetBrains Mono                   | Código, editor y números del 404                         |

Las fuentes están alojadas en `public/fonts`. El foco usa un contorno de acento de 2 px (`:focus-visible`).

## Patrones de composición

- **Portada:** texto de introducción → filtros de etiquetas → tarjeta destacada color pizarra → riel compacto "Publicadas recientemente" → cuadrícula "Entradas anteriores".
- **Archivo (`/articles`):** introducción y botón de regreso → búsqueda → etiquetas → conteo de resultados → cuadrícula paginada (6 por página).
- **Lector (`/post/:slug`):** columna de ~70ch (`.article-canvas`), bloques de código color pizarra y control de copiar en cada uno.
- **Estudio:** mismos tokens; filas de lista con indicadores de estado; el editor es un formulario de dos columnas con vista previa de Markdown en vivo. SweetAlert2 confirma descartar o eliminar y usa la paleta del sitio.
- **Shell:** cabecera color pizarra (Diario / Artículos / Estudio) y pie color pizarra. La medalla "Diario sin conexión" aparece en la cabecera cuando `JournalService.offline` es verdadero.

## Componentes

Las tarjetas (`.article-card`) son la unidad interactiva principal del catálogo: tarjetas claras con borde, y la variante destacada se rellena de color pizarra. Las etiquetas son chips con un tinte de acento. Los indicadores marcan borrador o publicada en el Estudio. Los esqueletos de carga reservan el espacio del catálogo mientras Firestore responde.

## Movimiento y atmósfera

El movimiento es mínimo: subrayados o degradados en los enlaces y cambios de borde al pasar el cursor sobre las tarjetas. No hay imágenes de portada, sistema de ilustración ni texturas de ambiente: la atmósfera sale casi por completo del contraste tipográfico (pizarra frente al lienzo) y de la tarjeta destacada.

## Accesibilidad que existe hoy

- Región `<main>`, etiqueta en la navegación principal, `role="group"` en los filtros, etiquetas en el paginador, `aria-live` en los resultados del archivo, `aria-current` en las páginas, marcas decorativas con `aria-hidden` y estilos de foco visibles.
- Los pendientes (enlace para saltar al contenido, manejo del foco entre rutas, contraste en algunas combinaciones de gris y acento, y trampas de foco de SweetAlert) están registrados en la auditoría.

## Capturas

Las capturas de `docs/screenshots/` se tomaron con `ng serve` + emuladores a 1440×900 (escritorio) y 390×844 (móvil), incluidos los flujos autenticados del Estudio con la cuenta `admin@devchronicle.test` del emulador de Auth. Las capturas de la auditoría muestran la interfaz en inglés de esa fecha; las capturas de la portada, el archivo, el lector, el 404 y la vista móvil que usa el README se actualizaron a la interfaz en español.

## Dirección de arte (actual frente a la prevista)

**Actual:** blog de desarrollo limpio y utilitario. Distintivo sobre todo por el nombre ("Civic Terminal", la tarjeta destacada color pizarra), pero visualmente cercano a un kit por defecto de Inter y azul cielo al estilo Tailwind.

**Renovación prevista (ver la Fase 3 del plan de mejoras):** tratar el diario como un cuaderno de campo: grano de papel táctil o un lienzo con renglones sutiles, una tipografía de titulares con más carácter de autor que Inter, la monoespaciada como señal de marca de primer nivel y menos grupos de indicadores. Mantener la relación pizarra/código y evolucionar la portada para que la marca y la primera entrada compartan una sola composición, en lugar de un tablero de filtros y luego tarjetas.
