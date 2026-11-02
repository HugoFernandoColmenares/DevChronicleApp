import { Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { environment } from '@env';

import { firebaseApp } from './firebase-app';

let connected = false;

export function firebaseFirestore(): Firestore {
  const firestore = getFirestore(firebaseApp());

  if (environment.useEmulators && !connected) {
    connectEmulator(() =>
      connectFirestoreEmulator(
        firestore,
        environment.firestoreEmulatorHost,
        environment.firestoreEmulatorPort,
      ),
    );
    connected = true;
  }

  return firestore;
}

function connectEmulator(connect: () => void): void {
  try {
    connect();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!/already/i.test(message)) {
      throw error;
    }
  }
}
