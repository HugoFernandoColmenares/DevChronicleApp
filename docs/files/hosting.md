# Hosting y despliegue

Firebase Hosting sirve el build de Angular como SPA. `firebase.json` publica `dist/DevChronicle/browser` y reescribe todas las rutas a `index.html`, para que `/post/:slug` y `/admin` sobrevivan a un refresco.

`npm run build` ejecuta `scripts/write-environment.mjs`. Ese script lee `.env` (sin pisar variables que ya vengan del entorno) y escribe `src/environments/environment.production.ts`, que está en `.gitignore`. Si faltan `FIREBASE_*`, el archivo queda con marcadores y el build igual termina. Esos marcadores no sirven para un sitio real.

## Qué hay que crear en Firebase

El proyecto `devchronicle-hugo` todavía no existe. En el plan Spark:

1. Crear el proyecto con ese id.
2. Crear Firestore en modo nativo. No hace falta Storage.
3. Activar Authentication → Google.
4. Registrar una app web y copiar la configuración a los secretos y a `.env` (ver `.env.example`).
5. En Authentication, anotar el uid de la cuenta autora y crear `admins/{uid}` en Firestore.
6. Agregar los dominios de Hosting a los dominios autorizados de Google.
7. Crear una cuenta de servicio para GitHub. El camino práctico en Spark es la clave JSON del Admin SDK (Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada). Hace falta permiso para Hosting, reglas e índices. El rol `Firebase Admin` los cubre. Guardar el JSON completo en el secreto `FIREBASE_SERVICE_ACCOUNT` (también acepta ese JSON en base64).

## Secretos de GitHub

| Secreto                        | Uso                                                  |
| :----------------------------- | :--------------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT`     | JSON de la cuenta de servicio                        |
| `FIREBASE_API_KEY`             | Configuración web                                    |
| `FIREBASE_AUTH_DOMAIN`         | Configuración web                                    |
| `FIREBASE_PROJECT_ID`          | Debe ser `devchronicle-hugo`                         |
| `FIREBASE_STORAGE_BUCKET`      | Viene en la configuración web. La app no usa Storage |
| `FIREBASE_MESSAGING_SENDER_ID` | Configuración web                                    |
| `FIREBASE_APP_ID`              | Configuración web                                    |
| `FIREBASE_APPCHECK_SITE_KEY`   | Opcional. reCAPTCHA v3 para App Check                |

La clave web viaja en el bundle. No es una credencial de administrador. La cuenta de servicio no debe commitearse.

## App Check (opcional, Spark)

1. En Firebase Console → App Check, registrar la app web con **reCAPTCHA v3**.
2. Guardar el site key en `.env` / secreto `FIREBASE_APPCHECK_SITE_KEY`.
3. Activar enforcement para Firestore (y Auth si se desea) solo cuando el sitio de producción ya envía tokens.
4. Con emuladores o sin clave, `initAppCheck` es un no-op: el cliente arranca igual.

## Workflows

| Workflow | Disparo | Qué hace |
| :------- | :------ | :------- |
| `firebase-hosting.yml` | push a `main` / manual | Lint, tests, E2E en emuladores, build; deploy Hosting+rules+indexes si hay secretos |
| `firebase-hosting-preview.yml` | pull request | Build + `hosting:channel:deploy pr-<n>` (7 días) si hay secretos |
| `uptime.yml` | cron cada 6 h | HTTP 200 en `/`, `/articles`, `/challenges` |
| `scheduled-export.yml` | domingo 06:00 UTC / manual | Export JSON de Firestore → artifact 30 días |

Si falta cualquier secreto de Firebase, los jobs de deploy/export escriben el motivo y terminan en verde sin fallar el pipeline.

La primera carga de notas en la nube es manual:

```bash
node scripts/import-content.mjs --project devchronicle-hugo
```

Backup programado (además del botón **Export backup** en Studio):

```bash
npm run export:cloud
```

Más detalle en [`ops-phase4.md`](./ops-phase4.md).
