# Emulators

`.firebaserc` keeps `devchronicle-hugo` as the default deploy project, and `demo` points at `demo-devchronicle`.

`ng serve` uses `environment.development.ts`: project `demo-devchronicle`, Firestore on `127.0.0.1:8080`, and Auth on `127.0.0.1:9099`. Start the emulators with that same project id. If they start as `devchronicle-hugo`, the app will not see the data.

```bash
npm run emulators
npm run import:emulator
npm run seed:admin
npm start
```

Emulator UI: `http://127.0.0.1:4000`. App: `http://127.0.0.1:4200`.

`npm run test:rules` starts **its own** Firestore emulator via `firebase emulators:exec`, project `demo-devchronicle`, and config `firebase.rules-test.json` (port **8180**). It can run while `npm run emulators` already owns 8080. A JRE 21 is required.

Playwright smoke (public + Studio via **Emulator author**):

```bash
npm run emulators
npm run import:emulator
npm run seed:admin
npm run test:e2e
```

`test:e2e` starts `ng serve` if nothing is listening on `127.0.0.1:4200`, or respects `PLAYWRIGHT_BASE_URL`.

Storage and Functions are not configured. `firebase.json` declares Firestore, Hosting, and the emulators only.
