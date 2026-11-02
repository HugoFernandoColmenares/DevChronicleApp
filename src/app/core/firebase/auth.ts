import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';

import { environment } from '@env';

import { firebaseApp } from './firebase-app';

let connected = false;

export function firebaseAuth(): Auth {
  const auth = getAuth(firebaseApp());

  if (environment.useEmulators && !connected) {
    try {
      connectAuthEmulator(
        auth,
        `http://${environment.authEmulatorHost}:${environment.authEmulatorPort}`,
        { disableWarnings: true },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!/already/i.test(message)) {
        throw error;
      }
    }
    connected = true;
  }

  return auth;
}
