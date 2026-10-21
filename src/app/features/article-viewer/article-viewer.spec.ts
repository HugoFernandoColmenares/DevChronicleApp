import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';

import { ArticleViewerComponent } from './article-viewer';

describe('ArticleViewerComponent', () => {
  let http: HttpTestingController;
  let notifications: NotificationService;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ slug: 'pending' }));
    TestBed.configureTestingModule({
      imports: [ArticleViewerComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
    vi.spyOn(notifications, 'error').mockResolvedValue({ isConfirmed: true } as never);
  });

  afterEach(() => {
    http.verify();
  });

  async function open(slug: string): Promise<ComponentFixture<ArticleViewerComponent>> {
    params.next(convertToParamMap({ slug }));
    const fixture = TestBed.createComponent(ArticleViewerComponent);
    await fixture.whenStable();
    return fixture;
  }

  it('compiles markdown from the API without frontmatter', async () => {
    const fixture = await open('angular-signals-in-practice');

    http.expectOne('/api/v1/articles/angular-signals-in-practice').flush({
      metadata: {
        slug: 'angular-signals-in-practice',
        title: 'Angular signals in practice',
        author: 'Hugo Colmenares',
        date: '2026-09-10',
        tags: ['angular'],
        excerpt: 'Signal inputs.',
      },
      markdown: '## Inputs without decorators\n\nThe body has no frontmatter.',
    });
    await fixture.whenStable();

    const view = fixture.nativeElement as HTMLElement;
    expect(view.querySelector('h1')?.textContent).toContain('Angular signals in practice');
    expect(view.querySelector('.markdown-body h2')?.textContent).toContain(
      'Inputs without decorators',
    );
    expect(view.textContent).not.toContain('excerpt:');
  });

  it('reports a 404 through NotificationService', async () => {
    const fixture = await open('missing-entry');

    http.expectOne('/api/v1/articles/missing-entry').flush(
      { error: 'article_not_found' },
      { status: 404, statusText: 'Not Found' },
    );
    await fixture.whenStable();

    expect(notifications.error).toHaveBeenCalledWith(
      'Article not found',
      'This entry is missing or the link is invalid.',
    );
    expect((fixture.nativeElement as HTMLElement).querySelector('.empty')?.textContent).toContain(
      'could not be opened',
    );
  });
});
