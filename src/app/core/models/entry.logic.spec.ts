import {
  dateInputToDate,
  normalizeDraft,
  readingTimeMinutes,
  slugify,
  splitTags,
} from './entry.logic';
import { JournalError } from './journal-error';

describe('entry logic', () => {
  it('slugifies titles', () => {
    expect(slugify('Ángular Signals, in practice')).toBe('angular-signals-in-practice');
  });

  it('rounds reading time at 200 words per minute', () => {
    expect(readingTimeMinutes('   ')).toBe(1);
    expect(readingTimeMinutes('word '.repeat(200))).toBe(1);
    expect(readingTimeMinutes('word '.repeat(300))).toBe(2);
  });

  it('splits tags', () => {
    expect(splitTags(' Angular, journal, ')).toEqual(['angular', 'journal']);
  });

  it('normalizes a publishable draft and drops the date on drafts', () => {
    const published = normalizeDraft({
      slug: 'field-note',
      title: 'Field note',
      summary: 'A short summary',
      tags: ['Angular'],
      category: 'journal',
      series: 'Notes',
      author: 'Hugo Colmenares',
      status: 'published',
      publishedAt: dateInputToDate('2026-09-08'),
      markdown: 'Hello from the studio.',
    });

    expect(published.tags).toEqual(['angular']);
    expect(published.publishedAt?.toISOString()).toBe('2026-09-08T12:00:00.000Z');

    const draft = normalizeDraft({ ...published, status: 'draft', tags: ['angular'] });
    expect(draft.publishedAt).toBeNull();
  });

  it('rejects an invalid slug', () => {
    expect(() =>
      normalizeDraft({
        slug: 'Not A Slug',
        title: 'Field note',
        summary: 'A short summary',
        tags: [],
        category: 'journal',
        series: 'journal',
        author: 'Hugo Colmenares',
        status: 'draft',
        publishedAt: null,
        markdown: 'Body',
      }),
    ).toThrow(JournalError);
  });
});
