import { signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { ArticleMetadata } from '@core/models/article.model';
import { JournalError } from '@core/models/journal-error';
import { READ_RETRY } from '@core/rxjs/retry-transient';
import { JournalService } from '@core/services/journal.service';

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
        { provide: READ_RETRY, useValue: { attempts: 0, baseDelayMs: 1 } },
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
        { provide: JournalService, useValue: { offline: signal(false), watchEntry } },
      ],
    });
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
    expect(TestBed.inject(Title).getTitle()).toBe('Angular signals in practice · DevChronicle');
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('index, follow');
  });

  it('renders a 404 state for a missing entry without a blocking alert', async () => {
    const fixture = await open('missing-entry');
    const view = fixture.nativeElement as HTMLElement;

    expect(view.querySelector('.error-state')?.textContent).toContain('not published');
    expect(view.textContent).toContain('Browse all articles');
    expect(view.textContent).not.toContain('Try again');
    expect(TestBed.inject(Title).getTitle()).toBe('Article not found · DevChronicle');
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, nofollow');
  });

  it('offers a manual retry when the journal is unreachable', async () => {
    const retryable = of({
      metadata: entry({ slug: 'offline-entry' }),
      markdown: '## Recovered\n\nThe journal answered on the next attempt.',
    });
    watchEntry
      .mockImplementationOnce(() => throwError(() => new JournalError('offline', 'down')))
      .mockImplementationOnce(() => retryable);

    const fixture = await open('offline-entry');
    const view = fixture.nativeElement as HTMLElement;

    expect(view.querySelector('.error-state')?.textContent).toContain('could not be loaded');
    expect(view.textContent).toContain('Try again');

    const retry = [...view.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Try again'),
    ) as HTMLButtonElement;
    retry.click();
    await fixture.whenStable();

    expect(view.querySelector('h1')?.textContent).toContain('Angular signals in practice');
    expect(view.querySelector('.markdown-body h2')?.textContent).toContain('Recovered');
    expect(TestBed.inject(Title).getTitle()).toBe('Angular signals in practice · DevChronicle');
  });
});
