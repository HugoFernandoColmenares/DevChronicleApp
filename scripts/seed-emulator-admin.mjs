import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

process.env.METADATA_SERVER_DETECTION = process.env.METADATA_SERVER_DETECTION || 'none';

const args = process.argv.slice(2);
if (!args.includes('--emulator')) {
  console.error('This script only writes to the local emulators. Pass --emulator.');
  process.exit(1);
}

const projectFlag = args.indexOf('--project');
const projectId = projectFlag >= 0 ? args[projectFlag + 1] : 'demo-devchronicle';

process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

const uid = 'local-admin';
const email = 'admin@devchronicle.test';
const displayName = 'Hugo Colmenares';

initializeApp({ projectId });

const auth = getAuth();
try {
  await auth.getUser(uid);
  await auth.updateUser(uid, { email, displayName, emailVerified: true });
} catch {
  await auth.createUser({ uid, email, displayName, emailVerified: true });
}

await getFirestore().doc(`admins/${uid}`).set(
  {
    email,
    displayName,
    note: 'Emulator author. Production admins are created in the Firebase console.',
  },
  { merge: true },
);

console.log(`Emulator admin ready in ${projectId}: uid=${uid} email=${email}`);
console.log(
  'In the Auth emulator sign-in widget, choose that email or sign in as a new Google user and then copy that uid into admins/{uid}.',
);
