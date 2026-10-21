import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { ArticleMetadata } from '@core/models/article.model';

import { LandingComponent } from './landing';

const articles: ArticleMetadata[] = [
  {
    slug: 'older-note',
    title: 'Older note',
    author: 'Hugo Colmenares',
    date: '2026-01-02',
    tags: ['notes'],
    excerpt: 'An earlier entry.',
  },
  {
    slug: 'angular-signals-in-practice',
    title: 'Angular signals in practice',
    author: 'Hugo Colmenares',
    date: '2026-09-10',
    tags: ['angular'],
    excerpt: 'How signal inputs keep a content site explicit.',
  },
];

describe('LandingComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('paints cards from /api/v1/articles', async () => {
    const fixture = TestBed.createComponent(LandingComponent);
    await fixture.whenStable();

    const request = http.expectOne('/api/v1/articles');
    expect(request.request.method).toBe('GET');
    request.flush(articles);
    await fixture.whenStable();

    const titles = [...fixture.nativeElement.querySelectorAll('.card__title')].map((node) =>
      (node as HTMLElement).textContent?.trim(),
    );
    expect(titles).toEqual(['Angular signals in practice', 'Older note']);
  });
});
