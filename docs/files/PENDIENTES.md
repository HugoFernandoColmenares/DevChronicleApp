# Pendientes de DevChronicle

Lista accionable de lo que queda por hacer en [DevChronicleApp](https://github.com/HugoFernandoColmenares/DevChronicleApp) después del [PR #9](https://github.com/HugoFernandoColmenares/DevChronicleApp/pull/9) (20 nov 2026, hora de Bogotá). El código de las fases 1 a 4 de la auditoría ya está en `main` y en producción ([https://devchronicle-hugo.web.app](https://devchronicle-hugo.web.app)). Este archivo no repite lo hecho: solo lo que aún requiere una decisión, una clave o un cambio tuyo.

El detalle histórico está en [`audit.md`](./audit.md) y el plan por fases en [`improvement-plan.md`](./improvement-plan.md). La operación diaria (secretos, flujos, exportación) está en [`hosting.md`](./hosting.md) y [`ops-phase4.md`](./ops-phase4.md).

El proyecto sigue en el **plan Spark** (Auth + Firestore + Hosting). Nada de lo que sigue exige subir de plan, salvo que elijas explícitamente la opción de Functions o SSR para H1/H3.

---

## 1. Activar App Check (reCAPTCHA v3)

**Qué es.** Protege Auth y Firestore frente a clientes no autorizados. El código ya está listo y **permanece apagado** mientras no haya clave: `initAppCheck` en `src/app/core/firebase/app-check.ts` no hace nada si falta `environment.appCheckSiteKey` o si se usan emuladores. El build lee el secreto `FIREBASE_APPCHECK_SITE_KEY` (`scripts/write-environment.mjs`, workflows `firebase-hosting.yml` y `firebase-hosting-preview.yml`). Es gratuito en Spark.

**Por qué está pendiente.** Falta crear la clave de reCAPTCHA v3, registrarla en la consola de Firebase, guardarla en GitHub y desplegar. La aplicación obligatoria (enforcement) no debe activarse el mismo día.

**Pasos**

1. En [https://www.google.com/recaptcha/admin](https://www.google.com/recaptcha/admin) crea una clave **reCAPTCHA v3**.
   - Dominios: `devchronicle-hugo.web.app`, `devchronicle-hugo.firebaseapp.com`. Si vas a probar un build de producción en local, añade también `localhost`.
   - Anota la **clave de sitio** (pública, es la que va en el bundle) y la **clave secreta** (solo para Firebase).
2. En [Firebase Console](https://console.firebase.google.com/project/devchronicle-hugo/appcheck) → App Check → registra la app web con el proveedor reCAPTCHA v3 y pega la **clave secreta**.
3. En GitHub: repositorio → Settings → Secrets and variables → Actions → New repository secret:
   - Nombre: `FIREBASE_APPCHECK_SITE_KEY`
   - Valor: la **clave de sitio** (no la secreta).
4. En tu `.env` local (no lo subas; está en `.gitignore`) agrega la misma clave de sitio:

   ```bash
   FIREBASE_APPCHECK_SITE_KEY=tu_clave_de_sitio
   ```

   El hueco ya existe en `.env.example`.

5. Despliega para que el bundle lleve la clave: un push a `main` o un disparo manual de `firebase-hosting.yml`. Los emuladores (`npm run emulators`) siguen sin App Check, a propósito.
6. Durante unos días revisa las métricas de App Check en la consola (tokens válidos frente a rechazados).
7. **Solo entonces** activa el enforcement: App Check → Firestore → Enforce. Si lo activas antes, los visitantes con un bundle viejo (sin token) quedan fuera. Auth se puede endurecer después, con la misma precaución.

**Cómo verificarlo**

- Antes del enforcement: el sitio público sigue igual; en la consola de App Check empiezan a aparecer peticiones con token válido.
- Después del enforcement: `https://devchronicle-hugo.web.app/` y `/articles` cargan el catálogo; el Estudio funciona con la cuenta autora; una petición a Firestore sin token debe fallar.
- `npm run emulators` + `npm start` sigue funcionando **sin** clave.
- Si algo sale mal, quita el enforcement en la consola (el tráfico se restablece al momento) y, si hace falta, borra o vacía el secreto y vuelve a desplegar.

---

## 2. Decidir `IMPORT_MARKDOWN_ON_DEPLOY`

**Qué es.** El workflow de despliegue puede copiar `public/content` a Firestore después de publicar Hosting. Hoy **no** lo hace. El paso está condicionado a `vars.IMPORT_MARKDOWN_ON_DEPLOY == 'true'` en `.github/workflows/firebase-hosting.yml`, porque la importación reemplaza por slug lo editado en el Estudio.

**Por qué está pendiente.** Es una decisión tuya sobre cuál es la fuente de la verdad.

**Opciones**

- **Dejarlo apagado (recomendado si editas en el Estudio).** No crees la variable, o déjala en cualquier valor distinto de `true`. Los cambios del Estudio sobreviven a cada deploy. Cuando el Markdown del repo deba ganar, importa a mano (antes, una copia de seguridad):

  ```bash
  npm run export:cloud
  node scripts/import-content.mjs --project devchronicle-hugo
  ```

- **Encenderlo si el repo es siempre la fuente.** GitHub → Settings → Secrets and variables → Actions → Variables → New repository variable:

  - Nombre: `IMPORT_MARKDOWN_ON_DEPLOY`
  - Valor: `true`

  A partir del siguiente deploy a `main`, Firestore se alineará con `public/content` y **se perderán** las ediciones del Estudio que no estén también en el Markdown.

**Cómo verificarlo**

- Variable ausente o distinta de `true`: en el run de Actions el paso «Import Markdown corpus into Firestore» aparece omitido (así ocurrió en el deploy del PR #9).
- Variable `true`: el paso corre en verde y una entrada publicada solo en el Estudio, o editada ahí, vuelve al texto de `public/content`.
- Tras una importación manual, compara o recarga el sitio y confirma el texto esperado.

---

## 3. H1 y H3 — 404 HTTP reales y vistas previas Open Graph

**Qué es.**

- **H1.** Firebase Hosting reescribe todas las rutas a `index.html`, así que `/post/no-existe` y cualquier URL desconocida responden **HTTP 200**. El cliente muestra la vista 404 con `noindex`, pero los rastreadores y los monitores ven un 200.
- **H3.** Los metadatos por artículo (título, descripción, `og:type=article`, JSON-LD) se escriben en el cliente. Los rastreadores sociales (WhatsApp, X, Facebook, LinkedIn) no ejecutan JavaScript y siempre muestran la tarjeta genérica de `index.html`.

**Por qué está pendiente.** Un 404 auténtico para rutas arbitrarias y las tarjetas sociales dinámicas de entradas que solo existen en Firestore suelen pedirse con Cloud Functions o SSR, y eso sale de Spark. Hay recortes viables **dentro de Spark**.

**Opciones dentro de Spark (sin subir de plan)**

1. **Prerenderizar en el build las rutas conocidas** (`/`, `/articles`, `/challenges` y cada `/post/<slug>` de `public/content`, o de una exportación de Firestore que ya corre en CI). Angular puede generar HTML estático; Hosting sirve el archivo si existe, antes de la reescritura. Esa página ya lleva el `<title>` y las etiquetas Open Graph correctas **sin JavaScript**. Sigue en Spark. No resuelve el 404 de una URL inventada ni la tarjeta de una entrada publicada solo en el Estudio y aún no prerenderizada.
2. **Estrechar la reescritura de `firebase.json`.** Dejar el `rewrite` a `index.html` solo para las rutas de la SPA que lo necesitan (`/admin/**`, quizá `/articles` y `/challenges` si no se prerenderizan). Los `/post/<slug>` prerenderizados se sirven como archivos. Lo que no exista puede caer en `404.html` y devolver **HTTP 404** de verdad. Es la forma de cerrar H1 sin Functions.
3. **Functions o SSR (Angular) en Blaze.** HTML al vuelo, 404 real y OG también para entradas que solo viven en Firestore. Queda fuera de Spark; equivaldría al punto 4.9 del plan, hoy diferido.

Archivos a tocar, según la opción: `firebase.json` (rewrites y `404.html`), configuración de prerender en `angular.json`, `scripts/write-site-meta.mjs` o un script nuevo que emita `post/<slug>/index.html`, y la plantilla de `index.html` / `SeoService`. Documenta el resultado en [`acabado-publico.md`](./acabado-publico.md) (ese archivo aún describe el sitemap como si solo listara `/` y `/articles`; en producción ya incluye `/challenges` y los slugs de `public/content` — conviene corregirlo al mismo tiempo).

**Cómo verificarlo**

```bash
# Hoy: 200, y el HTML crudo trae la tarjeta genérica del sitio
curl -sI https://devchronicle-hugo.web.app/post/no-existe
curl -s https://devchronicle-hugo.web.app/post/angular-signals-in-practice | rg -i "og:title|Angular Signals"

# Meta opcional 1+2: el HTML sin JS ya lleva el título del artículo
# y /post/no-existe responde 404
curl -sI https://devchronicle-hugo.web.app/post/no-existe   # 404
curl -s https://devchronicle-hugo.web.app/post/angular-signals-in-practice | rg "og:title"
```

El visor de [opengraph.xyz](https://www.opengraph.xyz/) o la tarjeta de WhatsApp/X deben mostrar el título del ensayo, no solo «DevChronicle».

---

## 4. H5 — Avisos de dependencias de producción

**Qué es.** `npm audit --omit=dev` sigue reportando avisos que ya no son de DOMPurify (eso se actualizó a 3.4.18). Los que quedan vienen sobre todo de **`@grpc/grpc-js`** y **`zod`**, transitivos de Firebase, y en su momento también de `@angular/router` (menos grave sin SSR).

**Por qué está pendiente.** No hay parche propio sin forzar un retroceso o un bypass del árbol de Firebase. `npm audit fix --force` no es una opción segura.

**Pasos**

```bash
npm audit --omit=dev
# Cuando Firebase publique un SDK que suba esas transitivas:
npm update firebase
npm audit --omit=dev
npm test && npm run lint && npm run build
```

No uses `--force`. Si Angular publica un parche de router dentro de 22.x, actualiza el rango actual (`npm update @angular/router` o el meta-paquete) y vuelve a pasar la suite.

**Cómo verificarlo.** `npm audit --omit=dev` sin altos en producción, o solo con avisos ya aceptados y anotados aquí. Lint, tests y build en verde.

---

## 5. M2 — Peso del resaltador (parcial)

**Qué es.** El fragmento diferido de highlight.js era ~976 kB sin comprimir en la auditoría. Ya se recortó a un subconjunto de lenguajes en `src/app/core/services/syntax-highlight.service.ts` (bash, csharp, java, javascript, json, plaintext, properties, python, sql, ini, typescript, xml, yaml). El coste de la primera visita a un bloque de código sigue siendo mejorable.

**Por qué está pendiente.** El recorte ayuda, pero el trozo diferido puede seguir siendo grande para un sitio de lectura en redes lentas.

**Pasos posibles** (elige uno; no hace falta combinarlos todos)

- Quitar de `syntax-highlight.service.ts` los lenguajes que el corpus ya no use y añadir una prueba que falle si un bloque del Markdown declara un lenguaje no registrado.
- Valorar un resaltado en el build (o sobre la copia `/offline/journal.json`) para no bajar el motor en la primera lectura.
- Medir de nuevo con un build de producción y anotar el tamaño en este archivo.

Archivos: `src/app/core/services/syntax-highlight.service.ts`, `src/app/shared/code-blocks/`, el corpus en `public/content/`.

**Cómo verificarlo**

```bash
npm run build
# Revisar en la salida de ng el tamaño del chunk diferido del resaltador
# En el sitio: abrir un artículo con código, red lenta, y confirmar que el
# resaltado llega sin romper lenguajes reales del corpus (C#, Java, Python, TS…).
```

---

## 6. L4 — `analytics` en `angular.json`

**Qué es.** `angular.json` tiene `"analytics": false` en la raíz. Lo escribió el CLI en la primera corrida de `ng serve` de la auditoría. Ya está commiteado en `main`.

**Por qué está pendiente.** No fue una decisión explícita; es inofensivo, pero conviene cerrarlo a conciencia.

**Pasos.** Si te parece bien dejarlo apagado (recomendado), no hay que tocar nada: cierra L4. Si quieres las analíticas del CLI: `ng analytics on` (o `"analytics": true`) y confirma que el diff de `angular.json` es solo esa clave.

**Cómo verificarlo.** `git diff` de `angular.json` no introduce más ruido; `npm start` arranca igual.

---

## 7. L6 — `packageManager` pide npm 12

**Qué es.** `package.json` declara `"packageManager": "npm@12.0.2"` y `"engines": { "node": ">=22 <25" }`. El CI usa Node 22 (`actions/setup-node@v4` con `node-version: 22`), que normalmente trae npm 10. En el entorno de la auditoría había npm 10.9.9, con avisos de motor.

**Por qué está pendiente.** Fricción local y de CI; no rompe el build actual, pero Corepack o un `npm i` pueden protestar.

**Pasos** (una de estas dos líneas, no ambas)

- Alinear el repo con Node 22: cambia `packageManager` a la npm 10 que usa tu máquina y el CI (`npm -v`), o quita el campo si no usas Corepack.
- Alinear el entorno con npm 12: en local y en el workflow, `corepack enable && corepack prepare npm@12.0.2 --activate`, y en `setup-node` añade la caché de npm que corresponda.

Archivos: `package.json`, `.github/workflows/firebase-hosting.yml` (y el de preview y el de exportación semanal, si aplica).

**Cómo verificarlo.** `npm install` sin avisos de motor; Actions en verde; `node -v` dentro de `>=22 <25` y `npm -v` igual que `packageManager`.

---

## 8. Capturas de la auditoría

**Qué es.** El set de `docs/screenshots/` se regeneró el 20 nov 2026 en español, con la libreta de apuntes, contra los emuladores y la cuenta falsa `admin@devchronicle.test`. No quedan capturas de la auditoría en inglés.

**Por qué aparece aquí.** Solo por si quieres un poco de limpieza: los nombres de archivo siguen en inglés (son el identificador, no la interfaz) y hay capturas de artículos concretos (`post-dotnet.png`, `post-nestjs.png`, `post-spring.png` y sus variantes) más `landing-earlier-desktop.png`, que sí está enlazada desde la tabla de evidencia de [`audit.md`](./audit.md). Todas esas imágenes ya muestran la interfaz en español.

**Pasos opcionales.** Dejarlas como están, o borrar las que no se enlacen y actualizar la fila de `audit.md` si quitas `landing-earlier-desktop.png`. Para regenerar el set completo:

```bash
npm run emulators   # en otra terminal, con import:emulator y seed:admin
npm run screenshots
```

Nunca uses credenciales reales. Verifica visualmente portada, lector, copia sin conexión, 404 y Estudio.

---

## 9. Ramas remotas que se pueden borrar

Tras los PR #7, #8 y #9, estas ramas en `origin` no tienen commits por delante de `main` y se pueden eliminar:

| Rama                             | Motivo                                                               |
| :------------------------------- | :------------------------------------------------------------------- |
| `fix/revision-y-traduccion-es`   | Fusionada en el PR #8                                                |
| `cursor/application-audit-0414`  | La primera parte se fusionó en el PR #7; el resto llegó con el PR #9 |
| `feat/libreta-auditoria`         | Fusionada en el PR #9                                                |
| `content/tres-tutoriales-20-nov` | Ya está en `main` (0 commits por delante)                            |

```bash
# Revisa una última vez
git fetch origin
git log --oneline origin/main..origin/fix/revision-y-traduccion-es
# Debe quedar vacío. Igual con las otras tres. Luego:
git push origin --delete fix/revision-y-traduccion-es
git push origin --delete cursor/application-audit-0414
git push origin --delete feat/libreta-auditoria
git push origin --delete content/tres-tutoriales-20-nov
```

**No borres todavía** (tienen commits que no están en `main`; revísalas antes):

| Rama                                     | Commits por delante de `main`                                                                                |
| :--------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `cursor/devchronicle-api-tutorials-767f` | 2 (`4028b7e`, `3f25c65`: guías de APIs por capas, incluida NestJS)                                           |
| `cursor/firebase-spark-journal-f945`     | 1 (`720ee0b`: el trabajo original del diario en Firestore / Spark; casi seguro ya superado, pero confírmalo) |

**Cómo verificarlo.** `git branch -r` ya no lista las borradas; `gh pr list` no queda huérfano; las dos ramas conservadas siguen accesibles hasta que decidas.

---

## 10. Otros cabos sueltos

### Documentación de acabado público

[`acabado-publico.md`](./acabado-publico.md) aún dice que el mapa del sitio solo lista `/` y `/articles`. En producción, `scripts/write-site-meta.mjs` ya incluye `/challenges` y cada slug de `public/content`. Actualiza ese párrafo para que coincida. Verificación: `curl -s https://devchronicle-hugo.web.app/sitemap.xml`.

### Sentry (opcional, ya preparado)

El `ErrorHandler` global acepta `SENTRY_DSN`. Si quieres telemetría en el plan gratuito de Sentry: crea el proyecto, guarda el DSN como secreto `SENTRY_DSN` en GitHub (y en `.env`) y redepliega. Sin DSN no pasa nada. Verificación: provocar un error de prueba y verlo en Sentry, sin filtrar datos del autor.

### Higiene de GitHub Actions (opcional)

El deploy del PR #9 avisó que `actions/checkout@v4`, `actions/setup-node@v4` y `actions/setup-java@v4` apuntan a un runtime Node 20 deprecado, y que `setup-java@v4` está deprecado. Cuando te convenga: subir a `checkout@v5` / `setup-node@v6` (o la major vigente) y `setup-java@v5` en `.github/workflows/*`. Verificación: un run en verde.

### Diferidos a propósito (no hay que hacerlos ahora)

Quedan explícitamente fuera de alcance en [`improvement-plan.md`](./improvement-plan.md), hasta que haya un motivo nuevo:

- **4.6** Roles de varios autores (`editor` / `admin`).
- **4.7** Analítica respetuosa con la privacidad.
- **4.9** SSR completo (solo si el prerenderizado de H1/H3 no alcanza).
- Cloud Functions, salvo que elijas Blaze para H1/H3.
- Reescribir el diario sobre otro CMS o base de datos.

---

## Orden sugerido

1. Borrar las ramas ya fusionadas (sección 9).
2. Decidir `IMPORT_MARKDOWN_ON_DEPLOY` (sección 2) — es una casilla, no hay código.
3. Cerrar L4 con un «sí, déjalo en false» (sección 6).
4. Activar App Check y esperar métricas antes del enforcement (sección 1).
5. Alinear npm (sección 7) cuando toques el flujo de CI.
6. H5 cuando Firebase publique el parche (sección 4).
7. M2 y H1/H3 cuando quieras pulir rendimiento y SEO (secciones 5 y 3).
