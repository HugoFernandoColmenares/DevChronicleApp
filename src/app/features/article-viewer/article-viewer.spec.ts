import { signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { ArticleMetadata } from '@core/models/article.model';
import { JournalError } from '@core/models/journal-error';
import { JournalService } from '@core/services/journal.service';
import { NotificationService } from '@core/services/notification.service';

import { ArticleViewerComponent } from './article-viewer';

function entry(partial: Partial<ArticleMetadata>): ArticleMetadata {
  return {
    slug: 'angular-signals-in-practice',
    title: 'Angular signals in practice',
    author: 'Hugo Colmenares',
    summary: 'Signal inputs.',
    tags: ['angular'],
    category: 'journal',
    series: 'Signals',
    publishedAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
    status: 'published',
    readingTimeMinutes: 4,
    ...partial,
  };
}

describe('ArticleViewerComponent', () => {
  let notifications: NotificationService;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let watchEntry: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ slug: 'pending' }));
    watchEntry = vi.fn((slug: string) => {
      if (slug === 'missing-entry') {
        return throwError(() => new JournalError('not-found', 'Article not found'));
      }
      if (slug === 'offline-entry') {
        return throwError(() => new JournalError('offline', 'Firestore is unavailable.'));
      }
      return of({
        metadata: entry({ slug }),
        markdown: '## Inputs without decorators\n\nThe body has no frontmatter.',
      });
    });

    TestBed.configureTestingModule({
      imports: [ArticleViewerComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
        { provide: JournalService, useValue: { offline: signal(false), watchEntry } },
      ],
    });
    notifications = TestBed.inject(NotificationService);
    vi.spyOn(notifications, 'error').mockResolvedValue({ isConfirmed: true } as never);
  });

  async function open(slug: string): Promise<ComponentFixture<ArticleViewerComponent>> {
    params.next(convertToParamMap({ slug }));
    const fixture = TestBed.createComponent(ArticleViewerComponent);
    await fixture.whenStable();
    return fixture;
  }

  it('compiles markdown from Firestore', async () => {
    const fixture = await open('angular-signals-in-practice');
    const view = fixture.nativeElement as HTMLElement;

    expect(view.querySelector('h1')?.textContent).toContain('Angular signals in practice');
    expect(view.querySelector('.markdown-body h2')?.textContent).toContain(
      'Inputs without decorators',
    );
    expect(view.textContent).toContain('4 min read');
    expect(view.textContent).toContain('Signals');
    expect(view.textContent).not.toContain('excerpt:');
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('reports a missing entry through NotificationService', async () => {
    const fixture = await open('missing-entry');

    expect(notifications.error).toHaveBeenCalledWith(
      'Article not found',
      'This entry is missing or the link is invalid.',
    );
    expect((fixture.nativeElement as HTMLElement).querySelector('.empty')?.textContent).toContain(
      'could not be opened',
    );
  });

  it('reports an unreachable journal without reading a local file', async () => {
    const fixture = await open('offline-entry');

    expect(notifications.error).toHaveBeenCalledWith(
      'Unable to load the journal',
      'This entry could not be retrieved. Refresh the page to try again.',
    );
    expect(watchEntry).toHaveBeenCalledWith('offline-entry');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('local file');
  });
});
