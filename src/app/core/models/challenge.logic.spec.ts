import { ChallengeDraft } from './challenge.model';
import { normalizeChallenge } from './challenge.logic';
import { JournalError } from './journal-error';

function draft(extra: Partial<ChallengeDraft> = {}): ChallengeDraft {
  return {
    slug: 'suma-numeros-pares',
    title: 'Suma de números pares',
    summary: 'Suma los pares.',
    difficulty: 'warmup',
    tags: ['JavaScript'],
    prompt: 'Escribe una función.',
    hint: 'Pista',
    solution: 'Solución',
    language: 'javascript',
    articleSlug: null,
    articleTitle: null,
    order: 10,
    status: 'draft',
    publishedAt: null,
    ...extra,
  };
}

describe('challenge logic', () => {
  it('normalizes tags, strings, and a published date', () => {
    const published = normalizeChallenge(
      draft({
        status: 'published',
        publishedAt: new Date('2026-11-27T12:00:00.000Z'),
        articleSlug: ' api-por-capas ',
        articleTitle: ' APIs por capas ',
        tags: [' JavaScript ', 'loops'],
      }),
    );

    expect(published.tags).toEqual(['javascript', 'loops']);
    expect(published.articleSlug).toBe('api-por-capas');
    expect(published.articleTitle).toBe('APIs por capas');
    expect(published.publishedAt?.toISOString()).toBe('2026-11-27T12:00:00.000Z');
  });

  it('drops the publication date on drafts', () => {
    const normalized = normalizeChallenge(
      draft({ status: 'draft', publishedAt: new Date('2026-11-27T12:00:00.000Z') }),
    );

    expect(normalized.publishedAt).toBeNull();
    expect(normalized.articleTitle).toBeNull();
  });

  it('rejects an invalid slug', () => {
    expect(() => normalizeChallenge(draft({ slug: 'Not A Slug' }))).toThrow(JournalError);
  });

  it('rejects an invalid difficulty', () => {
    expect(() =>
      normalizeChallenge(draft({ difficulty: 'hard' as ChallengeDraft['difficulty'] })),
    ).toThrow(JournalError);
  });

  it('rejects a published challenge without a date', () => {
    expect(() => normalizeChallenge(draft({ status: 'published' }))).toThrow(JournalError);
  });

  it('rejects an invalid related article slug', () => {
    expect(() => normalizeChallenge(draft({ articleSlug: 'Mal Slug' }))).toThrow(JournalError);
  });
});
