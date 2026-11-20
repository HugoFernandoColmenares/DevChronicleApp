import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { loadEnv } from './lib/load-env.mjs';

loadEnv();
process.env.METADATA_SERVER_DETECTION = process.env.METADATA_SERVER_DETECTION || 'none';

const args = process.argv.slice(2);
const emulator = args.includes('--emulator');
const projectFlag = args.indexOf('--project');
const outFlag = args.indexOf('--out');
const projectId = projectFlag >= 0 ? args[projectFlag + 1] : undefined;
const outPath =
  outFlag >= 0
    ? resolve(args[outFlag + 1])
    : resolve(`exports/devchronicle-export-${new Date().toISOString().slice(0, 10)}.json`);

if (!projectId || projectId.startsWith('-')) {
  console.error('Pass --project <firebase-project-id> (or demo-devchronicle with --emulator).');
  process.exit(1);
}

if (emulator) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  initializeApp({ projectId });
} else {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.error('FIRESTORE_EMULATOR_HOST is set. Unset it, or pass --emulator.');
    process.exit(1);
  }
  initializeApp({ credential: resolveCredential(), projectId });
}

const db = getFirestore();
const listed = await db.collection('entries').orderBy('updatedAt', 'desc').get();
const entries = [];

for (const doc of listed.docs) {
  const body = await db.doc(`entries/${doc.id}/body/current`).get();
  entries.push({
    entry: { id: doc.id, ...doc.data() },
    markdown: typeof body.data()?.markdown === 'string' ? body.data().markdown : '',
  });
}

const payload = {
  exportedAt: new Date().toISOString(),
  projectId,
  site: 'DevChronicle',
  entries,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`Wrote ${entries.length} entries to ${outPath}`);

function resolveCredential() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    const json = raw.startsWith('{')
      ? JSON.parse(raw)
      : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    return cert(json);
  }
  throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT.');
}
