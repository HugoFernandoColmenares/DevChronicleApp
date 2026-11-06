// Placeholder production config. `npm run build` replaces this file with
// src/environments/environment.production.ts generated from .env or CI secrets.
export const environment = {
  production: true,
  siteName: 'DevChronicle',
  authorName: 'Hugo Colmenares',
  siteUrl: 'https://devchronicle-hugo.web.app',
  defaultDescription:
    'DevChronicle is a markdown-driven journal for software notes, architecture, and Angular practice.',
  socialImage: '/social/devchronicle-cover.png',
  useEmulators: false,
  authEmulatorHost: '127.0.0.1',
  authEmulatorPort: 9099,
  firestoreEmulatorHost: '127.0.0.1',
  firestoreEmulatorPort: 8080,
  firebase: {
    apiKey: 'build-placeholder',
    authDomain: 'devchronicle-hugo.firebaseapp.com',
    projectId: 'devchronicle-hugo',
    storageBucket: 'devchronicle-hugo.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:devchronicle',
  },
};
