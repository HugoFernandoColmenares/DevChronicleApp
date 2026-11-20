# DevChronicleApp — Auditoría de producto e ingeniería

**Producto:** DevChronicle (paquete Angular `dev-chronicle`)  
**Dominio:** diario basado en Markdown para notas de arquitectura, práctica con Angular y ensayos técnicos  
**Fecha de la auditoría:** 20 nov 2026 (America/Bogota)  
**Entorno auditado:** `npm run emulators` + `import:emulator` + `seed:admin` + `npm start` en `http://127.0.0.1:4200/`  
**Evidencia:** capturas en [`docs/screenshots/`](../screenshots/); arquitectura en [`architecture.md`](./architecture.md); sistema de diseño en [`design.md`](./design.md)

Este documento ordena los hallazgos por gravedad. **No** implementa correcciones.

> **Estado posterior (20 nov 2026, noche):** corregidos C1, C2, H2, H4, H6, H7, H8, M1, M3, M4, M5 (en lo que toca a textos), M6, M7 (App Check queda preparado detrás de `FIREBASE_APPCHECK_SITE_KEY`), M8, L1, L2, L3 y L5. Siguen abiertos H1 y H3 (requieren prerenderizado o Functions, fuera de Spark), H5 en lo que depende de Firebase (`@grpc/grpc-js`, `zod`), M2 en parte, L4 y L6 (entorno local). **Las capturas enlazadas se regeneraron con la interfaz corregida** (libreta de apuntes, en español); muestran el estado actual, no el que se auditó. El seguimiento por punto está en [`improvement-plan.md`](./improvement-plan.md).

---

## Resumen ejecutivo

La superficie de lectura pública funciona de punta a punta contra los emuladores: catálogo, búsqueda, etiquetas, paginación, lector con copia de código, 404 blandos, autenticación de Google para el Estudio, protecciones contra cambios sin guardar y `npm run build` de producción. Los principales riesgos son (1) fallos de Firestore que se presentan como un diario vacío en lugar de un error recuperable, (2) CVE del sanitizador de HTML en la ruta de Markdown → `[innerHTML]`, (3) los límites de SEO de una SPA pura (404 blandos, mapa del sitio escaso, vistas previas sociales genéricas) y (4) una identidad visual que se lee como un kit competente por defecto y no como un diario de campo hecho a mano.

---

## Método

| Ángulo          | Qué se ejercitó                                                                                                                                                                                                                                                               |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usuario común   | Portada, filtros por etiqueta, búsqueda en el archivo (con y sin resultados), lectura de un artículo y copia de código, 404, la puerta de acceso al Estudio, móvil a 390 px                                                                                                   |
| QA / ingeniería | Rutas y redirecciones, admin / denegado / lista / editor, diálogo de cambios sin guardar, revisión de reglas, uso de DOMPurify, muestreo de metadatos SEO, revisión puntual de accesibilidad, `npm test` / `lint` / `build`, `npm audit`, desfase de la prueba del importador |
| Gusto de diseño | Tokens, tipografía, marco, densidad de etiquetas, coherencia entre el Estudio y lo público, originalidad frente a patrones genéricos de IA o por defecto                                                                                                                      |

Roles: **lector anónimo** y **único autor administrador** (`admins/{uid}`). No existe un tercer rol.

---

## Crítico

### C1 — CVE de la dependencia del sanitizador en la ruta de render de HTML

- **Evidencia:** `npm audit --omit=dev` reporta varios avisos de **DOMPurify** (≤3.4.16), incluidas clases de XSS en el DOM (manejadores de subárboles desconectados, reanálisis de plantillas). Ruta de producción: `MarkdownParserService.compile` → `DOMPurify.sanitize` → `bypassSecurityTrustHtml` en el lector y en la vista previa del Estudio (`src/app/core/services/markdown-parser.service.ts`, `article-viewer.ts`, `admin-editor.ts`).
- **Por qué es crítico:** el Markdown publicado es el producto. Cualquier evasión del sanitizador se convierte en XSS almacenado para todos los lectores.
- **Captura / código:** artículo renderizado con cuerpo HTML — [`article-desktop.png`](../screenshots/article-desktop.png), [`article-code-desktop.png`](../screenshots/article-code-desktop.png).

### C2 — Una caída de Firestore se presenta como un catálogo vacío

- **Evidencia:** con las peticiones a Firestore forzadas a fallar (`8080` abortado / HTTP 500), `/articles` y `/` mostraron **"Aún no hay entradas publicadas."** con **cero** botones "Intentar de nuevo" y **sin** la medalla "Diario sin conexión", varios segundos después. La interfaz de fallo diseñada existe en `articles.html` / `landing.html` (`failed()` → alerta + botón) y tiene pruebas unitarias, pero el modo de fallo observado en vivo no activó `failed()`.
- **Por qué es crítico:** los lectores (y el autor) concluyen que el diario se borró o se despublicó; nunca aparece la forma de recuperarse. El paso 7 de verificación del README supone lo contrario.
- **Capturas:** [`articles-failure-as-empty-desktop.png`](../screenshots/articles-failure-as-empty-desktop.png), [`landing-retry-desktop.png`](../screenshots/landing-retry-desktop.png). Diseño previsto del reintento (DOM con las clases de producción cuando la ruta en vivo no se activó): [`articles-retry-desktop.png`](../screenshots/articles-retry-desktop.png).

---

## Alto

### H1 — HTTP 200 blando para URL desconocidas y entradas inexistentes

- **Evidencia:** la reescritura de la SPA en Hosting sirve `index.html` para todas las rutas; el cliente muestra la interfaz de no encontrado / "no publicada" con `noindex`, pero el estado sigue siendo 200. Documentado en las notas operativas en español y en el README.
- **Impacto:** los rastreadores y monitores de disponibilidad clasifican mal las URL inexistentes; se resienten la autoridad de los enlaces y el monitoreo.
- **Capturas:** [`not-found-desktop.png`](../screenshots/not-found-desktop.png), [`article-not-found-desktop.png`](../screenshots/article-not-found-desktop.png), [`not-found-mobile.png`](../screenshots/not-found-mobile.png).

### H2 — El mapa del sitio omite todos los slugs de artículos

- **Evidencia:** el `public/sitemap.xml` generado lista solo `/` y `/articles`. Once artículos publicados son invisibles para quien consuma el mapa.
- **Impacto:** el descubrimiento del grafo de contenido depende por completo del rastreo desde el HTML del catálogo.

### H3 — Las vistas previas Open Graph por artículo son imposibles sin prerenderizado

- **Evidencia:** los metadatos en vivo de `/post/welcome-to-devchronicle` son correctos **después** de ejecutar JS (JSON-LD `BlogPosting`, canónico, descripción). Los rastreadores sociales solo ven la tarjeta general del sitio en `index.html` (`acabado-publico.md`).
- **Impacto:** al compartir ensayos individuales, la vista previa se ve genérica.

### H4 — Sin concurrencia optimista al guardar en el Estudio

- **Evidencia:** `JournalService.save` envía un lote de `set` sin leer ni comparar `updatedAt`. Con dos pestañas, gana la última escritura sin avisar. Señalado en `robustez-mvp.md`.
- **Impacto:** en un ensayo largo en Markdown, una sobrescritura silenciosa es pérdida de datos.

### H5 — Avisos de dependencias de producción más allá de DOMPurify

- **Evidencia:** `npm audit --omit=dev`: avisos de DoS en **@angular/router** (22.0.0–22.2.0; menos graves sin SSR, pero sin parchear en el árbol), **@grpc/grpc-js** vía Firebase y **zod** transitivo. El árbol completo reporta 39 problemas, con críticos en herramientas de desarrollo.
- **Impacto:** higiene de actualizaciones y riesgo de cadena de suministro; las advertencias de motor de Node ya muestran paquetes de Firebase que piden Node ≥24 mientras el repositorio exige Node 22.

### H6 — La prueba unitaria del importador quedó desactualizada frente al corpus

- **Evidencia:** `npm run test:import` falla: esperaba 7 slugs y el catálogo ahora tiene 11 (tutoriales nuevos en `public/content/`). La aserción es una lista fija en `tests/markdown-entry.test.mjs`.
- **Impacto:** la señal de CI es roja o ruidosa; las regresiones del importador pueden esconderse detrás de una suite que ya falla.

### H7 — La navegación pública expone el Estudio a todos los visitantes

- **Evidencia:** la cabecera siempre enlaza Diario / Artículos / **Estudio** ([`landing-desktop.png`](../screenshots/landing-desktop.png)). Los usuarios anónimos chocan con un muro de Google que explica detalles internos de `admins` ([`admin-login-desktop.png`](../screenshots/admin-login-desktop.png)).
- **Impacto:** confunde a los lectores; filtra la superficie de autoría; debilita la primera impresión ("¿esto es el panel de mi blog?").

### H8 — La nube de etiquetas domina la primera pantalla

- **Evidencia:** la portada coloca un muro denso de chips bilingües encima de la entrada destacada ([`landing-desktop.png`](../screenshots/landing-desktop.png), [`landing-mobile.png`](../screenshots/landing-mobile.png)). En móvil, sobre todo, la tarjeta destacada queda bajo el pliegue.
- **Impacto:** el contenido principal (el ensayo más reciente) pierde visibilidad frente al marco de filtros.

---

## Medio

### M1 — Brechas de accesibilidad frente a las referencias tipo WCAG

- **Evidencia:** revisión puntual en `/`: `<main>` existe pero **sin `id`**, **sin enlace para saltar al contenido**; no se encontró manejo del foco al cambiar de ruta. Los antetítulos, el texto atenuado y los indicadores con tinte de acento pueden no cumplir el contraste en algunos casos (`.pill--on` usa un tinte de acento al 16 % con `#0369a1`). El diálogo de descartar de SweetAlert tiene estilo propio ([`admin-unsaved-changes.png`](../screenshots/admin-unsaved-changes.png)); la trampa de foco y el etiquetado no están cubiertos por un CI automático de accesibilidad (no hay ninguno configurado).
- **Impacto:** a los usuarios de teclado y lector de pantalla les cuesta más; las regresiones pasan inadvertidas.

### M2 — Peso del paquete: el fragmento diferido del resaltador pesa ~976 kB sin comprimir

- **Evidencia:** la compilación de producción lista el fragmento diferido `index` con **975,62 kB** (gzip ~244 kB), la ruta de highlight.js. El total inicial es ~776 kB sin comprimir / ~208 kB de transferencia. Hay presupuestos (`900kB` / `1.2MB` iniciales), pero la carga diferida del resaltador es grande para un sitio de lectura.
- **Impacto:** la primera visita a un bloque de código paga una descarga pesada en redes lentas.

### M3 — Fricción entre la interfaz en inglés y el contenido en español

- **Evidencia:** la interfaz estaba en inglés; los títulos, resúmenes y muchas etiquetas, en español ([`articles-desktop.png`](../screenshots/articles-desktop.png)). Etiquetas conceptualmente duplicadas (`architecture` / `arquitectura`).
- **Impacto:** la búsqueda y los filtros se sienten inconsistentes; aumenta el ruido de la nube de etiquetas.
- **Estado:** la interfaz y los documentos públicos ya están en español; queda unificar las etiquetas duplicadas.

### M4 — Los textos de vacío y de error se confunden con facilidad

- **Evidencia:** catálogo vacío ("Aún no hay entradas publicadas.") frente a carga fallida frente a "Ningún artículo coincide con estos filtros." ([`articles-empty-search-desktop.png`](../screenshots/articles-empty-search-desktop.png)). Combinado con C2, el vacío se vuelve la metáfora equivocada por defecto para un fallo.

### M5 — El estado denegado es escaso; el acceso explica detalles internos de seguridad

- **Evidencia:** [`admin-denied-desktop.png`](../screenshots/admin-denied-desktop.png), [`admin-login-desktop.png`](../screenshots/admin-login-desktop.png). El acceso menciona la colección `admins` por nombre: correcto para el autor, raro para cualquier otra persona que pulse Estudio.

### M6 — Sin suite E2E; las pruebas de reglas chocan con un emulador en ejecución

- **Evidencia:** no hay Playwright ni Cypress en el repositorio. `npm run test:rules` falló aquí con "puerto 8080 ocupado" mientras `npm run emulators` ya estaba activo: la documentación supone uso exclusivo de los emuladores.
- **Impacto:** la ventana de Auth, las cabeceras de Hosting y los flujos reales de la medalla sin conexión solo se prueban a mano.

### M7 — Faltan App Check, exportación y copia de seguridad automática

- **Evidencia:** pendientes del MVP en Spark en `robustez-mvp.md`. Se puede automatizar un cliente contra las lecturas públicas; el autor no tiene exportación de un clic desde el Estudio.

### M8 — Los conteos de verificación local del README estaban desactualizados

- **Evidencia:** el README aún decía "7 entradas publicadas" / "Mostrando 1–6 de 7"; la importación al emulador ahora da **11** entradas ([`articles-desktop.png`](../screenshots/articles-desktop.png) "Mostrando 1–6 de 11").

---

## Bajo

### L1 — La marca es un cuadrado plano de acento

- **Evidencia:** la marca de la cabecera y del pie en todas las capturas. Un nombre memorable, un glifo olvidable.

### L2 — Inter + celeste `#0ea5e9` + `#fafafa` se lee como un kit por defecto

- **Evidencia:** conjunto de tokens en `styles.css`; capturas de portada y archivo. Se solapa con estéticas comunes de IA y de iniciadores de Tailwind (ver Gusto de diseño).

### L3 — El estado activo de la navegación del Estudio es fácil de pasar por alto

- **Evidencia:** en las pantallas de lista y editor, los estilos activos pizarra sobre pizarra son sutiles ([`admin-list-desktop.png`](../screenshots/admin-list-desktop.png)).

### L4 — El indicador de analíticas del CLI de Angular quedó escrito en local

- **Evidencia:** `angular.json` ganó `"analytics": false` durante el primer `ng serve` de esta auditoría. Inofensivo, pero ruidoso en los PR si no fue intencional.

### L5 — Contenido heredado que aún describe `index.json` como fuente en ejecución

- **Evidencia:** el texto de vista previa de la entrada de bienvenida aún narra la publicación basada en archivos ([`admin-editor.png`](../screenshots/admin-editor.png), panel de vista previa) mientras que en ejecución se usa Firestore: confuso para quien lea ese ensayo por primera vez.

### L6 — `packageManager` fija npm 12; el entorno tenía npm 10.9.9

- **Evidencia:** la instalación funcionó con advertencias de motor. Fricción menor para quien contribuya.

---

## Ángulo A — Usuario común

**Primera impresión:** tranquilo, legible, profesional. La línea "Notas de campo para software que funciona." es clara. La tarjeta destacada color pizarra indica "esto es un producto de lectura".

**Fricciones:**

1. Muro de etiquetas antes del contenido (sobre todo en móvil).
2. El Estudio en la navegación principal invita a una ventana de Google sin salida.
3. Idiomas mezclados sin explicación.
4. La búsqueda vive solo en `/articles`: la portada tiene filtros pero no búsqueda de texto.
5. Si Firestore parpadea, el sitio puede parecer abandonado (C2).

**Lo que funciona:** la búsqueda del archivo (`nestjs` → un resultado — [`articles-search-desktop.png`](../screenshots/articles-search-desktop.png)); el botón para limpiar una búsqueda sin resultados ([`articles-empty-search-desktop.png`](../screenshots/articles-empty-search-desktop.png)); la columna del lector y la copia en los bloques de código; los 404 ofrecen dos salidas; la protección de cambios sin guardar cuida al autor ([`admin-unsaved-changes.png`](../screenshots/admin-unsaved-changes.png)).

---

## Ángulo B — Lista de verificación de QA e ingeniería

| Área                     | Estado                     | Notas                                                                                                       |
| :----------------------- | :------------------------- | :---------------------------------------------------------------------------------------------------------- |
| Rutas / enlaces directos | Bien                       | `/articulos` → `/articles`; 404 comodín; un slug inválido se trata como no publicado                        |
| Auth / RBAC              | Bien para el MVP           | Google + `admins/{uid}`; la página de denegado funciona; los clientes no pueden escribir `admins`           |
| Reglas                   | Sólidas                    | Validación de campos, tamaño del cuerpo, lecturas públicas solo de publicadas; existe la suite `test:rules` |
| Validación               | Bien                       | Patrón del slug antes de consultar; validadores de formulario reactivo en el editor                         |
| Robustez del editor      | Buena                      | Seguimiento de cambios, `beforeunload`, confirmación con SweetAlert                                         |
| Concurrencia             | Brecha                     | H4                                                                                                          |
| Búsqueda                 | Buena                      | Se ignoran los acentos en el archivo; con cobertura unitaria                                                |
| SEO / metadatos          | Parcial                    | Metadatos del cliente sólidos; H1–H3 limitan el uso al compartir y al rastrear en producción                |
| Accesibilidad            | Parcial                    | M1                                                                                                          |
| Rendimiento              | Mixto                      | Carga inicial aceptable; fragmento del resaltador pesado (M2)                                               |
| Consola / red            | Limpias en el camino feliz | No se observaron errores de página en las rutas públicas durante la captura                                 |
| Pruebas                  | Mixtas                     | 43/43 unitarias pasan; `test:import` falla (H6); las reglas necesitan un puerto libre de Firestore          |
| Dependencias             | En riesgo                  | C1, H5                                                                                                      |
| Compilación / despliegue | Bien                       | `npm run build` funcionó; existe el flujo de Hosting                                                        |

---

## Ángulo C — Veredicto de gusto de diseño

La interfaz es **competente y coherente**, no está rota: marco color pizarra, página en lienzo, acento celeste, Inter + JetBrains Mono, tarjeta destacada color pizarra. Todavía **no** se siente hecha a mano para una crónica personal de ingeniería. Señales concretas:

- Inter + `#0ea5e9` sobre `#fafafa` es una combinación típica de "SaaS / documentación moderna".
- El logo es literalmente un cuadrado de acento.
- Las etiquetas y las cuadrículas de tarjetas parecen el catálogo de una biblioteca de componentes, no un cuaderno.
- No hay un ancla fotográfica ni ilustrada: la atmósfera es solo relleno plano.
- El modal con signo de interrogación de SweetAlert es un marco genérico de terceros en un shell por lo demás propio.

**Dirección de arte sugerida:** "cuaderno de campo bajo una lámpara de escritorio": papel cálido o grano de plano técnico frío (no el cliché crema #F4F1EA + terracota), una tipografía de titulares con carácter de tinta (evitar Inter), monoespaciada para los números y antetítulos de marca, una textura a sangre completa o la fotografía de un escritorio o terminal real detrás de la introducción de la portada, y una composición de portada que sea **marca + una línea + una entrada destacada** sin un estadio de etiquetas en la primera pantalla. Conservar los bloques de código color pizarra; hoy son el elemento distintivo más fuerte.

---

## Índice de capturas

| Archivo                                              | Estado                                   |
| :--------------------------------------------------- | :--------------------------------------- |
| `landing-desktop.png`                                | Portada, escritorio                      |
| `landing-mobile.png`                                 | Portada, móvil                           |
| `landing-tag-filter-desktop.png`                     | Filtro por etiqueta activo               |
| `landing-series.png` / `landing-earlier-desktop.png` | Secciones recientes / anteriores         |
| `landing-retry-desktop.png`                          | Fallo presentado como vacío              |
| `articles-desktop.png`                               | Archivo                                  |
| `articles-mobile.png`                                | Archivo en móvil                         |
| `articles-search-desktop.png`                        | Búsqueda `nestjs`                        |
| `articles-empty-search-desktop.png`                  | Sin coincidencias                        |
| `articles-failure-as-empty-desktop.png`              | Caída → texto de vacío                   |
| `articles-retry-desktop.png`                         | Interfaz diseñada de "Intentar de nuevo" |
| `article-desktop.png` / `article-mobile.png`         | Lector                                   |
| `article-code-desktop.png`                           | Bloque de código                         |
| `post-*.png`                                         | Artículos de muestra / código / móvil    |
| `article-not-found-desktop.png`                      | Slug inexistente                         |
| `not-found-desktop.png` / `not-found-mobile.png`     | 404 comodín                              |
| `admin-login-desktop.png` / `admin-login-mobile.png` | Estudio sin sesión                       |
| `admin-auth-emulator-widget.png`                     | Selector de cuenta del emulador de Auth  |
| `admin-denied-desktop.png`                           | No autor                                 |
| `admin-list-desktop.png`                             | Lista de entradas                        |
| `admin-editor.png` / `admin-editor-new-desktop.png`  | Editar / crear                           |
| `admin-unsaved-changes.png`                          | Confirmar descartar                      |

---

## Comandos de verificación ejecutados

| Comando                | Resultado                                                                  |
| :--------------------- | :------------------------------------------------------------------------- |
| `npm test`             | Pasa — 43 pruebas                                                          |
| `npm run lint`         | Pasa                                                                       |
| `npm run build`        | Pasa → `dist/DevChronicle`                                                 |
| `npm run test:import`  | Falla — lista de slugs obsoleta (H6)                                       |
| `npm run test:rules`   | No pudo iniciar un segundo emulador de Firestore (puerto en uso)           |
| `npm audit --omit=dev` | 7 problemas en el árbol de producción (incluidos DOMPurify, router y grpc) |
