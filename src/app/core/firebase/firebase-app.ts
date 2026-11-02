import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';

import { environment } from '@env';

export function firebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(environment.firebase);
}
