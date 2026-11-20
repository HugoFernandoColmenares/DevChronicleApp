import { mkdirSync, writeFileSync } from 'node:fs';

import { buildOfflineSnapshot } from './lib/offline-snapshot.mjs';

const contentDir = new URL('../public/content/', import.meta.url);
const outDir = new URL('../public/offline/', import.meta.url);

const snapshot = buildOfflineSnapshot(contentDir);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL('journal.json', outDir), `${JSON.stringify(snapshot)}\n`);

console.log(
  `Copia sin conexión: ${snapshot.entries.length} entradas publicadas → public/offline/journal.json`,
);
