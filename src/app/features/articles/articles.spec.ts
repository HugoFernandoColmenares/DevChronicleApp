import { signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ArticleMetadata } from '@core/models/article.model';
import { JournalError } from '@core/models/journal-error';
import { READ_RETRY } from '@core/rxjs/retry-transient';
import { JournalService } from '@core/services/journal.service';

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
    summary: 'El mismo módulo Spring Boot con capas y JDBC.',
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

function search(root: HTMLElement, value: string): void {
  const input = root.querySelector('input[type="search"]') as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('ArticlesComponent', () => {
  let watchPublished: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    watchPublished = vi.fn(() => of(articles));
    TestBed.configureTestingModule({
      imports: [ArticlesComponent],
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

    search(fixture.nativeElement, 'modulo');
    await fixture.whenStable();

    expect(titles(fixture)).toEqual([
      'Construyendo APIs por capas: NestJS',
      'Construyendo APIs por capas: Spring Boot',
    ]);

    search(fixture.nativeElement, 'signals');
    await fixture.whenStable();

    expect(titles(fixture)).toEqual(['Angular signals in practice']);
    expect(fixture.nativeElement.textContent).toContain('Showing 1–1 of 1 article');
  });

  it('folds accents and case when searching tags and summaries', async () => {
    const fixture = TestBed.createComponent(ArticlesComponent);
    await fixture.whenStable();

    search(fixture.nativeElement, 'MÓDULO');
    await fixture.whenStable();

    expect(titles(fixture)).toEqual([
      'Construyendo APIs por capas: NestJS',
      'Construyendo APIs por capas: Spring Boot',
    ]);

    search(fixture.nativeElement, 'ARQUITECTURA');
    await fixture.whenStable();

    expect(titles(fixture)).toEqual([
      'Construyendo APIs por capas: NestJS',
      'Construyendo APIs por capas: Spring Boot',
      'Construyendo APIs por capas: .NET 10',
    ]);
  });

  it('filters by tag, resets pagination, and clears every active filter', async () => {
    const fixture = TestBed.createComponent(ArticlesComponent);
    await fixture.whenStable();

    buttonWithText(fixture.nativeElement, '.pager__step', 'Next').click();
    await fixture.whenStable();

    buttonWithText(fixture.nativeElement, '.filter', 'arquitectura').click();
    await fixture.whenStable();

    expect(titles(fixture)).toEqual([
      'Construyendo APIs por capas: NestJS',
      'Construyendo APIs por capas: Spring Boot',
      'Construyendo APIs por capas: .NET 10',
    ]);
    expect(fixture.nativeElement.textContent).toContain('Showing 1–3 of 3 articles');

    search(fixture.nativeElement, 'nothing matches this');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No articles match these filters.');

    buttonWithText(fixture.nativeElement, '.empty-state .btn', 'Clear filters').click();
    await fixture.whenStable();

    expect(titles(fixture).length).toBe(6);
    expect(fixture.nativeElement.textContent).toContain('Showing 1–6 of 8 articles');
  });

  it('deduplicates tags shared by several entries', async () => {
    const fixture = TestBed.createComponent(ArticlesComponent);
    await fixture.whenStable();

    const filters = [...fixture.nativeElement.querySelectorAll('.filter')] as HTMLElement[];
    const architecture = filters.filter((node) => node.textContent?.trim() === 'arquitectura');

    expect(architecture).toHaveLength(1);
    expect(filters).toHaveLength(12);
  });

  it('falls back to updatedAt when an entry has no publish date', async () => {
    watchPublished.mockReturnValue(
      of([
        entry({
          slug: 'draft-date',
          title: 'Undated note',
          publishedAt: null,
          updatedAt: '2026-11-05T12:00:00.000Z',
        }),
        entry({
          slug: 'dated-note',
          title: 'Dated note',
          publishedAt: '2026-11-04T12:00:00.000Z',
          updatedAt: '2026-11-04T12:00:00.000Z',
        }),
      ]),
    );

    const fixture = TestBed.createComponent(ArticlesComponent);
    await fixture.whenStable();

    expect(titles(fixture)).toEqual(['Undated note', 'Dated note']);
  });

  it('keeps the page window inside the catalog bounds', async () => {
    const many = Array.from({ length: 61 }, (_, index) =>
      entry({
        slug: `entry-${index}`,
        title: `Entry ${index}`,
        publishedAt: new Date(Date.UTC(2026, 0, 1, 12, 0, 0) - index * 86_400_000).toISOString(),
      }),
    );
    watchPublished.mockReturnValue(of(many));

    const fixture = TestBed.createComponent(ArticlesComponent);
    await fixture.whenStable();
    fixture.componentInstance.goTo(8);
    await fixture.whenStable();

    const pageButtons = [...fixture.nativeElement.querySelectorAll('.pager__page')].map((node) =>
      (node as HTMLElement).textContent?.trim(),
    );
    expect(pageButtons).toEqual(['6', '7', '8', '9', '10']);
    expect(fixture.nativeElement.textContent).toContain('Showing 43–48 of 61 articles');

    fixture.componentInstance.goTo(99);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Showing 61–61 of 61 articles');
  });

  it('offers a manual retry after a Firestore failure without a local fallback', async () => {
    watchPublished.mockReturnValueOnce(
      throwError(() => new JournalError('offline', 'Firestore is unavailable.')),
    );
    const fixture = TestBed.createComponent(ArticlesComponent);
    await fixture.whenStable();

    const view = fixture.nativeElement as HTMLElement;
    expect(view.textContent).toContain('The journal could not be loaded.');
    expect(view.textContent).not.toContain('Older note');

    buttonWithText(view, '.empty-state .btn', 'Try again').click();
    await fixture.whenStable();

    expect(titles(fixture)).toEqual([
      'Construyendo APIs por capas: NestJS',
      'Construyendo APIs por capas: Spring Boot',
      'Construyendo APIs por capas: .NET 10',
      'Angular signals in practice',
      'Civic Terminal, built for reading',
      'Markdown as the source of truth',
    ]);
    expect(view.textContent).toContain('Showing 1–6 of 8 articles');
  });
});
