import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';

import { environment } from '@env';

import { initAppCheck, warmAppCheckToken } from './app-check';

export function firebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  const app = initializeApp(environment.firebase);
  initAppCheck(app);
  void warmAppCheckToken();
  return app;
}
