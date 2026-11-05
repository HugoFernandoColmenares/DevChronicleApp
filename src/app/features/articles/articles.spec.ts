import { signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ArticleMetadata } from '@core/models/article.model';
import { JournalError } from '@core/models/journal-error';
import { JournalService } from '@core/services/journal.service';
import { NotificationService } from '@core/services/notification.service';

import { ArticlesComponent } from './articles';

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
    slug: 'markdown-source',
    title: 'Markdown as the source of truth',
    summary: 'Frontmatter and a parser boundary.',
    publishedAt: '2026-09-10T12:00:00.000Z',
    tags: ['markdown', 'architecture'],
  }),
  entry({
    slug: 'nestjs-layers',
    title: 'Construyendo APIs por capas: NestJS',
    summary: 'Un módulo NestJS 10 de productos en memoria.',
    publishedAt: '2026-11-04T12:00:00.000Z',
    tags: ['nestjs', 'arquitectura'],
  }),
  entry({
    slug: 'welcome',
    title: 'Welcome to DevChronicle',
    summary: 'Why the reading column is the product.',
    publishedAt: '2026-09-08T12:00:00.000Z',
    tags: ['journal'],
  }),
  entry({
    slug: 'angular-signals',
    title: 'Angular signals in practice',
    summary: 'Signal inputs keep a content site explicit.',
    publishedAt: '2026-09-12T12:00:00.000Z',
    tags: ['angular', 'architecture'],
  }),
  entry({
    slug: 'dotnet-layers',
    title: 'Construyendo APIs por capas: .NET 10',
    summary: 'Four projects, one layer boundary.',
    publishedAt: '2026-11-02T12:00:00.000Z',
    tags: ['dotnet', 'arquitectura'],
  }),
  entry({
    slug: 'spring-layers',
    title: 'Construyendo APIs por capas: Spring Boot',
    summary: 'The same layers inside one Maven module.',
    publishedAt: '2026-11-03T12:00:00.000Z',
    tags: ['spring', 'arquitectura'],
  }),
  entry({
    slug: 'civic-terminal',
    title: 'Civic Terminal, built for reading',
    summary: 'A light canvas and a 70-character measure.',
    publishedAt: '2026-09-11T12:00:00.000Z',
    tags: ['design', 'typography'],
  }),
  entry({
    slug: 'older-note',
    title: 'Older note',
    summary: 'An earlier entry.',
    publishedAt: '2026-09-09T12:00:00.000Z',
    tags: ['notes'],
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

describe('ArticlesComponent', () => {
  let notifications: NotificationService;
  let watchPublished: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    watchPublished = vi.fn(() => of(articles));
    TestBed.configureTestingModule({
      imports: [ArticlesComponent],
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

  it('lists the newest articles first and paginates the catalog', async () => {
    const fixture = TestBed.createComponent(ArticlesComponent);
    await fixture.whenStable();

    expect(titles(fixture)).toEqual([
      'Construyendo APIs por capas: NestJS',
      'Construyendo APIs por capas: Spring Boot',
      'Construyendo APIs por capas: .NET 10',
      'Angular signals in practice',
      'Civic Terminal, built for reading',
      'Markdown as the source of truth',
    ]);
    expect(fixture.nativeElement.textContent).toContain('Showing 1–6 of 8 articles');

    buttonWithText(fixture.nativeElement, '.pager__step', 'Next').click();
    await fixture.whenStable();

    expect(titles(fixture)).toEqual(['Older note', 'Welcome to DevChronicle']);
    expect(fixture.nativeElement.textContent).toContain('Showing 7–8 of 8 articles');
  });

  it('filters dynamically by text and returns to the first page', async () => {
    const fixture = TestBed.createComponent(ArticlesComponent);
    await fixture.whenStable();

    buttonWithText(fixture.nativeElement, '.pager__step', 'Next').click();
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'modulo';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(titles(fixture)).toEqual(['Construyendo APIs por capas: NestJS']);

    input.value = 'signals';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(titles(fixture)).toEqual(['Angular signals in practice']);
    expect(fixture.nativeElement.textContent).toContain('Showing 1–1 of 1 article');
  });

  it('filters by tag and clears every active filter', async () => {
    const fixture = TestBed.createComponent(ArticlesComponent);
    await fixture.whenStable();

    buttonWithText(fixture.nativeElement, '.filter', 'architecture').click();
    await fixture.whenStable();

    expect(titles(fixture)).toEqual([
      'Angular signals in practice',
      'Markdown as the source of truth',
    ]);

    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'nothing matches this';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No articles match these filters.');

    buttonWithText(fixture.nativeElement, '.empty-state .btn', 'Clear filters').click();
    await fixture.whenStable();

    expect(titles(fixture).length).toBe(6);
    expect(fixture.nativeElement.textContent).toContain('Showing 1–6 of 8 articles');
  });

  it('reports a Firestore failure without a local fallback', async () => {
    watchPublished.mockReturnValue(
      throwError(() => new JournalError('offline', 'Firestore is unavailable.')),
    );
    const fixture = TestBed.createComponent(ArticlesComponent);
    await fixture.whenStable();

    expect(notifications.error).toHaveBeenCalledWith(
      'Unable to load the journal',
      'Firestore did not respond. Refresh the page to try again.',
    );
    expect(fixture.nativeElement.textContent).toContain('No entries are published yet.');
    expect(fixture.nativeElement.textContent).not.toContain('Older note');
  });
});
