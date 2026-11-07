import { signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ArticleMetadata } from '@core/models/article.model';
import { JournalError } from '@core/models/journal-error';
import { READ_RETRY } from '@core/rxjs/retry-transient';
import { JournalService } from '@core/services/journal.service';

import { LandingComponent } from './landing';

function entry(partial: Partial<ArticleMetadata>): ArticleMetadata {
  return {
    slug: 'note',
    title: 'Note',
    author: 'Hugo Colmenares',
    summary: 'A note.',
    tags: [],
    category: 'journal',
    series: 'journal',
    publishedAt: '2026-01-02T12:00:00.000Z',
    updatedAt: '2026-01-02T12:00:00.000Z',
    status: 'published',
    readingTimeMinutes: 2,
    ...partial,
  };
}

const articles: ArticleMetadata[] = [
  entry({
    slug: 'older-note',
    title: 'Older note',
    publishedAt: '2026-01-02T12:00:00.000Z',
    tags: ['notes'],
    summary: 'An earlier entry.',
  }),
  entry({
    slug: 'angular-signals-in-practice',
    title: 'Angular signals in practice',
    publishedAt: '2026-09-10T12:00:00.000Z',
    tags: ['angular'],
    summary: 'How signal inputs keep a content site explicit.',
  }),
];

function titles(fixture: { nativeElement: HTMLElement }): string[] {
  return [...fixture.nativeElement.querySelectorAll('.card__title')].map((node) =>
    (node as HTMLElement).textContent?.trim(),
  );
}

function buttonWithText(root: HTMLElement, selector: string, text: string): HTMLButtonElement {
  return [...root.querySelectorAll(selector)].find((node) =>
    (node as HTMLElement).textContent?.includes(text),
  ) as HTMLButtonElement;
}

describe('LandingComponent', () => {
  let watchPublished: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    watchPublished = vi.fn(() => of(articles));
    TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: READ_RETRY, useValue: { attempts: 0, baseDelayMs: 1 } },
        {
          provide: JournalService,
          useValue: { offline: signal(false), watchPublished },
        },
      ],
    });
  });

  it('paints published entries with the newest first', async () => {
    const fixture = TestBed.createComponent(LandingComponent);
    await fixture.whenStable();

    expect(titles(fixture)).toEqual(['Angular signals in practice', 'Older note']);
    expect(fixture.nativeElement.textContent).toContain('Featured entry');
    expect(fixture.nativeElement.textContent).toContain('Recently published');
    expect(fixture.nativeElement.querySelectorAll('.card--compact').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('2 min');
  });

  it('filters the catalog by tag and deduplicates shared tags', async () => {
    watchPublished.mockReturnValue(
      of([
        entry({
          slug: 'one',
          title: 'One',
          tags: ['angular', 'angular'],
          publishedAt: '2026-02-02',
        }),
        entry({ slug: 'two', title: 'Two', tags: ['angular'], publishedAt: '2026-02-01' }),
      ]),
    );

    const fixture = TestBed.createComponent(LandingComponent);
    await fixture.whenStable();

    const filters = [...fixture.nativeElement.querySelectorAll('.filter')] as HTMLElement[];
    expect(filters.filter((node) => node.textContent?.trim() === 'angular')).toHaveLength(1);

    buttonWithText(fixture.nativeElement, '.filter', 'angular').click();
    await fixture.whenStable();

    expect(titles(fixture)).toEqual(['One', 'Two']);
  });

  it('falls back to updatedAt when an entry has no publish date', async () => {
    watchPublished.mockReturnValue(
      of([
        entry({
          slug: 'undated',
          title: 'Undated note',
          publishedAt: null,
          updatedAt: '2026-11-05T12:00:00.000Z',
        }),
        entry({
          slug: 'dated',
          title: 'Dated note',
          publishedAt: '2026-11-04T12:00:00.000Z',
          updatedAt: '2026-11-04T12:00:00.000Z',
        }),
      ]),
    );

    const fixture = TestBed.createComponent(LandingComponent);
    await fixture.whenStable();

    expect(titles(fixture)).toEqual(['Undated note', 'Dated note']);
  });

  it('offers a manual retry after a Firestore failure without a local fallback', async () => {
    watchPublished.mockReturnValueOnce(
      throwError(() => new JournalError('offline', 'Firestore is unavailable.')),
    );
    const fixture = TestBed.createComponent(LandingComponent);
    await fixture.whenStable();

    const view = fixture.nativeElement as HTMLElement;
    expect(view.textContent).toContain('The journal could not be loaded.');
    expect(view.textContent).not.toContain('Older note');

    buttonWithText(view, '.empty-state .btn', 'Try again').click();
    await fixture.whenStable();

    expect(titles(fixture)).toEqual(['Angular signals in practice', 'Older note']);
    expect(view.textContent).toContain('Featured entry');
  });
});
