import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, tap } from 'rxjs';

import { ArticleMetadata } from '@core/models/article.model';
import { JournalService } from '@core/services/journal.service';
import { NotificationService } from '@core/services/notification.service';
import { ArticleCardComponent } from '@shared/article-card/article-card';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader';
import { TagComponent } from '@shared/tag/tag';

@Component({
  selector: 'dev-landing',
  imports: [ArticleCardComponent, RouterLink, SkeletonLoaderComponent, TagComponent],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class LandingComponent {
  private readonly journal = inject(JournalService);
  private readonly notifications = inject(NotificationService);

  readonly selectedTag = signal<string | null>(null);
  readonly loading = signal(true);

  readonly articles = toSignal(
    this.journal.watchPublished().pipe(
      tap(() => this.loading.set(false)),
      catchError(() => {
        this.loading.set(false);
        void this.notifications.error(
          'Unable to load the journal',
          'Firestore did not respond. Refresh the page to try again.',
        );
        return of([] as ArticleMetadata[]);
      }),
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

  selectTag(tag: string | null): void {
    this.selectedTag.set(this.selectedTag() === tag ? null : tag);
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
