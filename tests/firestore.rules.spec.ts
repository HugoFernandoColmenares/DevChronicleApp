import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const publishedAt = Timestamp.fromDate(new Date('2026-09-08T12:00:00.000Z'));

function entry(slug: string, status: 'draft' | 'published', extra: Record<string, unknown> = {}) {
  return {
    slug,
    title: slug,
    summary: 'Summary',
    tags: ['journal'],
    category: 'journal',
    series: 'journal',
    author: 'Hugo Colmenares',
    status,
    publishedAt: status === 'published' ? publishedAt : null,
    updatedAt: publishedAt,
    readingTimeMinutes: 2,
    ...extra,
  };
}

function challenge(
  slug: string,
  status: 'draft' | 'published',
  extra: Record<string, unknown> = {},
) {
  return {
    slug,
    title: slug,
    summary: 'Summary',
    difficulty: 'warmup',
    tags: ['javascript'],
    language: 'javascript',
    prompt: 'Write a function.',
    hint: 'Starter skeleton.',
    solution: 'One possible answer.',
    articleSlug: null,
    articleTitle: null,
    order: 10,
    status,
    publishedAt: status === 'published' ? publishedAt : null,
    updatedAt: publishedAt,
    ...extra,
  };
}

describe('firestore rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-devchronicle',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'admins/author-1'), { email: 'admin@devchronicle.test' });
      await setDoc(doc(db, 'editors/editor-1'), { label: 'API publisher' });
      await setDoc(doc(db, 'entries/public-note'), entry('public-note', 'published'));
      await setDoc(doc(db, 'entries/public-note/body/current'), { markdown: '# Public' });
      await setDoc(doc(db, 'entries/secret-note'), entry('secret-note', 'draft'));
      await setDoc(doc(db, 'entries/secret-note/body/current'), { markdown: 'secret' });
      await setDoc(doc(db, 'challenges/public-drill'), challenge('public-drill', 'published'));
      await setDoc(doc(db, 'challenges/secret-drill'), challenge('secret-drill', 'draft'));
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('lets anyone read a published entry and its body', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'entries/public-note')));
    const body = await assertSucceeds(getDoc(doc(db, 'entries/public-note/body/current')));
    expect(body.data()?.['markdown']).toBe('# Public');
  });

  it('hides drafts and their bodies from the public', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'entries/secret-note')));
    await assertFails(getDoc(doc(db, 'entries/secret-note/body/current')));
  });

  it('lists only published entries for the public', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const published = query(
      collection(db, 'entries'),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
    );
    const snap = await assertSucceeds(getDocs(published));
    expect(snap.docs.map((item) => item.id)).toEqual(['public-note']);
    await assertFails(getDocs(collection(db, 'entries')));
  });

  it('blocks public writes and body listings', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'entries/intrusion'), entry('intrusion', 'published')));
    await assertFails(getDocs(collection(db, 'entries/public-note/body')));
    await assertFails(getDoc(doc(db, 'admins/author-1')));
  });

  it('lets a signed-in stranger read published notes but not drafts or admin docs', async () => {
    const db = testEnv.authenticatedContext('reader-2').firestore();
    await assertSucceeds(getDoc(doc(db, 'entries/public-note')));
    await assertFails(getDoc(doc(db, 'entries/secret-note')));
    await assertFails(setDoc(doc(db, 'entries/intrusion'), entry('intrusion', 'draft')));
    await assertFails(getDoc(doc(db, 'admins/author-1')));
    const ownAdmin = await assertSucceeds(getDoc(doc(db, 'admins/reader-2')));
    expect(ownAdmin.exists()).toBe(false);
    await assertFails(setDoc(doc(db, 'admins/reader-2'), { email: 'reader@devchronicle.test' }));
  });

  it('lets an author read drafts, write entries, and not appoint admins', async () => {
    const db = testEnv.authenticatedContext('author-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'entries/secret-note')));
    await assertSucceeds(getDoc(doc(db, 'admins/author-1')));
    const all = await assertSucceeds(getDocs(collection(db, 'entries')));
    expect(all.size).toBe(2);

    await assertSucceeds(setDoc(doc(db, 'entries/new-draft'), entry('new-draft', 'draft')));
    await assertSucceeds(
      setDoc(doc(db, 'entries/new-draft/body/current'), { markdown: 'Draft body' }),
    );
    await assertFails(setDoc(doc(db, 'entries/bad'), entry('bad', 'draft', { markdown: 'nope' })));
    await assertFails(
      setDoc(doc(db, 'entries/bad-date'), entry('bad-date', 'published', { publishedAt: null })),
    );
    await assertFails(setDoc(doc(db, 'entries/public-note/body/other'), { markdown: 'x' }));
    await assertFails(setDoc(doc(db, 'admins/author-1'), { email: 'changed@devchronicle.test' }));
    await assertFails(setDoc(doc(db, 'admins/extra'), { email: 'extra@devchronicle.test' }));

    await assertSucceeds(deleteDoc(doc(db, 'entries/secret-note/body/current')));
    await assertSucceeds(deleteDoc(doc(db, 'entries/secret-note')));
  });

  it('lets the public read and list only published challenges', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'challenges/public-drill')));
    await assertFails(getDoc(doc(db, 'challenges/secret-drill')));

    const published = query(
      collection(db, 'challenges'),
      where('status', '==', 'published'),
      orderBy('order', 'asc'),
    );
    const snap = await assertSucceeds(getDocs(published));
    expect(snap.docs.map((item) => item.id)).toEqual(['public-drill']);
    await assertFails(getDocs(collection(db, 'challenges')));
  });

  it('validates challenge fields and lets an admin create, edit, and delete', async () => {
    const db = testEnv.authenticatedContext('author-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'challenges/new-drill'), challenge('new-drill', 'draft')));
    await assertSucceeds(
      setDoc(doc(db, 'challenges/new-drill'), challenge('new-drill', 'published')),
    );
    await assertSucceeds(deleteDoc(doc(db, 'challenges/new-drill')));

    await assertFails(
      setDoc(doc(db, 'challenges/extra'), challenge('extra', 'draft', { unexpected: 'field' })),
    );
    await assertFails(
      setDoc(
        doc(db, 'challenges/bad-date'),
        challenge('bad-date', 'published', { publishedAt: null }),
      ),
    );
    await assertFails(
      setDoc(
        doc(db, 'challenges/bad-level'),
        challenge('bad-level', 'draft', { difficulty: 'hard' }),
      ),
    );
    await assertFails(
      setDoc(doc(db, 'challenges/bad-order'), challenge('bad-order', 'draft', { order: -1 })),
    );
    await assertFails(
      setDoc(
        doc(db, 'challenges/bad-link'),
        challenge('bad-link', 'draft', { articleSlug: 'Mal Slug' }),
      ),
    );
  });

  it('lets an editor write drafts but not publish, delete, or touch roles', async () => {
    const db = testEnv.authenticatedContext('editor-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'editors/editor-1')));
    await assertSucceeds(getDoc(doc(db, 'challenges/secret-drill')));

    await assertSucceeds(
      setDoc(doc(db, 'challenges/editor-drill'), challenge('editor-drill', 'draft')),
    );
    await assertFails(
      setDoc(doc(db, 'challenges/editor-drill'), challenge('editor-drill', 'published')),
    );
    await assertFails(
      setDoc(doc(db, 'challenges/public-drill'), challenge('public-drill', 'draft')),
    );
    await assertFails(deleteDoc(doc(db, 'challenges/editor-drill')));

    await assertFails(setDoc(doc(db, 'editors/editor-1'), { label: 'changed' }));
    await assertFails(setDoc(doc(db, 'admins/editor-1'), { email: 'editor@devchronicle.test' }));
  });

  it('lets an editor create a draft entry and its body, but not publish it', async () => {
    const db = testEnv.authenticatedContext('editor-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'entries/editor-note'), entry('editor-note', 'draft')));
    await assertSucceeds(
      setDoc(doc(db, 'entries/editor-note/body/current'), { markdown: 'Draft body' }),
    );
    await assertFails(setDoc(doc(db, 'entries/editor-note'), entry('editor-note', 'published')));
    await assertFails(
      setDoc(doc(db, 'entries/public-note/body/current'), { markdown: 'Edited published body' }),
    );
  });
});
