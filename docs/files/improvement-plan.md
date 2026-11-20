# Plan de mejoras

Plan por fases derivado de [`audit.md`](./audit.md). Cada fila indica su estado: ✅ hecho, 🟡 preparado pero pendiente de configuración, ⏳ abierto, ⏸ diferido a propósito. Se prefieren las restricciones del plan Spark (Auth + Firestore + Hosting), salvo que una fase opte explícitamente por Blaze o por un servicio nuevo.

> **Estado al 20 nov 2026 (noche):** las fases 1 a 4 están aplicadas salvo 1.2 (avisos de dependencias de Firebase), 2.3 (App Check espera la clave) y lo diferido a conciencia (2.8, 4.6, 4.7, 4.9). Además se añadió la copia sin conexión estática (`/offline/journal.json`), siempre señalada como tal.

---

## Fase 1 — Mejoras rápidas

Para una iteración corta; riesgo bajo; mucha claridad.

| #   | Acción                                                                                                                                                                                          | Atiende | Notas                                                                                                                                                        |
| :-- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Actualizar **DOMPurify** (y volver a correr `npm audit`) en la ruta de compilación del Markdown; agregar una prueba de regresión de que los fixtures peligrosos siguen eliminándose             | C1      | ✅ Hecho: DOMPurify 3.4.18 y prueba de regresión `markdown-parser.service.spec.ts`. Mayor retorno en seguridad                                               |
| 1.2 | Parchear **@angular/router** (y el resto de Angular 22.x) dentro de la versión mayor actual                                                                                                     | H5      | ⏳ Abierto: quedan avisos en `@grpc/grpc-js` y `zod` (dependencias de Firebase); sin `--force`. Preferir `npm audit fix` sin forzar el retroceso de Firebase |
| 1.3 | Corregir la lista de slugs esperada de **`test:import`** (o comparar dinámicamente con `readdir`) para que el CI quede en verde                                                                 | H6      | ✅ Hecho: compara con los archivos reales                                                                                                                    |
| 1.4 | Actualizar los conteos de verificación del README (11 entradas, no 7) y enlazar este conjunto de documentos                                                                                     | M8      | ✅ Hecho                                                                                                                                                     |
| 1.5 | Distinguir el texto de **vacío frente a error** aun cuando `failed()` sea falso pero `offline` sea verdadero; mostrar siempre "Intentar de nuevo" cuando `JournalService.offline` sea verdadero | C2, M4  | ✅ Hecho: error + «Intentar de nuevo» o copia sin conexión señalada. Cambio pequeño de plantilla y signal                                                    |
| 1.6 | Suavizar el enlace al Estudio para usuarios anónimos (ocultarlo, rotularlo "Acceso de autor" o moverlo al pie)                                                                                  | H7      | ✅ Hecho: la pestaña «Estudio» solo aparece a autores; «Acceso del autor» en el pie                                                                          |
| 1.7 | Colapsar la nube de etiquetas: mostrar las N principales + "Más etiquetas", o mover los filtros debajo de la entrada destacada                                                                  | H8      | ✅ Hecho: «Temas del cuaderno» con 8 etiquetas y «Más etiquetas». La mayor mejora de experiencia en portada y móvil                                          |
| 1.8 | Agregar un enlace para saltar al contenido que apunte a `main#main`                                                                                                                             | M1      | ✅ Hecho: «Saltar al contenido»                                                                                                                              |
| 1.9 | Generar las URL del mapa del sitio a partir de los slugs de `public/content/*.md` en la compilación                                                                                             | H2      | ✅ Hecho. Coincide con la fuente que ya usa el importador                                                                                                    |

**Criterios de salida:** `npm test`, `npm run test:import`, `npm run lint` y `npm run build` en verde; la primera pantalla de la portada muestra la marca y la entrada destacada sin un estadio de etiquetas; C1 mitigado.

---

## Fase 2 — Correcciones de fondo y seguridad

Corrección, resistencia al abuso y seguridad del autor.

| #   | Acción                                                                                                                                                                                                          | Atiende | Notas                                                                                                                                                               |
| :-- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1 | Hacer confiables los fallos de lectura: mapear más códigos de Firestore y de red a `offline`; hacer fallar el flujo cuando la escucha muere; no emitir un `[]` exitoso después de un error sin limpiar `failed` | C2      | ✅ Hecho: más códigos, caché sin red = caída, E2E y copia sin conexión. Agregar un E2E con emulador que detenga Firestore y verifique "Intentar de nuevo" + medalla |
| 2.2 | Concurrencia optimista: comparar `updatedAt` (transacción o precondición) antes de guardar en el Estudio; mostrar una interfaz de conflicto                                                                     | H4      | ✅ Hecho: `runTransaction` compara `updatedAt`; diálogo de conflicto                                                                                                |
| 2.3 | Activar **App Check** (reCAPTCHA v3) en Auth y Firestore                                                                                                                                                        | M7      | 🟡 Preparado detrás de `FIREBASE_APPCHECK_SITE_KEY`; falta crear la clave y activarlo en la consola (ver `hosting.md`). Gratis; requiere configuración y claves     |
| 2.4 | **Exportación** desde el Estudio (JSON o zip de Markdown) de todas las entradas                                                                                                                                 | M7      | ✅ Hecho: «Exportar copia de seguridad» en el Estudio. Copia de seguridad manual sin Blaze                                                                          |
| 2.5 | Prueba de humo con Playwright contra los emuladores: navegar lo público → acceso de admin → crear → publicar → buscar → eliminar                                                                                | M6      | ✅ Hecho: `npm run test:e2e` en CI con `emulators:exec`. Ejecutar en CI con `emulators:exec`                                                                        |
| 2.6 | axe (o equivalente) en CI unitario o E2E; corregir el contraste de indicadores y texto atenuado; manejar el foco al cambiar de ruta y en SweetAlert                                                             | M1      | ✅ Hecho: axe en el E2E, contraste AA de la libreta, `FocusService`                                                                                                 |
| 2.7 | Documentar o automatizar `test:rules` junto a una pila en ejecución (puertos alternos o solo `emulators:exec`)                                                                                                  | M6      | ✅ Hecho: `firebase.rules-test.json` en el puerto 8180                                                                                                              |
| 2.8 | Prerenderizar las rutas críticas **o** un shell HTML en Hosting/Cloud Functions para `/post/:slug` con un 404 HTTP real                                                                                         | H1, H3  | ⏸ Diferido: requiere salir de Spark (ver `acabado-publico.md`). Puede salir de Spark; decidirlo con conciencia                                                      |
| 2.9 | Mantener la cadencia de dependencias: alinear los motores de Firebase y Node (Node 22 frente a paquetes que piden 24)                                                                                           | H5, L6  | ✅ Hecho: `engines.node` `>=22 <25`                                                                                                                                 |

**Criterios de salida:** una caída forzada de Firestore muestra el reintento y la medalla sin conexión el 100 % de las veces; conflicto detectado al guardar desde dos pestañas; E2E + reglas + importador en CI; App Check activo en un entorno de pruebas.

---

## Fase 3 — Renovación del diseño

Lograr que el diario se sienta de autor y no generado (hecho con la libreta de apuntes, ver `design.md`). Conservar los bloques de código color pizarra y la medida de lectura.

| #   | Acción                                                                                                                                                                            | Atiende         | Notas                                                                                                                                              |
| :-- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Reemplazar Inter por una pareja distintiva de interfaz y titulares; mantener JetBrains Mono para el código; cargarlas desde `public/fonts`                                        | L2, design.md   | ✅ Hecho: Source Serif 4 + Source Sans 3; Caveat solo para acentos. Evitar los valores por defecto Inter/Roboto/Arial                              |
| 3.2 | Redefinir los tokens: un lienzo más rico (grano o cuadrícula sutil), jerarquía de tinta y pizarra, un acento que no sea el sky-500 por defecto                                    | L2              | ✅ Hecho: libreta de apuntes (renglones, margen, tinta azul petróleo) y modo oscuro. Alejarse del brillo morado y de los clichés crema + terracota |
| 3.3 | Una marca nueva (logotipo o monograma) que funcione sin el nombre                                                                                                                 | L1              | ✅ Hecho: monograma «DC» sobre hoja con renglones                                                                                                  |
| 3.4 | Portada como **una sola composición**: marca, una línea, una llamada a la acción, una entrada destacada; filtros en segundo plano                                                 | H8, design.md   | ✅ Hecho                                                                                                                                           |
| 3.5 | Reducir el marco de las tarjetas donde no son interactivas; la entrada destacada como un plano pizarra a sangre, no un grupo de widgets con borde                                 | Gusto de diseño | ✅ Hecho: apuntes sin marco; la destacada es una ficha                                                                                             |
| 3.6 | 2–3 movimientos intencionales (por ejemplo, el desvanecimiento de tinta de la destacada, la aparición de la barra del código, el despliegue de filtros), sin llenar de decoración | Gusto de diseño | ✅ Hecho: entrada de la portada, ficha destacada y barra del código                                                                                |
| 3.7 | Estrategia bilingüe: selector de idioma de la interfaz **o** normalizar el nombre de etiquetas y series                                                                           | M3              | ✅ Hecho: etiquetas unificadas en español en el repo y en Firestore; alias en `tag-normalize.ts`                                                   |
| 3.8 | Rediseñar los modales de confirmación para que combinen con Civic Terminal (o reemplazar SweetAlert por un diálogo propio)                                                        | L2              | ✅ Hecho: diálogos con la paleta de la libreta                                                                                                     |
| 3.9 | Actualizar `docs/screenshots` tras la pasada visual                                                                                                                               | —               | ✅ Hecho: `npm run screenshots` contra emuladores                                                                                                  |

**Criterios de salida:** prueba de marca: la portada sin la navegación se sigue leyendo como DevChronicle; Lighthouse de accesibilidad ≥ 90 en `/` y `/post/:slug`; design.md actualizado a los tokens nuevos.

---

## Fase 4 — Extras

| #   | Acción                                                                                    | Atiende                | Notas                                                                       |
| :-- | :---------------------------------------------------------------------------------------- | :--------------------- | :-------------------------------------------------------------------------- |
| 4.1 | Podar o reducir a un subconjunto los lenguajes de highlight.js que usa el corpus          | M2                     | ✅ Hecho                                                                    |
| 4.2 | Canales de vista previa de Hosting por PR                                                 | pendientes de robustez | ✅ Hecho                                                                    |
| 4.3 | `ErrorHandler` global + Sentry en su nivel gratuito (opcional)                            | robustez               | ✅ Hecho (Sentry opcional con `SENTRY_DSN`)                                 |
| 4.4 | Chequeo externo de disponibilidad en `/` y `/articles`                                    | robustez               | ✅ Hecho: incluye `/challenges` y la copia sin conexión                     |
| 4.5 | Acción programada de exportación (cuenta de servicio) cuando exista la exportación manual | M7                     | ✅ Hecho: semanal                                                           |
| 4.6 | Roles de varios autores (`editor` / `admin`) si aparecen colaboradores                    | Diferido               | ⏸ Diferido                                                                  |
| 4.7 | Analítica respetuosa con la privacidad solo si una decisión concreta necesita datos       | Diferido               | ⏸ Diferido                                                                  |
| 4.8 | Actualizar los ensayos heredados que aún describen `index.json` como fuente en ejecución  | L5                     | ✅ Hecho. Contenido, no código (los cuatro ensayos base ya se actualizaron) |
| 4.9 | SSR completo opcional: solo si el prerenderizado (2.8) resulta insuficiente               | Diferido               | ⏸ Diferido                                                                  |

---

## Secuencia sugerida

```
Fase 1 (mejoras rápidas)
    → Fase 2 (modos de fallo, concurrencia, App Check, E2E)
        → Fase 3 (identidad visual)
            → Fase 4 (pulido de rendimiento, extras operativos)
```

La Fase 3 puede solaparse con el final de la Fase 2 una vez que el trabajo de fallos y seguridad ya no mueva el CSS compartido del diseño.

---

## Fuera de alcance (por ahora)

- Reescribir sobre un CMS o una base de datos nueva
- Cloud Functions, salvo que se elijan para tener 404 y OG reales en HTML
- Reintentos automáticos de escritura sin claves de idempotencia
- Ir más allá de un MVP de un solo autor hasta que lleguen la exportación y la concurrencia de la Fase 2
