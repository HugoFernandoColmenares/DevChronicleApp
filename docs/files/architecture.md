# Arquitectura

DevChronicleApp es el cliente Angular 22 de **DevChronicle**, un diario de software basado en Markdown. Los datos en ejecución viven en Cloud Firestore. El navegador compila el Markdown a HTML. El despliegue apunta al plan Spark de Firebase: solo Authentication (Google), Firestore y Hosting, sin Cloud Functions, sin Cloud Storage ni complementos de pago.

Repositorios relacionados: [DevChronicle](https://github.com/HugoFernandoColmenares/DevChronicle) (orquestación anterior) y [DevChronicleApi](https://github.com/HugoFernandoColmenares/DevChronicleApi) (API anterior en Rust y SQLite). Ninguno es ya la fuente de verdad en ejecución. `public/content/*.md` sigue siendo la fuente de **importación** para poblar Firestore.

## Topología en ejecución

```
Navegador (SPA de Angular)
  ├─ Firebase Auth  → inicio de sesión con Google (solo Estudio)
  └─ Cloud Firestore
       ├─ entries/{slug}              tarjeta de metadatos
       ├─ entries/{slug}/body/current { markdown }
       ├─ challenges/{slug}           desafíos de programación (enunciado / pista / solución)
       ├─ admins/{uid}                puerta del autor en el Estudio (solo consola o Admin SDK)
       └─ editors/{uid}               puerta de publicación API/MCP (solo consola o Admin SDK)

Firebase Hosting → dist/DevChronicle (reescritura de la SPA a index.html)
tools/devchronicle-mcp → servidor MCP stdio local → API REST de Firestore
```

El desarrollo local usa Auth (9099), Firestore (8080) y la interfaz de emuladores (4000) con el proyecto `demo-devchronicle`. El proyecto de producción es `devchronicle-hugo`.

## Estructura de la aplicación

| Ruta                                         | Responsabilidad                                                                                  |
| :------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| `src/app/core/firebase`                      | Fábricas de App, Auth y Firestore; conexión a los emuladores                                     |
| `src/app/core/models`                        | `ArticleMetadata`, normalización de entradas y desafíos, `JournalError`                          |
| `src/app/core/services`                      | Auth, diario, desafíos, Markdown + DOMPurify, SEO, resaltado, foco, `GlobalErrorHandler`, avisos |
| `src/app/core/guards`                        | `adminGuard`, `unsavedChangesGuard`                                                              |
| `src/app/core/rxjs`                          | `retryTransient` para lecturas sin conexión                                                      |
| `src/app/features/landing`                   | Catálogo con destacada, recientes y cuadrícula, con filtros por etiqueta                         |
| `src/app/features/articles`                  | Archivo paginado, búsqueda y etiquetas                                                           |
| `src/app/features/challenges`                | Desafíos de programación en Firestore (`/challenges`) con copia sin conexión incluida            |
| `src/app/features/article-viewer`            | Lector y estados 404/503                                                                         |
| `src/app/features/not-found`                 | 404 global de la ruta comodín                                                                    |
| `src/app/features/admin`                     | Acceso, denegado, listas y editores de entradas y desafíos, marco del Estudio                    |
| `src/app/shared`                             | Cabecera, pie, tarjetas, etiquetas, esqueleto, botón de copiar, sello y nota sin conexión        |
| `public/content`                             | Corpus de Markdown para importar                                                                 |
| `scripts/`                                   | Entorno, metadatos del sitio, copia sin conexión, importador, migración, exportación, capturas   |
| `tools/devchronicle-mcp`                     | Servidor MCP stdio local para redactar y publicar                                                |
| `firestore.rules` / `firestore.indexes.json` | Seguridad e índices compuestos del catálogo y desafíos                                           |
| `docs/files`                                 | Diseño, arquitectura, auditoría y notas operativas                                               |

El shell (`App`) siempre monta la cabecera y el pie del sitio y un `<main>` con el outlet. La detección de cambios es sin zonas (`provideZonelessChangeDetection`). Las rutas de las secciones se cargan de forma diferida. La interfaz y las fechas están en español (`LOCALE_ID` `es`).

## Rutas

| Ruta                              | Componente                      | Notas                                               |
| :-------------------------------- | :------------------------------ | :-------------------------------------------------- |
| `/`                               | `LandingComponent`              | Catálogo público                                    |
| `/articles`                       | `ArticlesComponent`             | Archivo; `/articulos` redirige aquí                 |
| `/challenges`                     | `ChallengesComponent`           | Catálogo de práctica; `/desafios` redirige aquí     |
| `/challenges/:slug`               | `ChallengeDetailComponent`      | Enunciado, pista y solución desplegable             |
| `/post/:slug`                     | `ArticleViewerComponent`        | Lector; un slug inválido muestra el no encontrado   |
| `/admin/login`                    | `AdminLoginComponent`           | Ventana emergente de Google                         |
| `/admin/denied`                   | `AdminDeniedComponent`          | Con sesión, pero sin `admins/{uid}`                 |
| `/admin`                          | `AdminListComponent`            | `adminGuard`                                        |
| `/admin/new`, `/admin/edit/:slug` | `AdminEditorComponent`          | `adminGuard` + `unsavedChangesGuard`                |
| `/admin/challenges`               | `AdminChallengeListComponent`   | `adminGuard`                                        |
| `/admin/challenges/new`           | `AdminChallengeEditorComponent` | `adminGuard` + `unsavedChangesGuard`                |
| `/admin/challenges/edit/:slug`    | `AdminChallengeEditorComponent` | `adminGuard` + `unsavedChangesGuard`                |
| `/404`, `**`                      | `NotFoundComponent`             | 404 blando (HTTP 200 por la reescritura de Hosting) |

## Autenticación y autorización

1. El Estudio usa solo Google (`signInWithPopup` + `select_account`).
2. `AuthService` mantiene los signals `user` e `isAdmin`. Ser admin es que exista `admins/{uid}` (no hay campo de rol).
3. `adminGuard`: anónimo → `/admin/login`; no admin → `/admin/denied`.
4. Los clientes no pueden crear, listar, actualizar ni eliminar documentos de `admins` o `editors` (las reglas lo niegan). Los admins de producción se crean en la consola de Firebase; los emuladores usan `npm run seed:admin` (`local-admin` / `admin@devchronicle.test`).
5. `editors/{uid}` es el rol limitado para API/MCP: puede crear y actualizar borradores, pero no eliminar, publicar ni cambiar roles mientras `editorStatusAllowed()` esté en modo solo-borradores. El seed del emulador crea `publicador@devchronicle.test`.

## Modelo de datos

**`entries/{slug}`** (id del documento = slug): `slug`, `title`, `summary`, `tags[]`, `category`, `series`, `author`, `status` (`draft`|`published`), `publishedAt` (timestamp o `null` en borradores), `updatedAt`, `readingTimeMinutes`.

**`entries/{slug}/body/current`**: solo `{ markdown }`, con menos de 200_000 caracteres. Se separa para que la consulta del catálogo no descargue los cuerpos de los ensayos y para que una nota larga pueda usar sola el tope de 1 MiB por documento.

**`challenges/{slug}`**: `slug`, `title`, `summary`, `difficulty` (`warmup`|`practice`|`stretch`), `tags[]`, `language`, `prompt`, `hint`, `solution`, opcional `articleSlug`/`articleTitle`, `order`, `status`, `publishedAt`, `updatedAt`. Un solo documento; los desafíos son cortos y no necesitan subcolección de cuerpo.

**Reglas (resumen):** lectura pública de entradas, cuerpos y desafíos publicados; los borradores son invisibles para el público (se muestran como no encontrados); las escrituras exigen `isAdmin()` o `editors/{uid}` y el `validEntry`/`validChallenge` correspondiente; el id del cuerpo debe ser `current`. Los editores están limitados a borradores por `editorStatusAllowed()`.

**Índices:** `entries (status, publishedAt)` para el catálogo público; `challenges (status, order)` para la lista pública de desafíos; `challenges (status, articleSlug, order)` para desafíos por artículo.

Los guardados de artículos usan una transacción (metadatos + cuerpo) y comparan `updatedAt` para concurrencia optimista. Los guardados de desafíos usan el mismo patrón de transacción y conflicto. Las eliminaciones borran ambos documentos en artículos y un documento en desafíos.

## Flujo de renderizado

1. Catálogo: consulta `onSnapshot` con `status == published` ordenada por `publishedAt`.
2. Lector: escucha la entrada y `body/current`, luego `MarkdownParserService.compile` (`marked` → `DOMPurify.sanitize`) → `[innerHTML]` mediante `DomSanitizer.bypassSecurityTrustHtml`.
3. El resaltado de sintaxis se carga de forma diferida (fragmento de `highlight.js`) y se agregan botones de copiar a los bloques de código.
4. Las lecturas públicas envuelven el flujo con `retryTransient` (2 intentos, 400 ms y luego 800 ms) para los errores clasificados como `offline`. Una lista vacía o un documento ausente servidos solo desde la caché local de Firestore también se clasifican como `offline`, para que una caída no se confunda con un diario vacío ni con un 404.
5. Si la lectura falla, `OfflineSnapshotService` descarga `/offline/journal.json` (generado en el build desde `public/content`) y la vista muestra esas entradas bajo la nota «Estás leyendo sin conexión», con la fecha de la copia y «Intentar de nuevo». Un «no encontrado» nunca se rellena con la copia. Si la copia tampoco llega, se ve el estado de error.

## SEO y hosting

`SeoService` define por vista el título, la descripción, robots, el canónico, Open Graph, Twitter, los metadatos de artículo y JSON-LD. El Estudio es `noindex` (cliente + cabecera `X-Robots-Tag` de Hosting). `robots.txt` y `sitemap.xml` se generan en la compilación a partir de `NG_APP_SITE_URL`. El mapa del sitio une los slugs de Markdown del repositorio con las entradas y desafíos publicados en Firestore; si falla la lectura REST, usa el contenido del repositorio para que el build siga en verde. El workflow también corre a diario para refrescar el mapa del sitio sin push. Los rastreadores sociales no ejecutan la SPA, así que las tarjetas para compartir por artículo necesitan prerenderizado o SSR (deuda documentada).

## Compilación y verificación

| Comando                                                | Función                                                                                            |
| :----------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| `npm start`                                            | `ng serve` contra los emuladores (`environment.development.ts`)                                    |
| `npm run build`                                        | Escribe el entorno de producción y los metadatos del sitio, luego `ng build` → `dist/DevChronicle` |
| `npm test`                                             | Suite unitaria de Vitest de Angular                                                                |
| `npm run test:import`                                  | Pruebas de Node del importador de Markdown                                                         |
| `npm run test:rules`                                   | Reglas de Firestore con emulador + Vitest                                                          |
| `npm run lint`                                         | Verificación con Prettier                                                                          |
| `npm run emulators` / `import:emulator` / `seed:admin` | Pila local                                                                                         |
| `npm run migrate:challenges:emulator`                  | Crea los desafíos incluidos en el emulador de Firestore (añade `-- --apply`)                       |
| `cd tools/devchronicle-mcp && npm install`             | Instala las dependencias del servidor MCP local                                                    |

CI: `.github/workflows/firebase-hosting.yml` corre lint, pruebas (unitarias, importador, reglas y E2E con emuladores) y build en `main`, y despliega Hosting, reglas e índices cuando están los secretos. Ver `hosting.md`.

## Restricciones (por diseño)

- Solo Spark: sin Cloud Functions ni copias de seguridad administradas (hay exportación manual y semanal). App Check está preparado y se activa con `FIREBASE_APPCHECK_SITE_KEY`.
- `admins` (Estudio) y `editors` (API/MCP) son listas binarias de permitidos; sin roles por campo.
- La copia sin conexión de entradas es de solo lectura y refleja `public/content` en el momento del build; los desafíos mantienen su copia incluida (`challenges.fallback.ts`).
- Los 404 blandos siguen siendo HTTP 200 con la reescritura de la SPA en Hosting.
