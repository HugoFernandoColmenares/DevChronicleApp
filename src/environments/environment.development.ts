export const environment = {
  production: false,
  siteName: 'DevChronicle',
  authorName: 'Hugo Colmenares',
  siteUrl: 'https://devchronicle-hugo.web.app',
  defaultDescription:
    'DevChronicle is a markdown-driven journal for software notes, architecture, and Angular practice.',
  socialImage: '/social/devchronicle-cover.png',
  useEmulators: true,
  authEmulatorHost: '127.0.0.1',
  authEmulatorPort: 9099,
  firestoreEmulatorHost: '127.0.0.1',
  firestoreEmulatorPort: 8080,
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-devchronicle.firebaseapp.com',
    projectId: 'demo-devchronicle',
    storageBucket: 'demo-devchronicle.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:demo',
  },
};
