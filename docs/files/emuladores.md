# Emuladores

El proyecto real todavía no existe. `.firebaserc` deja `devchronicle-hugo` como proyecto por defecto para el despliegue, y `demo` apunta a `demo-devchronicle`.

`ng serve` usa `environment.development.ts`: proyecto `demo-devchronicle`, Firestore en `127.0.0.1:8080` y Auth en `127.0.0.1:9099`. Hay que levantar los emuladores con ese mismo id. Si se arrancan con `devchronicle-hugo`, la app no ve los datos.

```bash
npm run emulators
npm run import:emulator
npm run seed:admin
npm start
```

La interfaz de los emuladores queda en `http://127.0.0.1:4000`. La app queda en `http://127.0.0.1:4200`.

`npm run test:rules` levanta **su propio** emulador de Firestore con `firebase emulators:exec`, el proyecto `demo-devchronicle` y la configuración `firebase.rules-test.json` (puerto **8180**), así que puede correr aunque `npm run emulators` ya ocupe el 8080. Hace falta un JRE 21.

Prueba de humo con Playwright (parte pública y Estudio con «Autor del emulador»):

```bash
npm run emulators
npm run import:emulator
npm run seed:admin
npm run test:e2e
```

`test:e2e` arranca `ng serve` si no hay nada escuchando en `127.0.0.1:4200`, o usa `PLAYWRIGHT_BASE_URL`. Con los mismos emuladores, `npm run screenshots` regenera `docs/screenshots/` con la cuenta falsa `admin@devchronicle.test`.

No se configura Storage ni Functions. El archivo `firebase.json` solo declara Firestore, Hosting y los emuladores.
