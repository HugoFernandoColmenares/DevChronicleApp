import { signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ArticleMetadata } from '@core/models/article.model';
import { JournalError } from '@core/models/journal-error';
import { JournalService } from '@core/services/journal.service';
import { NotificationService } from '@core/services/notification.service';

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

describe('LandingComponent', () => {
  let notifications: NotificationService;
  let watchPublished: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    watchPublished = vi.fn(() => of(articles));
    TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: JournalService,
          useValue: { offline: signal(false), watchPublished },
        },
      ],
    });
    notifications = TestBed.inject(NotificationService);
    vi.spyOn(notifications, 'error').mockResolvedValue({ isConfirmed: true } as never);
  });

  it('paints published entries with the newest first', async () => {
    const fixture = TestBed.createComponent(LandingComponent);
    await fixture.whenStable();

    const titles = [...fixture.nativeElement.querySelectorAll('.card__title')].map((node) =>
      (node as HTMLElement).textContent?.trim(),
    );
    expect(titles).toEqual(['Angular signals in practice', 'Older note']);
    expect(fixture.nativeElement.textContent).toContain('Featured entry');
    expect(fixture.nativeElement.textContent).toContain('Recently published');
    expect(fixture.nativeElement.querySelectorAll('.card--compact').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('2 min');
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('filters the catalog by tag', async () => {
    const fixture = TestBed.createComponent(LandingComponent);
    await fixture.whenStable();

    const angular = [...fixture.nativeElement.querySelectorAll('.filter')].find((node) =>
      (node as HTMLElement).textContent?.includes('angular'),
    ) as HTMLButtonElement;
    angular.click();
    await fixture.whenStable();

    const titles = [...fixture.nativeElement.querySelectorAll('.card__title')].map((node) =>
      (node as HTMLElement).textContent?.trim(),
    );
    expect(titles).toEqual(['Angular signals in practice']);
  });

  it('reports a Firestore failure without a local fallback', async () => {
    watchPublished.mockReturnValue(
      throwError(() => new JournalError('offline', 'Firestore is unavailable.')),
    );
    const fixture = TestBed.createComponent(LandingComponent);
    await fixture.whenStable();

    expect(notifications.error).toHaveBeenCalledWith(
      'Unable to load the journal',
      'Firestore did not respond. Refresh the page to try again.',
    );
    expect(fixture.nativeElement.textContent).toContain('No entries are published yet.');
    expect(fixture.nativeElement.textContent).not.toContain('Older note');
  });
});
