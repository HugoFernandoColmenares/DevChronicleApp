import { Injectable, signal } from '@angular/core';
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Observable, throwError } from 'rxjs';

import { firebaseFirestore } from '@core/firebase/firestore';
import { ArticleBody, ArticleMetadata, EntryDraft } from '@core/models/article.model';
import { normalizeDraft, readingTimeMinutes, SLUG_PATTERN } from '@core/models/entry.logic';
import { JournalError, journalErrorFromUnknown } from '@core/models/journal-error';

export interface SaveOptions {
  create?: boolean;
  /** ISO timestamp from the last loaded revision; required for updates. */
  expectedUpdatedAt?: string | null;
}

export interface JournalExportEntry {
  entry: ArticleMetadata;
  markdown: string;
}

@Injectable({ providedIn: 'root' })
export class JournalService {
  readonly offline = signal(false);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.offline.set(false));
      window.addEventListener('offline', () => this.offline.set(true));
    }
  }

  watchPublished(): Observable<ArticleMetadata[]> {
    const published = query(
      collection(firebaseFirestore(), 'entries'),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
    );
    return this.watchQuery(published, 'public');
  }

  watchAll(): Observable<ArticleMetadata[]> {
    const entries = query(collection(firebaseFirestore(), 'entries'), orderBy('updatedAt', 'desc'));
    return this.watchQuery(entries, 'admin');
  }

  watchEntry(slug: string): Observable<ArticleBody> {
    if (!SLUG_PATTERN.test(slug)) {
      return throwError(() => new JournalError('invalid-slug', 'Slug de artículo no válido.'));
    }

    return new Observable((subscriber) => {
      let stopBody = () => {};
      const stopEntry = onSnapshot(
        doc(firebaseFirestore(), 'entries', slug),
        { includeMetadataChanges: true },
        (entry) => {
          stopBody();
          if (!entry.exists() || entry.data()['status'] !== 'published') {
            // Sin red y sin caché, Firestore responde "no existe" desde la caché local:
            // es una caída, no un artículo faltante.
            if (
              isMissingFromCache(entry) ||
              (entry.metadata.fromCache && this.isBrowserOffline())
            ) {
              this.fail(
                subscriber,
                new JournalError('offline', 'Firestore no está disponible.'),
                'public',
              );
              return;
            }
            subscriber.error(new JournalError('not-found', 'Artículo no encontrado'));
            return;
          }

          stopBody = onSnapshot(
            doc(firebaseFirestore(), 'entries', slug, 'body', 'current'),
            { includeMetadataChanges: true },
            (body) => {
              if (body.metadata.fromCache && this.isBrowserOffline()) {
                this.fail(
                  subscriber,
                  new JournalError('offline', 'Firestore no está disponible.'),
                  'public',
                );
                return;
              }
              this.offline.set(false);
              subscriber.next({
                metadata: metadataFromSnapshot(slug, entry.data()),
                markdown: markdownFromSnapshot(body.data()),
              });
            },
            (error) => this.fail(subscriber, error, 'public'),
          );
        },
        (error) => this.fail(subscriber, error, 'public'),
      );

      return () => {
        stopEntry();
        stopBody();
      };
    });
  }

  async loadEntry(slug: string): Promise<ArticleBody> {
    if (!SLUG_PATTERN.test(slug)) {
      throw new JournalError('invalid-slug', 'Slug de artículo no válido.');
    }

    try {
      const entry = await getDoc(doc(firebaseFirestore(), 'entries', slug));
      if (!entry.exists()) {
        throw new JournalError('not-found', 'Artículo no encontrado');
      }
      const body = await getDoc(doc(firebaseFirestore(), 'entries', slug, 'body', 'current'));
      this.offline.set(false);
      return {
        metadata: metadataFromSnapshot(slug, entry.data()),
        markdown: markdownFromSnapshot(body.data()),
      };
    } catch (error) {
      throw this.asError(error, 'admin');
    }
  }

  async save(draft: EntryDraft, options?: SaveOptions): Promise<string> {
    const entry = normalizeDraft(draft);
    const ref = doc(firebaseFirestore(), 'entries', entry.slug);
    const bodyRef = doc(firebaseFirestore(), 'entries', entry.slug, 'body', 'current');
    const nextUpdatedAt = Timestamp.now();

    try {
      await runTransaction(firebaseFirestore(), async (tx) => {
        const existing = await tx.get(ref);

        if (options?.create) {
          if (existing.exists()) {
            throw new JournalError('conflict', 'Ya existe una entrada con este slug.');
          }
        } else if (existing.exists()) {
          const currentUpdatedAt = timestampToIso(existing.data()['updatedAt']);
          const expected = options?.expectedUpdatedAt ?? null;
          if (expected && currentUpdatedAt && currentUpdatedAt !== expected) {
            throw new JournalError(
              'conflict',
              'Esta entrada cambió en otra pestaña. Vuelve a cargarla antes de guardar.',
            );
          }
        } else if (options?.expectedUpdatedAt) {
          throw new JournalError('not-found', 'Artículo no encontrado');
        }

        tx.set(ref, {
          slug: entry.slug,
          title: entry.title,
          summary: entry.summary,
          tags: entry.tags,
          category: entry.category,
          series: entry.series,
          author: entry.author,
          status: entry.status,
          publishedAt:
            entry.status === 'published' && entry.publishedAt
              ? Timestamp.fromDate(entry.publishedAt)
              : null,
          updatedAt: nextUpdatedAt,
          readingTimeMinutes: readingTimeMinutes(entry.markdown),
        });
        tx.set(bodyRef, { markdown: entry.markdown });
      });
      this.offline.set(false);
      return nextUpdatedAt.toDate().toISOString();
    } catch (error) {
      throw this.asError(error, 'admin');
    }
  }

  async remove(slug: string): Promise<void> {
    if (!SLUG_PATTERN.test(slug)) {
      throw new JournalError('invalid-slug', 'Slug de artículo no válido.');
    }

    try {
      const batch = writeBatch(firebaseFirestore());
      batch.delete(doc(firebaseFirestore(), 'entries', slug, 'body', 'current'));
      batch.delete(doc(firebaseFirestore(), 'entries', slug));
      await batch.commit();
      this.offline.set(false);
    } catch (error) {
      throw this.asError(error, 'admin');
    }
  }

  async exportAll(): Promise<JournalExportEntry[]> {
    try {
      const listed = await getDocs(
        query(collection(firebaseFirestore(), 'entries'), orderBy('updatedAt', 'desc')),
      );
      const pack: JournalExportEntry[] = [];
      for (const item of listed.docs) {
        const metadata = metadataFromSnapshot(item.id, item.data() as DocumentData);
        const body = await getDoc(
          doc(firebaseFirestore(), 'entries', metadata.slug, 'body', 'current'),
        );
        pack.push({
          entry: metadata,
          markdown: markdownFromSnapshot(body.data()),
        });
      }
      this.offline.set(false);
      return pack;
    } catch (error) {
      throw this.asError(error, 'admin');
    }
  }

  private watchQuery(
    entries: ReturnType<typeof query>,
    audience: 'public' | 'admin',
  ): Observable<ArticleMetadata[]> {
    return new Observable((subscriber) => {
      let sawServer = false;

      const stop = onSnapshot(
        entries,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.fromCache) {
            // Una lista vacía servida solo desde la caché significa que el servidor no respondió:
            // se trata como caída para no mostrar un diario vacío (C2 de la auditoría).
            if (!sawServer && isEmptyFromCache(snapshot)) {
              this.fail(
                subscriber,
                new JournalError('offline', 'Firestore no está disponible.'),
                audience,
              );
              return;
            }
            if (this.isBrowserOffline()) {
              this.offline.set(true);
              if (!sawServer) {
                this.fail(
                  subscriber,
                  new JournalError('offline', 'Firestore no está disponible.'),
                  audience,
                );
              }
              return;
            }
          } else {
            sawServer = true;
            this.offline.set(false);
          }

          subscriber.next(
            snapshot.docs.map((item) => metadataFromSnapshot(item.id, item.data() as DocumentData)),
          );
        },
        (error) => this.fail(subscriber, error, audience),
      );

      return () => stop();
    });
  }

  private isBrowserOffline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  private fail(
    subscriber: { error: (error: JournalError) => void },
    error: unknown,
    audience: 'public' | 'admin',
  ): void {
    const journalError = this.asError(error, audience);
    if (journalError.code === 'offline') {
      this.offline.set(true);
    }
    subscriber.error(journalError);
  }

  private asError(error: unknown, audience: 'public' | 'admin'): JournalError {
    const journalError = journalErrorFromUnknown(error, audience);
    if (journalError.code === 'offline') {
      this.offline.set(true);
    }
    return journalError;
  }
}

/** Lista vacía que Firestore sirvió desde la caché local: no hubo respuesta del servidor. */
export function isEmptyFromCache(snapshot: {
  empty: boolean;
  metadata: { fromCache: boolean };
}): boolean {
  return snapshot.empty && snapshot.metadata.fromCache;
}

/** Documento "inexistente" que solo se comprobó en la caché local: no es un 404 real. */
export function isMissingFromCache(entry: {
  exists(): boolean;
  metadata: { fromCache: boolean };
}): boolean {
  return !entry.exists() && entry.metadata.fromCache;
}

function metadataFromSnapshot(id: string, data: DocumentData): ArticleMetadata {
  const tags = Array.isArray(data['tags'])
    ? data['tags'].filter((tag): tag is string => typeof tag === 'string')
    : [];

  return {
    slug: text(data, 'slug') || id,
    title: text(data, 'title') || id,
    summary: text(data, 'summary'),
    tags,
    category: text(data, 'category'),
    series: text(data, 'series'),
    author: text(data, 'author'),
    status: data['status'] === 'draft' ? 'draft' : 'published',
    publishedAt: timestampToIso(data['publishedAt']),
    updatedAt: timestampToIso(data['updatedAt']) ?? new Date(0).toISOString(),
    readingTimeMinutes:
      typeof data['readingTimeMinutes'] === 'number' && data['readingTimeMinutes'] > 0
        ? data['readingTimeMinutes']
        : 1,
  };
}

function markdownFromSnapshot(data: DocumentData | undefined): string {
  const markdown = data?.['markdown'];
  return typeof markdown === 'string' ? markdown : '';
}

function text(data: DocumentData, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

function timestampToIso(value: unknown): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return (value.toDate as () => Date)().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}
