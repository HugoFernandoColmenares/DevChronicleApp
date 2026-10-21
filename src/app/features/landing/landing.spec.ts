import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { ArticleMetadata } from '@core/models/article.model';
import { ContentFetcherService } from '@core/services/content-fetcher.service';
import { NotificationService } from '@core/services/notification.service';

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
  let notifications: NotificationService;

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
    notifications = TestBed.inject(NotificationService);
    sessionStorage.clear();
    vi.spyOn(notifications, 'error').mockResolvedValue({ isConfirmed: true } as never);
    vi.spyOn(notifications, 'info').mockResolvedValue({ isConfirmed: true } as never);
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
    expect(notifications.error).not.toHaveBeenCalled();
    expect(notifications.info).not.toHaveBeenCalled();
  });

  it('reads the local index when the API is unreachable', async () => {
    const fixture = TestBed.createComponent(LandingComponent);
    await fixture.whenStable();

    http.expectOne('/api/v1/articles').error(new ProgressEvent('error'));
    http.expectOne('/content/index.json').flush(articles);
    await fixture.whenStable();

    const titles = [...fixture.nativeElement.querySelectorAll('.card__title')].map((node) =>
      (node as HTMLElement).textContent?.trim(),
    );
    expect(titles).toEqual(['Angular signals in practice', 'Older note']);
    expect(notifications.error).not.toHaveBeenCalled();
    expect(notifications.info).toHaveBeenCalledTimes(1);
    expect(notifications.info).toHaveBeenCalledWith(
      'API is offline',
      'Showing the local journal until the service responds again.',
    );

    const content = TestBed.inject(ContentFetcherService);
    content.getIndex().subscribe();
    http.expectOne('/api/v1/articles').error(new ProgressEvent('error'));
    http.expectOne('/content/index.json').flush(articles);
    await fixture.whenStable();
    expect(notifications.info).toHaveBeenCalledTimes(1);

    content.getIndex().subscribe();
    http.expectOne('/api/v1/articles').flush(articles);
    await fixture.whenStable();

    content.getIndex().subscribe();
    http.expectOne('/api/v1/articles').error(new ProgressEvent('error'));
    http.expectOne('/content/index.json').flush(articles);
    await fixture.whenStable();
    expect(notifications.info).toHaveBeenCalledTimes(2);
  });
});
