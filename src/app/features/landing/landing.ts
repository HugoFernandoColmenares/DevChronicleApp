import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, from, map, switchMap, tap } from 'rxjs';

import { ArticleMetadata } from '@core/models/article.model';
import { normalizeTag, normalizeTags } from '@core/models/tag-normalize';
import { READ_RETRY, retryTransient } from '@core/rxjs/retry-transient';
import { JournalService } from '@core/services/journal.service';
import { OfflineSnapshotService } from '@core/services/offline-snapshot.service';
import { SeoService } from '@core/services/seo.service';
import { ArticleCardComponent } from '@shared/article-card/article-card';
import { OfflineNoticeComponent } from '@shared/offline-notice/offline-notice';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader';
import { TagComponent } from '@shared/tag/tag';
import { environment } from '@env';

const TAG_PREVIEW = 8;

@Component({
  selector: 'dev-landing',
  imports: [
    ArticleCardComponent,
    OfflineNoticeComponent,
    RouterLink,
    SkeletonLoaderComponent,
    TagComponent,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class LandingComponent {
  private readonly journal = inject(JournalService);
  private readonly seo = inject(SeoService);
  private readonly snapshot = inject(OfflineSnapshotService);
  private readonly retryOptions = inject(READ_RETRY);
  private readonly attempt = signal(0);

  readonly siteName = environment.siteName;
  readonly selectedTag = signal<string | null>(null);
  readonly tagsExpanded = signal(false);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly offline = this.journal.offline;
  /** Fecha de la copia estática en uso; null cuando los datos vienen de Firestore o de su caché. */
  readonly copyGeneratedAt = signal<string | null>(null);
  readonly tagPreview = TAG_PREVIEW;

  readonly articles = toSignal(
    toObservable(this.attempt).pipe(
      tap(() => {
        this.loading.set(true);
        this.failed.set(false);
        this.copyGeneratedAt.set(null);
      }),
      switchMap(() =>
        this.journal.watchPublished().pipe(
          retryTransient(this.retryOptions),
          tap(() => {
            this.loading.set(false);
            this.failed.set(false);
            this.copyGeneratedAt.set(null);
          }),
          catchError(() =>
            // Firestore no respondió: se intenta la copia sin conexión, siempre señalada como tal.
            from(this.snapshot.list()).pipe(
              map((copy) => {
                this.loading.set(false);
                this.failed.set(true);
                this.copyGeneratedAt.set(copy?.generatedAt ?? null);
                return copy?.entries ?? ([] as ArticleMetadata[]);
              }),
            ),
          ),
        ),
      ),
    ),
    { initialValue: [] as ArticleMetadata[] },
  );

  /** Hay una caída: la lectura falló o el navegador perdió la conexión. */
  readonly outage = computed(() => this.failed() || this.offline());

  readonly tags = computed(() => {
    const all: string[] = [];
    for (const article of this.articles()) {
      all.push(...article.tags);
    }
    return normalizeTags(all);
  });

  readonly featured = computed(() => this.filtered()[0] ?? null);
  readonly recent = computed(() => this.filtered().slice(1, 4));
  readonly rest = computed(() => this.filtered().slice(4));
  readonly visibleTags = computed(() =>
    this.tagsExpanded() ? this.tags() : this.tags().slice(0, TAG_PREVIEW),
  );

  constructor() {
    this.seo.setPage({
      title: 'Notas de campo para software que funciona',
      description: environment.defaultDescription,
      path: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: environment.siteName,
        url: `${environment.siteUrl}/`,
        description: environment.defaultDescription,
        inLanguage: 'es',
        publisher: { '@type': 'Organization', name: environment.siteName },
      },
    });
  }

  selectTag(tag: string | null): void {
    this.selectedTag.set(this.selectedTag() === tag ? null : tag);
  }

  toggleTags(): void {
    this.tagsExpanded.update((value) => !value);
  }

  retry(): void {
    this.attempt.update((value) => value + 1);
  }

  private filtered(): ArticleMetadata[] {
    const tag = this.selectedTag();
    const items = this.sortByDate(this.articles());
    return tag
      ? items.filter((article) => article.tags.some((item) => normalizeTag(item) === tag))
      : items;
  }

  private sortByDate(items: ArticleMetadata[]): ArticleMetadata[] {
    return [...items].sort(
      (a, b) => Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt),
    );
  }
}
