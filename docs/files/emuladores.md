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

`npm run test:rules` levanta solo el emulador de Firestore con `firebase emulators:exec` y el proyecto `demo-devchronicle`, corre las pruebas y lo apaga. Hace falta un JRE 21, que es el que usa el emulador de Firestore.

No se configura Storage ni Functions. El archivo `firebase.json` solo declara Firestore, Hosting y los emuladores.
