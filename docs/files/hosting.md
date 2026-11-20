# Hosting y despliegue

Firebase Hosting sirve el build de Angular como SPA. `firebase.json` publica `dist/DevChronicle/browser` y reescribe todas las rutas a `index.html`, para que `/post/:slug` y `/admin` sobrevivan a un refresco.

`npm run build` ejecuta, en orden:

1. `scripts/write-environment.mjs`: lee `.env` (sin pisar variables que ya vengan del entorno) y escribe `src/environments/environment.production.ts`, que está en `.gitignore`. Si faltan `FIREBASE_*`, el archivo queda con marcadores y el build termina igual, pero esos marcadores no sirven para un sitio real.
2. `scripts/write-site-meta.mjs`: `robots.txt` y `sitemap.xml` a partir de `public/content`.
3. `scripts/write-offline-snapshot.mjs`: la copia sin conexión `public/offline/journal.json` (ignorada por git) con las entradas publicadas de `public/content`. Solo se descarga cuando Firestore no responde y la interfaz la presenta siempre como copia que puede estar desactualizada. `tests/offline-snapshot.test.mjs` comprueba que coincide con el Markdown.
4. `ng build`.

## Qué hay que crear en Firebase (plan Spark)

1. Crear el proyecto `devchronicle-hugo`.
2. Crear Firestore en modo nativo. No hace falta Storage.
3. Activar Authentication → Google.
4. Registrar una app web y copiar la configuración a los secretos y a `.env` (ver `.env.example`).
5. Anotar el uid de la cuenta autora y crear `admins/{uid}` en Firestore.
6. Agregar los dominios de Hosting a los dominios autorizados de Google.
7. Crear una cuenta de servicio para GitHub (rol `Firebase Admin`) y guardar el JSON completo, o en base64, en el secreto `FIREBASE_SERVICE_ACCOUNT`.

## Secretos y variables de GitHub

| Nombre                           | Uso                                                                     |
| :------------------------------- | :---------------------------------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT`       | JSON de la cuenta de servicio                                           |
| `FIREBASE_API_KEY`               | Configuración web                                                       |
| `FIREBASE_AUTH_DOMAIN`           | Configuración web                                                       |
| `FIREBASE_PROJECT_ID`            | Debe ser `devchronicle-hugo`                                            |
| `FIREBASE_STORAGE_BUCKET`        | Viene en la configuración web. La app no usa Storage                    |
| `FIREBASE_MESSAGING_SENDER_ID`   | Configuración web                                                       |
| `FIREBASE_APP_ID`                | Configuración web                                                       |
| `FIREBASE_APPCHECK_SITE_KEY`     | Opcional: clave de sitio de reCAPTCHA v3 para App Check                 |
| `SENTRY_DSN`                     | Opcional: errores no controlados                                        |
| `vars.NG_APP_SITE_URL`           | Opcional: URL pública (por defecto `https://devchronicle-hugo.web.app`) |
| `vars.IMPORT_MARKDOWN_ON_DEPLOY` | Opcional: `true` para importar `public/content` tras cada despliegue    |

La clave web viaja en el bundle; no es una credencial de administrador. La cuenta de servicio nunca se commitea.

## App Check (opcional, gratuito en Spark)

El código ya está listo y queda apagado mientras no haya clave (`initAppCheck` no hace nada sin `FIREBASE_APPCHECK_SITE_KEY` ni con emuladores). Para activarlo:

1. Crear una clave de sitio **reCAPTCHA v3** en <https://www.google.com/recaptcha/admin> para `devchronicle-hugo.web.app` y `devchronicle-hugo.firebaseapp.com`.
2. Firebase Console → App Check → registrar la app web con el proveedor reCAPTCHA v3 y pegar la clave secreta.
3. Guardar la clave de sitio en el secreto `FIREBASE_APPCHECK_SITE_KEY` (y en `.env` para builds locales) y desplegar.
4. Revisar las métricas de App Check unos días y **solo entonces** activar la aplicación obligatoria (enforcement) para Firestore. Activarla antes deja fuera a los clientes sin token.

## Workflows

| Workflow                       | Disparador                  | Qué hace                                                                                                        |
| :----------------------------- | :-------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| `firebase-hosting.yml`         | push a `main` / manual      | Lint, pruebas unitarias, importador, reglas, E2E contra emuladores y build; despliega Hosting, reglas e índices |
| `firebase-hosting-preview.yml` | pull request                | Build y `hosting:channel:deploy pr-<n>` (7 días) si hay secretos                                                |
| `uptime.yml`                   | cada 6 horas / manual       | HTTP 200 en `/`, `/articles`, `/challenges` y `/offline/journal.json`                                           |
| `scheduled-export.yml`         | domingos 06:00 UTC / manual | Exportación JSON de Firestore como artefacto (30 días)                                                          |

Si faltan secretos, los pasos de despliegue, vista previa o exportación explican el motivo y el job termina en verde.

La importación de `public/content` a Firestore **no** corre por defecto al desplegar, porque sobrescribe por slug lo que se haya editado en el Estudio. Se lanza a mano cuando el repositorio es la fuente de la verdad:

```bash
node scripts/import-content.mjs --project devchronicle-hugo
```

Copia de seguridad local (además de «Exportar copia de seguridad» en el Estudio):

```bash
npm run export:cloud
```

Más detalle de operación en [`ops-phase4.md`](./ops-phase4.md).
