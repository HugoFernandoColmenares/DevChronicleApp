---
title: "Cómo armar un pipeline de liberación con EAS y GitHub Actions (preview, testers internos y el camino a las tiendas)"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Frontend de consumidor
tags: [expo, eas, github-actions, ci, react-native]
excerpt: "Un pipeline gratis con EAS y GitHub Actions: preview en cada PR, un APK para testers internos, y el camino documentado a Play e iOS sin exigir una cuenta de Apple de pago."
status: published
---

Hoy vamos a ver cómo armar un pipeline de liberación con EAS y GitHub Actions: un *preview* en cada pull request, un binario para testers internos, y el camino a las tiendas, escrito con honestidad. Básicamente, «correr `npx expo start` en mi laptop» no es un pipeline. Un pipeline es un botón (o un *push*) que cualquiera del equipo puede repetir.

Este es el sexto tutorial de la serie **Frontend de consumidor**. Parte de la [app Expo](/post/pasar-de-react-web-a-react-native-con-expo). Lo escribí el 23 de noviembre de 2026 contra **Expo SDK 58**. EAS tiene capa gratuita suficiente para aprender. La cuenta de Apple Developer (de pago, anual) **no** es un requisito de esta ruta: iOS se documenta; la evidencia de *release* se hace con Android (APK o testers internos). El reto está en [Desafíos](/challenges/workflow-eas-preview-y-apk).

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/pipeline-de-liberacion-con-eas-y-github-actions#que-vamos-a-construir)
2. [Prerrequisitos](/post/pipeline-de-liberacion-con-eas-y-github-actions#prerrequisitos)
3. [Instalación](/post/pipeline-de-liberacion-con-eas-y-github-actions#instalacion)
4. [Carpetas y responsabilidad](/post/pipeline-de-liberacion-con-eas-y-github-actions#carpetas)
5. [Paso a paso](/post/pipeline-de-liberacion-con-eas-y-github-actions#paso-a-paso)
6. [Cómo probarlo](/post/pipeline-de-liberacion-con-eas-y-github-actions#probarlo)
7. [Cómo agrego otro perfil de punta a punta](/post/pipeline-de-liberacion-con-eas-y-github-actions#extender)
8. [Errores típicos y trampas](/post/pipeline-de-liberacion-con-eas-y-github-actions#errores)
9. [Checklist](/post/pipeline-de-liberacion-con-eas-y-github-actions#checklist)
10. [Resumen](/post/pipeline-de-liberacion-con-eas-y-github-actions#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Tres perfiles de EAS Build (`preview`, `testers` y `production`) y un workflow de GitHub Actions que, en un pull request, corre *lint* y tests, y pide un build `preview` de Android cuando hay cambios en la app. El perfil `testers` genera un APK (o un *internal* de Play, si algún día pagan el cargo único de Play Console). El de `production` queda escrito, no corrido por obligación.

<a id="prerrequisitos"></a>

## Prerrequisitos

- La app Expo 58 de esta serie, en un repositorio de GitHub.
- Una cuenta de Expo (gratis) y el CLI: `npm install -g eas-cli` o `npx eas-cli`.
- Secretos de GitHub: un token de Expo (`EXPO_TOKEN`), nunca el usuario y la contraseña en el YAML.
- No hace falta Apple Developer. Sí hace falta aceptar que, sin esa cuenta, no subimos a App Store. El pipeline de iOS se deja documentado (`image: sdk-58` o `latest`, que en SDK 58 apunta a Xcode 27.1).

```bash
npx expo --version
npx eas-cli --version
```

<a id="instalacion"></a>

## Instalación

En la raíz de la app:

```bash
npx eas-cli login
npx eas-cli build:configure
```

Eso crea `eas.json`. Un archivo típico, ajustado a esta ruta, se ve así:

```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "preview": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": true }
    },
    "testers": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

`preview` es un *development client*: sirve para probar la rama, no para testers no técnicos. `testers` es un APK interno, instalable. `production` es un *bundle* de Android, el formato de Play. iOS en `preview` usa simulador, para no pedir certificados de pago.

Un workflow mínimo, por ejemplo `.github/workflows/preview.yml`:

```yaml
name: Preview

on:
  pull_request:
    paths:
      - 'apps/mobile/**'
      - 'package.json'
      - 'eas.json'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm test --if-present

  preview-android:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npx eas-cli build --platform android --profile preview --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

`--no-wait` encola el build en EAS y no deja el runner de GitHub ocupado (y gastando minutos) mientras Expo compila. El enlace del build aparece en la cuenta de Expo. Ajusten `paths` a la carpeta real de su app; si el repo es solo la app, quiten el filtro o dejen `.`.

Para un APK de testers, en local o en *workflow_dispatch*:

```bash
npx eas-cli build --platform android --profile testers
```

Cuando termine, EAS da una URL. Esa URL es la evidencia. No hace falta Play Console para decir «armé un binario instalable».

<a id="carpetas"></a>

## Carpetas y responsabilidad

```text
eas.json
.github/workflows/preview.yml
app.json
```

- `eas.json` describe perfiles, no secretos.
- El workflow corre tests antes que el build. Un preview de una rama roja no ayuda.
- `app.json` tiene el `package` de Android y el `bundleIdentifier` de iOS. Cámbienlos de los de ejemplo antes de un submit real.

<a id="paso-a-paso"></a>

## Paso a paso

1. Configuran EAS y revisan que los tres perfiles existan.
2. Guardan `EXPO_TOKEN` en los secretos del repositorio (un token con permiso de build, no su contraseña).
3. Suben un pull request de prueba con un cambio mínimo en la pantalla de horarios.
4. El job `test` debe pasar. El job `preview-android` debe encolar el build.
5. Instalan el APK de `testers` en un teléfono Android, o el development build de `preview` si van a seguir trabajando en esa rama.
6. Documentan, en el README, el camino a Play (bundle `production`, Play Console de pago cuando decidan) y a App Store (cuenta de Apple, certificados, el *image* `sdk-58`). Lo documentan, no lo ejecutan como paso obligado.

En SDK 58, si fijan una imagen de iOS a mano, usen el alias `sdk-58` o `latest`, que apunta a Xcode 27.1. Una imagen vieja de Xcode es una fuente clásica de builds rojos después de un upgrade del SDK.

<a id="probarlo"></a>

## Cómo probarlo

El preview de un PR se prueba mirando la pestaña Actions: *lint*/tests en verde, el paso de EAS aceptado (HTTP de EAS, no un fallo de autenticación). El APK de `testers` se prueba instalándolo: la app abre, se ve la lista de horarios. Si el build de EAS falla, el log de Expo (no solo el de GitHub) dice si fue un certificado, una versión de Node o un `app.json` incompleto.

Las pruebas de Playwright y Jest del [artículo anterior](/post/probar-embudo-consumidor-jest-rtl-playwright) deben correr en el job `test`. Un pipeline que solo «compila» y no prueba el embudo es un pipeline a medias.

<a id="extender"></a>

## Cómo agrego otro perfil de punta a punta

Un perfil `nightly` que corre cada madrugada (`schedule` en Actions) con el mismo `testers`, para no depender de un PR. O un job de `eas update` (actualizaciones OTA) sobre `preview`, que es más barato que un build nativo cuando solo cambió JavaScript. Las OTA no reemplazan un build cuando cambia código nativo o el SDK.

<a id="errores"></a>

## Errores típicos y trampas

**Poner el usuario y la contraseña de Expo en el YAML.** El token va en *secrets*. Si se filtra, se revoca.

**Esperar el build nativo dentro del runner** sin `--no-wait`. Se comen los minutos gratis de GitHub y no ganan información.

**Llamar «producción» a un APK que instalan por la URL de EAS.** Producción es el *bundle* firmado, subido a una tienda o a un canal interno formal. El APK de testers es un paso anterior, y está bien llamarlo así.

**Exigir Apple para dar por terminada esta ruta.** El plan no lo pide. Documenten el camino y sigan.

**Un `app.json` con el package `com.anonymous.seiryuko`.** Antes de un submit, el identificador tiene que ser suyo. En *preview* todavía se puede vivir con el de ejemplo; en `production`, no.

<a id="checklist"></a>

## Checklist

- [ ] Existe `eas.json` con `preview`, `testers` y `production`.
- [ ] `EXPO_TOKEN` está en los secretos, no en el repo.
- [ ] Un PR corre tests y encola un preview de Android.
- [ ] Tengo (o sé cómo obtener) un APK de testers instalable.
- [ ] El camino a las tiendas está escrito, y Apple no es un paso obligado.
- [ ] El reto está en [Desafíos](/challenges/workflow-eas-preview-y-apk).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, un pipeline de Expo en 2026 es EAS más GitHub Actions, con tests primero, un preview por rama y un APK para testers. iOS se documenta; Android se demuestra. En el [último artículo](/post/medir-y-mejorar-rendimiento-nextjs-y-react-native) medimos si esa app, y la web de Primer Paso, se sienten ágiles de verdad.

El ejercicio está en los [desafíos](/challenges/workflow-eas-preview-y-apk).
