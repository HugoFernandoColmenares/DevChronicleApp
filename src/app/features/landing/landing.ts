import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';

import { ArticleMetadata } from '@core/models/article.model';
import { READ_RETRY, retryTransient } from '@core/rxjs/retry-transient';
import { JournalService } from '@core/services/journal.service';
import { SeoService } from '@core/services/seo.service';
import { ArticleCardComponent } from '@shared/article-card/article-card';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader';
import { TagComponent } from '@shared/tag/tag';
import { environment } from '@env';

@Component({
  selector: 'dev-landing',
  imports: [ArticleCardComponent, RouterLink, SkeletonLoaderComponent, TagComponent],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class LandingComponent {
  private readonly journal = inject(JournalService);
  private readonly seo = inject(SeoService);
  private readonly retryOptions = inject(READ_RETRY);
  private readonly attempt = signal(0);

  readonly selectedTag = signal<string | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);

  readonly articles = toSignal(
    toObservable(this.attempt).pipe(
      tap(() => {
        this.loading.set(true);
        this.failed.set(false);
      }),
      switchMap(() =>
        this.journal.watchPublished().pipe(
          retryTransient(this.retryOptions),
          tap(() => {
            this.loading.set(false);
            this.failed.set(false);
          }),
          catchError(() => {
            this.loading.set(false);
            this.failed.set(true);
            return of([] as ArticleMetadata[]);
          }),
        ),
      ),
    ),
    { initialValue: [] as ArticleMetadata[] },
  );

  readonly tags = computed(() => {
    const unique = new Set<string>();
    for (const article of this.articles()) {
      for (const tag of article.tags) {
        unique.add(tag);
      }
    }
    return [...unique].sort((a, b) => a.localeCompare(b));
  });

  readonly featured = computed(() => this.filtered()[0] ?? null);
  readonly recent = computed(() => this.filtered().slice(1, 4));
  readonly rest = computed(() => this.filtered().slice(4));

  constructor() {
    this.seo.setPage({
      title: 'Field notes for working software',
      description: environment.defaultDescription,
      path: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: environment.siteName,
        url: `${environment.siteUrl}/`,
        description: environment.defaultDescription,
        inLanguage: 'en',
        publisher: { '@type': 'Organization', name: environment.siteName },
      },
    });
  }

  selectTag(tag: string | null): void {
    this.selectedTag.set(this.selectedTag() === tag ? null : tag);
  }

  retry(): void {
    this.attempt.update((value) => value + 1);
  }

  private filtered(): ArticleMetadata[] {
    const tag = this.selectedTag();
    const items = this.sortByDate(this.articles());
    return tag ? items.filter((article) => article.tags.includes(tag)) : items;
  }

  private sortByDate(items: ArticleMetadata[]): ArticleMetadata[] {
    return [...items].sort(
      (a, b) => Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt),
    );
  }
}
