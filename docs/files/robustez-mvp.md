# Robustez sin salir del MVP

El objetivo de este documento es priorizar mejoras que reduzcan fallos reales sin cambiar el alcance:
Angular en Hosting, Firestore, Auth de Google y plan Spark. Nada de aquí exige Cloud Functions, un
backend nuevo ni un plan de pago.

## Sesión 1 aplicada

La primera iteración del backlog ya está en el código:

- **Guard de cambios:** `src/app/core/guards/unsaved-changes.guard.ts` se registra como
  `canDeactivate` en `/admin/new` y `/admin/edit/:slug`. El editor compara el formulario con la última
  versión guardada, pide confirmación con SweetAlert2 y añade el aviso nativo de `beforeunload` al
  recargar. Guardar o borrar marca el formulario como limpio.
- **Reintento de lectura:** `src/app/core/rxjs/retry-transient.ts` reintenta solo errores
  `offline` dos veces con backoff (400 ms y 800 ms). Portada, archivo y lector muestran después un
  botón **Try again** que vuelve a suscribirse, sin recargar la página ni abrir un modal.
- **Pruebas:** 43 pruebas unitarias cubren acentos y mayúsculas, tags compartidos, cambio de filtro
  que vuelve a la página 1, fechas de publicación nulas, ventana de paginación, fallo de Firestore y
  reintento manual, además del guard.

## Lo que ya está cubierto

Antes de añadir nada, conviene no repetir lo que ya existe:

- Reglas de Firestore con pruebas (`npm run test:rules`): lectura pública solo de publicados, escritura
  solo para `admins/{uid}`.
- Entrada y cuerpo en una sola escritura por lote, así no queda metadata sin Markdown.
- Validación de slug, saneado del HTML con DOMPurify y render diferido del artículo.
- Estados de error diferenciados: `not-found` (404 interno) y `unavailable` (503), sin modal para un
  enlace roto.
- Confirmación antes de borrar y aviso de conexión (“Journal offline”).
- SEO por ruta, `robots.txt`, `sitemap.xml`, 404 con `noindex` y cabeceras de seguridad en Hosting.
- Pruebas unitarias de catálogo, archivo, lector, Studio, guard de admin y SEO.

## Prioridad 1: ahora, coste bajo

1. **Guard de cambios sin guardar en Studio.** Un `CanDeactivate` más `beforeunload` evita perder un
   markdown largo al navegar o recargar. Es el fallo más caro para el único autor del sitio.
2. **Reintento con backoff en lecturas.** Un fallo transitorio de Firestore (`unavailable`,
   `deadline-exceeded`) no debería dejar la portada vacía. Reintentar la lectura con un botón
   “Retry” visible; no reintentar escrituras automáticamente sin control de idempotencia.
3. **Concurrencia optimista al guardar.** Leer `updatedAt` antes de escribir o usar una transacción y
   rechazar si otra pestaña cambió la entrada. Hoy la última escritura gana en silencio.
4. **Pruebas de búsqueda, filtros y paginación.** Cubrir acentos, tags repetidos, cambio de filtro que
   vuelve a la página 1, fechas nulas y orden por fecha. Son casos baratos y ya hay base en
   `articles.spec.ts` y `landing.spec.ts`.
5. **Accesibilidad comprobable.** Enlace “saltar al contenido”, foco al cambiar de ruta, etiquetas
   explícitas en el editor y revisión de contraste de estados. Añadir `axe` a las pruebas o a CI es
   gratuito y detecta regresiones.
6. **Presupuestos de rendimiento.** Configurar `budgets` en `angular.json` para que el bundle del
   lector no crezca sin avisar. El resaltado ya es diferido; conviene que siga siéndolo.
7. **Exportación manual desde Studio.** Descargar un JSON o un ZIP de Markdown de todas las entradas.
   Firestore managed backups exige Blaze; una exportación manual cubre el riesgo real del MVP sin
   coste y encaja con el importador que ya existe.

## Prioridad 2: siguiente iteración

8. **App Check con reCAPTCHA v3.** Es gratuito y reduce el abuso de Firestore y Auth desde fuera del
   sitio. No cambia el modelo de datos; sí añade configuración y claves.
9. **Prueba E2E de humo con Playwright.** Un único flujo contra emuladores: entrar como admin, crear,
   publicar, buscar, abrir el artículo, borrar. Detecta lo que las pruebas de componente no ven.
10. **Monitorización de errores.** Un `ErrorHandler` global que registre errores no gestionados con
    contexto de ruta; si se quiere servicio externo, el plan gratuito de Sentry. No requiere backend
    propio.
11. **Monitor de disponibilidad externo.** Un chequeo gratuito a `/` y `/articles` avisa si Hosting o
    Firestore fallan antes que un lector.
12. **Validación de contenido en el importador.** Fallar el CI si un `.md` no parsea, si hay slugs
    duplicados o si faltan campos obligatorios. Evita publicar contenido roto.
13. **Sitemap con slugs desde `public/content`.** Se puede generar en el build sin consultar Firestore,
    manteniendo el sitemap estático. Los artículos creados solo en Firestore seguirían fuera.
14. **Preview channels de Hosting.** Publicar una URL temporal por rama para revisar el sitio real antes
    de `main`; el plan Spark lo permite con límites.

## Prioridad 3: deuda consciente

15. **Prerender o SSR para OG por artículo y 404 HTTP real.** Ya está documentado en
    `acabado-publico.md`. Requiere prerender con lista de rutas o una función; no es un bug.
16. **Backup automático programado.** Una GitHub Action con service account puede exportar Firestore,
    pero añade un secreto y una política de retención. Primero la exportación manual.
17. **Roles y multi-autor.** Hoy `admins/{uid}` es binario. Si el proyecto crece, conviene separar
    `editor`/`admin` y ajustar reglas. Fuera del MVP actual.
18. **Analítica.** Solo si aporta una decisión concreta; una opción respetuosa con la privacidad evita
    cookies y banner.

## Lo que no haría ahora

- Cloud Functions o un backend nuevo: rompe el límite Spark y añade superficie operativa.
- CMS externo o base de datos adicional: el modelo actual ya separa metadata y cuerpo.
- SSR completo: el sitio es pequeño y estático; el coste de mantenimiento supera el beneficio.
- Reintentos automáticos de escritura sin idempotencia: puede duplicar o pisar cambios.

## Orden sugerido

| Sesión | Trabajo                                                     |
| :----- | :---------------------------------------------------------- |
| 1      | Guard de cambios, reintento de lectura y pruebas de filtros |
| 2      | Exportación manual, accesibilidad y presupuestos de bundle  |
| 3      | E2E de humo en CI y validación del importador               |
| 4      | App Check y monitorización de errores/disponibilidad        |

## Checklist de comprobación

- [ ] `npm test`, `npm run test:rules` y `npm run build`.
- [ ] Recorrido manual del README contra los emuladores.
- [ ] Lighthouse móvil en `/` y `/post/:slug` (objetivo ≥ 90 en rendimiento, accesibilidad y SEO).
- [ ] Apagar Firestore a mitad de carga y comprobar mensaje, reintento y recuperación.
- [ ] Editar la misma entrada en dos pestañas y comprobar que no se pisa el contenido.
- [ ] Exportar, borrar una entrada de prueba y volver a importarla.
