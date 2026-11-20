import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { entryFromMarkdown } from '../scripts/lib/markdown-entry.mjs';
import {
  buildOfflineSnapshot,
  OFFLINE_SNAPSHOT_VERSION,
} from '../scripts/lib/offline-snapshot.mjs';

const contentDir = new URL('../public/content/', import.meta.url);
const snapshotFile = new URL('../public/offline/journal.json', import.meta.url);

const published = readdirSync(contentDir)
  .filter((name) => name.endsWith('.md'))
  .map((name) =>
    entryFromMarkdown(name.slice(0, -3), readFileSync(new URL(name, contentDir), 'utf8')),
  )
  .filter(({ entry }) => entry.status === 'published');

test('la copia sin conexión incluye cada Markdown publicado, con su cuerpo íntegro', () => {
  const snapshot = buildOfflineSnapshot(contentDir, new Date('2026-11-20T12:00:00Z'));

  assert.equal(snapshot.version, OFFLINE_SNAPSHOT_VERSION);
  assert.equal(snapshot.generatedAt, '2026-11-20T12:00:00.000Z');
  assert.deepEqual(
    snapshot.entries.map((entry) => entry.slug).sort(),
    published.map(({ entry }) => entry.slug).sort(),
  );

  for (const { entry, markdown } of published) {
    const copy = snapshot.entries.find((item) => item.slug === entry.slug);
    assert.deepEqual(copy, { ...entry, markdown });
  }
});

test('la copia sin conexión va de la entrada más reciente a la más antigua y sin borradores', () => {
  const { entries } = buildOfflineSnapshot(contentDir);
  const dates = entries.map((entry) => Date.parse(entry.publishedAt));

  assert.deepEqual(
    dates,
    [...dates].sort((a, b) => b - a),
  );
  assert.ok(entries.every((entry) => entry.status === 'published'));
});

test('la copia generada en public/offline coincide con el Markdown del repositorio', (t) => {
  if (!existsSync(snapshotFile)) {
    t.skip('public/offline/journal.json aún no se ha generado (se crea en npm run build).');
    return;
  }

  const onDisk = JSON.parse(readFileSync(snapshotFile, 'utf8'));
  const fresh = buildOfflineSnapshot(contentDir);

  assert.equal(onDisk.version, fresh.version);
  assert.deepEqual(onDisk.entries, fresh.entries);
});
