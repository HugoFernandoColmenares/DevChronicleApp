import { readdirSync, readFileSync } from 'node:fs';

import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

import { loadEnv } from './lib/load-env.mjs';
import { entryFromMarkdown } from './lib/markdown-entry.mjs';

loadEnv();
process.env.METADATA_SERVER_DETECTION = process.env.METADATA_SERVER_DETECTION || 'none';

const args = process.argv.slice(2);
const emulator = args.includes('--emulator');
const projectFlag = args.indexOf('--project');
const projectId = projectFlag >= 0 ? args[projectFlag + 1] : undefined;

if (emulator && !projectId) {
  console.error(
    'Pass --project <id> together with --emulator. Local development uses demo-devchronicle.',
  );
  process.exit(1);
}

if (!emulator && !projectId) {
  console.error(
    'Refusing to guess a cloud project. Pass --emulator --project demo-devchronicle or --project <firebase-project-id>.',
  );
  process.exit(1);
}

if (!projectId || projectId.startsWith('-')) {
  console.error('--project needs a project id.');
  process.exit(1);
}

if (!emulator && projectId.startsWith('demo-')) {
  console.error('demo- project ids are for the emulator. Pass --emulator.');
  process.exit(1);
}

if (emulator) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  initializeApp({ projectId });
  console.log(`Importing into the Firestore emulator for ${projectId}.`);
} else {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.error('FIRESTORE_EMULATOR_HOST is set. Unset it, or pass --emulator.');
    process.exit(1);
  }
  initializeApp({ credential: resolveCredential(), projectId });
  console.log(`Importing into cloud project ${projectId}.`);
}

const contentDir = new URL('../public/content/', import.meta.url);
const files = readdirSync(contentDir)
  .filter((name) => name.endsWith('.md'))
  .sort();

if (files.length === 0) {
  console.error('No markdown files in public/content.');
  process.exit(1);
}

const parsed = files.map((name) => {
  const slug = name.slice(0, -3);
  const raw = readFileSync(new URL(name, contentDir), 'utf8');
  return entryFromMarkdown(slug, raw);
});

const db = getFirestore();
const chunkSize = 200;

for (let index = 0; index < parsed.length; index += chunkSize) {
  const chunk = parsed.slice(index, index + chunkSize);
  const batch = db.batch();

  for (const item of chunk) {
    const ref = db.doc(`entries/${item.entry.slug}`);
    batch.set(ref, {
      ...item.entry,
      publishedAt: item.entry.publishedAt
        ? Timestamp.fromDate(new Date(item.entry.publishedAt))
        : null,
      updatedAt: Timestamp.fromDate(new Date(item.entry.updatedAt)),
    });
    batch.set(ref.collection('body').doc('current'), { markdown: item.markdown });
    console.log(`upsert ${item.entry.slug} (${item.entry.status})`);
  }

  await batch.commit();
}

console.log(`Done. ${parsed.length} entries upserted by slug.`);

function resolveCredential() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    let raw = inline.trim();
    if (!raw.startsWith('{')) {
      raw = Buffer.from(raw, 'base64').toString('utf8').trim();
    }
    return cert(JSON.parse(raw));
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }
  console.error(
    'Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT before a cloud import.',
  );
  process.exit(1);
}
