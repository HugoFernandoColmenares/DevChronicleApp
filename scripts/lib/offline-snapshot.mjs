import { readdirSync, readFileSync } from 'node:fs';

import { entryFromMarkdown } from './markdown-entry.mjs';

export const OFFLINE_SNAPSHOT_VERSION = 1;

/**
 * Copia estática del diario publicada junto a la SPA. Solo se lee cuando Firestore
 * no responde, y la interfaz la marca siempre como copia sin conexión.
 */
export function buildOfflineSnapshot(contentDir, generatedAt = new Date()) {
  const entries = readdirSync(contentDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) =>
      entryFromMarkdown(name.slice(0, -3), readFileSync(new URL(name, contentDir), 'utf8')),
    )
    .filter(({ entry }) => entry.status === 'published')
    .sort((a, b) => Date.parse(b.entry.publishedAt) - Date.parse(a.entry.publishedAt))
    .map(({ entry, markdown }) => ({ ...entry, markdown }));

  return {
    version: OFFLINE_SNAPSHOT_VERSION,
    generatedAt: generatedAt.toISOString(),
    entries,
  };
}
