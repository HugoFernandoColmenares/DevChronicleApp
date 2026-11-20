# Fase 4 — Extras de operación

Extras que acompañan al MVP en Spark. Lo diferido queda diferido a propósito.

## Hecho

| Elemento                              | Dónde                                                                                           |
| :------------------------------------ | :---------------------------------------------------------------------------------------------- |
| Subconjunto de lenguajes de Highlight | `SyntaxHighlightService` carga `core` y solo los lenguajes del corpus                           |
| Canales de vista previa de Hosting    | `.github/workflows/firebase-hosting-preview.yml` en cada PR                                     |
| `ErrorHandler` global                 | `GlobalErrorHandler` y sobre opcional de Sentry con `SENTRY_DSN`                                |
| Chequeo de disponibilidad             | `.github/workflows/uptime.yml` consulta `/`, `/articles`, `/challenges` y la copia sin conexión |
| Exportación programada de Firestore   | `.github/workflows/scheduled-export.yml` y `npm run export:cloud`                               |
| Copia sin conexión                    | `scripts/write-offline-snapshot.mjs` genera `/offline/journal.json` en cada build               |

## Diferido (a conciencia)

| Elemento                                | Motivo                                                        |
| :-------------------------------------- | :------------------------------------------------------------ |
| Roles `editor` / `admin` para varios    | MVP de un solo autor; `admins/{uid}` sigue siendo binario     |
| Analítica respetuosa con la privacidad  | Aún no hay una decisión de producto que necesite telemetría   |
| SSR completo o shell HTML con Functions | Fuera del plan Spark; ver la decisión en `acabado-publico.md` |

## Secretos y variables

| Nombre                                      | Lo usa                                                                                   |
| :------------------------------------------ | :--------------------------------------------------------------------------------------- |
| `FIREBASE_*` y la cuenta de servicio        | Despliegue, vista previa y exportación programada                                        |
| `FIREBASE_APPCHECK_SITE_KEY` (opcional)     | App Check con reCAPTCHA v3                                                               |
| `SENTRY_DSN` (opcional)                     | Sobres de error del cliente                                                              |
| `vars.NG_APP_SITE_URL`                      | URL base del chequeo de disponibilidad (por defecto `https://devchronicle-hugo.web.app`) |
| `vars.IMPORT_MARKDOWN_ON_DEPLOY` (opcional) | `true` para importar `public/content` a Firestore después de cada despliegue             |

## Exportación local

```bash
npm run emulators
npm run export:emulator
# o bien
npm run export:cloud   # necesita GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT
```
