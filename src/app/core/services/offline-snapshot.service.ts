import { Injectable } from '@angular/core';

import { ArticleBody, ArticleMetadata } from '@core/models/article.model';

/** Ruta de la copia estática que genera `scripts/write-offline-snapshot.mjs` en cada build. */
export const OFFLINE_SNAPSHOT_URL = '/offline/journal.json';

export interface OfflineSnapshotEntry extends ArticleMetadata {
  markdown: string;
}

export interface OfflineSnapshot {
  version: number;
  generatedAt: string;
  entries: OfflineSnapshotEntry[];
}

export interface OfflineList {
  generatedAt: string;
  entries: ArticleMetadata[];
}

export interface OfflineEntry {
  generatedAt: string;
  body: ArticleBody;
}

/**
 * Respaldo de solo lectura para cuando Firestore no responde. Se descarga únicamente
 * después de un fallo y la interfaz siempre lo presenta como copia sin conexión.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSnapshotService {
  private pending: Promise<OfflineSnapshot | null> | null = null;

  async list(): Promise<OfflineList | null> {
    const snapshot = await this.load();
    if (!snapshot) {
      return null;
    }
    return {
      generatedAt: snapshot.generatedAt,
      entries: snapshot.entries.map(({ markdown: _markdown, ...metadata }) => metadata),
    };
  }

  async entry(slug: string): Promise<OfflineEntry | null> {
    const snapshot = await this.load();
    const found = snapshot?.entries.find((item) => item.slug === slug);
    if (!snapshot || !found) {
      return null;
    }
    const { markdown, ...metadata } = found;
    return { generatedAt: snapshot.generatedAt, body: { metadata, markdown } };
  }

  private load(): Promise<OfflineSnapshot | null> {
    if (!this.pending) {
      this.pending = fetchSnapshot().then((snapshot) => {
        if (!snapshot) {
          // Si la copia tampoco llega, se vuelve a intentar en el siguiente fallo.
          this.pending = null;
        }
        return snapshot;
      });
    }
    return this.pending;
  }
}

async function fetchSnapshot(): Promise<OfflineSnapshot | null> {
  if (typeof fetch !== 'function') {
    return null;
  }
  try {
    const response = await fetch(OFFLINE_SNAPSHOT_URL, { headers: { accept: 'application/json' } });
    if (!response.ok) {
      return null;
    }
    const data: unknown = await response.json();
    return isOfflineSnapshot(data) ? data : null;
  } catch {
    return null;
  }
}

export function isOfflineSnapshot(value: unknown): value is OfflineSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<OfflineSnapshot>;
  return (
    typeof candidate.generatedAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.generatedAt)) &&
    Array.isArray(candidate.entries) &&
    candidate.entries.every(
      (entry) =>
        !!entry &&
        typeof entry.slug === 'string' &&
        typeof entry.title === 'string' &&
        typeof entry.markdown === 'string' &&
        entry.status === 'published' &&
        Array.isArray(entry.tags),
    )
  );
}
