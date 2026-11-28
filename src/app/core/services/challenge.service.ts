import { Injectable, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
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
} from 'firebase/firestore';
import { Observable, throwError } from 'rxjs';

import { firebaseFirestore } from '@core/firebase/firestore';
import { timestampToIso } from '@core/firebase/firestore-helpers';
import { Challenge, ChallengeDifficulty, ChallengeDraft } from '@core/models/challenge.model';
import { normalizeChallenge } from '@core/models/challenge.logic';
import { SLUG_PATTERN } from '@core/models/entry.logic';
import { JournalError, journalErrorFromUnknown } from '@core/models/journal-error';

export interface ChallengeSaveOptions {
  create?: boolean;
  /** ISO timestamp from the last loaded revision; required for updates. */
  expectedUpdatedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ChallengeService {
  readonly offline = signal(false);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.offline.set(false));
      window.addEventListener('offline', () => this.offline.set(true));
    }
  }

  /** Public: only published challenges, in the list order. Needs the (status, order) index. */
  watchPublished(): Observable<Challenge[]> {
    const published = query(
      collection(firebaseFirestore(), 'challenges'),
      where('status', '==', 'published'),
      orderBy('order', 'asc'),
    );
    return this.watchQuery(published, 'public');
  }

  /** Public: one challenge. Missing or draft documents fail as not-found. */
  watchOne(slug: string): Observable<Challenge> {
    if (!SLUG_PATTERN.test(slug)) {
      return throwError(() => new JournalError('invalid-slug', 'Invalid challenge slug.'));
    }

    return new Observable((subscriber) => {
      const stop = onSnapshot(
        doc(firebaseFirestore(), 'challenges', slug),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!snapshot.exists() || snapshot.data()['status'] !== 'published') {
            if (snapshot.metadata.fromCache && this.isBrowserOffline()) {
              this.fail(
                subscriber,
                new JournalError('offline', 'Firestore is unavailable.'),
                'public',
              );
              return;
            }
            subscriber.error(new JournalError('not-found', 'Challenge not found'));
            return;
          }

          this.offline.set(false);
          subscriber.next(challengeFromSnapshot(slug, snapshot.data()));
        },
        (error) => this.fail(subscriber, error, 'public'),
      );

      return () => stop();
    });
  }

  /** Studio: every challenge, newest edit first (single-field index). */
  watchAll(): Observable<Challenge[]> {
    const all = query(collection(firebaseFirestore(), 'challenges'), orderBy('updatedAt', 'desc'));
    return this.watchQuery(all, 'admin');
  }

  async load(slug: string): Promise<Challenge> {
    if (!SLUG_PATTERN.test(slug)) {
      throw new JournalError('invalid-slug', 'Invalid challenge slug.');
    }

    try {
      const snapshot = await getDoc(doc(firebaseFirestore(), 'challenges', slug));
      if (!snapshot.exists()) {
        throw new JournalError('not-found', 'Challenge not found');
      }
      this.offline.set(false);
      return challengeFromSnapshot(slug, snapshot.data());
    } catch (error) {
      throw this.asError(error, 'admin');
    }
  }

  /** Mirrors JournalService.save: runTransaction plus a conflict check on updatedAt. */
  async save(draft: ChallengeDraft, options?: ChallengeSaveOptions): Promise<string> {
    const challenge = normalizeChallenge(draft);
    const ref = doc(firebaseFirestore(), 'challenges', challenge.slug);
    const nextUpdatedAt = Timestamp.now();

    try {
      await runTransaction(firebaseFirestore(), async (tx) => {
        const existing = await tx.get(ref);

        if (options?.create) {
          if (existing.exists()) {
            throw new JournalError('conflict', 'Ya existe un reto con este slug.');
          }
        } else if (existing.exists()) {
          const currentUpdatedAt = timestampToIso(existing.data()['updatedAt']);
          const expected = options?.expectedUpdatedAt ?? null;
          if (expected && currentUpdatedAt && currentUpdatedAt !== expected) {
            throw new JournalError(
              'conflict',
              'Este reto cambió en otra pestaña. Recárgalo antes de guardar.',
            );
          }
        } else if (options?.expectedUpdatedAt) {
          throw new JournalError('not-found', 'Challenge not found');
        }

        tx.set(ref, {
          slug: challenge.slug,
          title: challenge.title,
          summary: challenge.summary,
          difficulty: challenge.difficulty,
          tags: challenge.tags,
          language: challenge.language,
          prompt: challenge.prompt,
          hint: challenge.hint,
          solution: challenge.solution,
          articleSlug: challenge.articleSlug ?? null,
          articleTitle: challenge.articleTitle ?? null,
          order: challenge.order,
          status: challenge.status,
          publishedAt:
            challenge.status === 'published' && challenge.publishedAt
              ? Timestamp.fromDate(challenge.publishedAt)
              : null,
          updatedAt: nextUpdatedAt,
        });
      });
      this.offline.set(false);
      return nextUpdatedAt.toDate().toISOString();
    } catch (error) {
      throw this.asError(error, 'admin');
    }
  }

  async remove(slug: string): Promise<void> {
    if (!SLUG_PATTERN.test(slug)) {
      throw new JournalError('invalid-slug', 'Invalid challenge slug.');
    }

    try {
      await deleteDoc(doc(firebaseFirestore(), 'challenges', slug));
      this.offline.set(false);
    } catch (error) {
      throw this.asError(error, 'admin');
    }
  }

  async exportAll(): Promise<Challenge[]> {
    try {
      const listed = await getDocs(
        query(collection(firebaseFirestore(), 'challenges'), orderBy('updatedAt', 'desc')),
      );
      this.offline.set(false);
      return listed.docs.map((item) => challengeFromSnapshot(item.id, item.data()));
    } catch (error) {
      throw this.asError(error, 'admin');
    }
  }

  private watchQuery(
    challenges: ReturnType<typeof query>,
    audience: 'public' | 'admin',
  ): Observable<Challenge[]> {
    return new Observable((subscriber) => {
      let sawServer = false;

      const stop = onSnapshot(
        challenges,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.fromCache) {
            if (this.isBrowserOffline()) {
              this.offline.set(true);
              if (!sawServer) {
                this.fail(
                  subscriber,
                  new JournalError('offline', 'Firestore is unavailable.'),
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
            snapshot.docs.map((item) =>
              challengeFromSnapshot(item.id, item.data() as DocumentData),
            ),
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

function challengeFromSnapshot(id: string, data: DocumentData): Challenge {
  const tags = Array.isArray(data['tags'])
    ? data['tags'].filter((tag): tag is string => typeof tag === 'string')
    : [];

  return {
    slug: text(data, 'slug') || id,
    title: text(data, 'title') || id,
    summary: text(data, 'summary'),
    difficulty: difficultyFrom(data['difficulty']),
    tags,
    prompt: text(data, 'prompt'),
    hint: text(data, 'hint'),
    solution: text(data, 'solution'),
    language: text(data, 'language'),
    articleSlug: nullableText(data['articleSlug']),
    articleTitle: nullableText(data['articleTitle']),
    order: typeof data['order'] === 'number' ? data['order'] : 0,
    status: data['status'] === 'draft' ? 'draft' : 'published',
    publishedAt: timestampToIso(data['publishedAt']),
    updatedAt: timestampToIso(data['updatedAt']) ?? new Date(0).toISOString(),
  };
}

function difficultyFrom(value: unknown): ChallengeDifficulty {
  return value === 'practice' || value === 'stretch' ? value : 'warmup';
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function text(data: DocumentData, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}
