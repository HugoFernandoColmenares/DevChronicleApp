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

const PAGE_SIZE = 6;

@Component({
  selector: 'dev-articles',
  imports: [ArticleCardComponent, RouterLink, SkeletonLoaderComponent, TagComponent],
  templateUrl: './articles.html',
  styleUrl: './articles.css',
})
export class ArticlesComponent {
  private readonly journal = inject(JournalService);
  private readonly seo = inject(SeoService);
  private readonly retryOptions = inject(READ_RETRY);
  private readonly attempt = signal(0);

  readonly search = signal('');
  readonly selectedTag = signal<string | null>(null);
  readonly page = signal(1);
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

  readonly filtered = computed(() => {
    const term = fold(this.search().trim());
    const tag = this.selectedTag();

    return this.sortByDate(this.articles())
      .filter((article) => !tag || article.tags.includes(tag))
      .filter((article) => !term || this.searchText(article).includes(term));
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));

  readonly pageItems = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  readonly rangeStart = computed(() =>
    this.filtered().length === 0 ? 0 : (this.currentPage() - 1) * PAGE_SIZE + 1,
  );

  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * PAGE_SIZE, this.filtered().length),
  );

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 5) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const start = Math.max(1, Math.min(current - 2, total - 4));
    return Array.from({ length: 5 }, (_, index) => start + index);
  });

  constructor() {
    this.seo.setPage({
      title: 'Articles',
      description:
        'Every DevChronicle entry, newest first. Search by title, summary, author, or series, and narrow the archive by tag.',
      path: '/articles',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Articles',
        url: `${environment.siteUrl}/articles`,
        description:
          'Every DevChronicle entry, newest first. Search by title, summary, author, or series, and narrow the archive by tag.',
        isPartOf: {
          '@type': 'WebSite',
          name: environment.siteName,
          url: `${environment.siteUrl}/`,
        },
      },
    });
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.search.set(target.value);
    this.page.set(1);
  }

  clearSearch(): void {
    this.search.set('');
    this.page.set(1);
  }

  selectTag(tag: string | null): void {
    this.selectedTag.set(this.selectedTag() === tag ? null : tag);
    this.page.set(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.selectedTag.set(null);
    this.page.set(1);
  }

  retry(): void {
    this.attempt.update((value) => value + 1);
  }

  goTo(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  previous(): void {
    this.goTo(this.currentPage() - 1);
  }

  next(): void {
    this.goTo(this.currentPage() + 1);
  }

  private searchText(article: ArticleMetadata): string {
    return fold(
      [
        article.title,
        article.summary,
        article.author,
        article.category,
        article.series,
        ...article.tags,
      ].join(' '),
    );
  }

  private sortByDate(items: ArticleMetadata[]): ArticleMetadata[] {
    return [...items].sort(
      (a, b) => Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt),
    );
  }
}

function fold(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
