import { Injectable, signal } from '@angular/core';
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Observable, throwError } from 'rxjs';

import { firebaseFirestore } from '@core/firebase/firestore';
import { ArticleBody, ArticleMetadata, EntryDraft } from '@core/models/article.model';
import { normalizeDraft, readingTimeMinutes, SLUG_PATTERN } from '@core/models/entry.logic';
import { JournalError, journalErrorFromUnknown } from '@core/models/journal-error';

@Injectable({ providedIn: 'root' })
export class JournalService {
  readonly offline = signal(false);

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
      return throwError(() => new JournalError('invalid-slug', 'Invalid article slug.'));
    }

    return new Observable((subscriber) => {
      let stopBody = () => {};
      const stopEntry = onSnapshot(
        doc(firebaseFirestore(), 'entries', slug),
        (entry) => {
          stopBody();
          if (!entry.exists() || entry.data()['status'] !== 'published') {
            subscriber.error(new JournalError('not-found', 'Article not found'));
            return;
          }

          stopBody = onSnapshot(
            doc(firebaseFirestore(), 'entries', slug, 'body', 'current'),
            (body) => {
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
      throw new JournalError('invalid-slug', 'Invalid article slug.');
    }

    try {
      const entry = await getDoc(doc(firebaseFirestore(), 'entries', slug));
      if (!entry.exists()) {
        throw new JournalError('not-found', 'Article not found');
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

  async save(draft: EntryDraft, options?: { create?: boolean }): Promise<void> {
    const entry = normalizeDraft(draft);
    const ref = doc(firebaseFirestore(), 'entries', entry.slug);
    const bodyRef = doc(firebaseFirestore(), 'entries', entry.slug, 'body', 'current');

    try {
      if (options?.create) {
        const existing = await getDoc(ref);
        if (existing.exists()) {
          throw new JournalError('conflict', 'An entry with this slug already exists.');
        }
      }

      const batch = writeBatch(firebaseFirestore());
      batch.set(ref, {
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
        updatedAt: Timestamp.now(),
        readingTimeMinutes: readingTimeMinutes(entry.markdown),
      });
      batch.set(bodyRef, { markdown: entry.markdown });
      await batch.commit();
      this.offline.set(false);
    } catch (error) {
      throw this.asError(error, 'admin');
    }
  }

  async remove(slug: string): Promise<void> {
    if (!SLUG_PATTERN.test(slug)) {
      throw new JournalError('invalid-slug', 'Invalid article slug.');
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

  private watchQuery(
    entries: ReturnType<typeof query>,
    audience: 'public' | 'admin',
  ): Observable<ArticleMetadata[]> {
    return new Observable((subscriber) =>
      onSnapshot(
        entries,
        (snapshot) => {
          this.offline.set(false);
          subscriber.next(
            snapshot.docs.map((item) => metadataFromSnapshot(item.id, item.data() as DocumentData)),
          );
        },
        (error) => this.fail(subscriber, error, audience),
      ),
    );
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
