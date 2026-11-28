import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { Challenge } from '@core/models/challenge.model';
import { JournalError } from '@core/models/journal-error';
import { ChallengeService } from '@core/services/challenge.service';
import { SeoService } from '@core/services/seo.service';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader';
import { environment } from '@env';

import { fallbackChallengeBySlug } from './challenges.fallback';

interface ChallengeResult {
  status: 'loading' | 'ready' | 'missing' | 'error';
  item: Challenge | null;
}

@Component({
  selector: 'dev-challenge-detail',
  imports: [RouterLink, SkeletonLoaderComponent],
  templateUrl: './challenge-detail.html',
  styleUrl: './challenge-detail.css',
})
export class ChallengeDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ChallengeService);
  private readonly seo = inject(SeoService);

  private readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug'))), {
    initialValue: this.route.snapshot.paramMap.get('slug'),
  });

  readonly result = toSignal(
    toObservable(this.slug).pipe(
      switchMap((slug) =>
        slug
          ? this.service.watchOne(slug).pipe(
              map((item): ChallengeResult => ({ status: 'ready', item })),
              catchError((error: unknown) => {
                if (error instanceof JournalError && error.code === 'offline') {
                  const fallback = fallbackChallengeBySlug(slug);
                  return of<ChallengeResult>(
                    fallback
                      ? { status: 'ready', item: fallback }
                      : { status: 'error', item: null },
                  );
                }
                return of<ChallengeResult>({
                  status:
                    error instanceof JournalError && error.code === 'not-found'
                      ? 'missing'
                      : 'error',
                  item: null,
                });
              }),
              startWith<ChallengeResult>({ status: 'loading', item: null }),
            )
          : of<ChallengeResult>({ status: 'missing', item: null }),
      ),
    ),
    { initialValue: { status: 'loading', item: null } as ChallengeResult },
  );

  readonly challenge = computed(() => this.result().item);

  readonly showHint = signal(false);
  readonly showSolution = signal(false);

  constructor() {
    effect(() => {
      this.slug();
      this.showHint.set(false);
      this.showSolution.set(false);
    });

    effect(() => {
      const result = this.result();
      const item = result.item;

      if (item) {
        this.seo.setPage({
          title: item.title,
          description: item.summary,
          path: `/challenges/${item.slug}`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'LearningResource',
            name: item.title,
            description: item.summary,
            url: `${environment.siteUrl}/challenges/${item.slug}`,
            learningResourceType: 'Challenge',
            inLanguage: 'es',
            isPartOf: {
              '@type': 'WebSite',
              name: environment.siteName,
              url: `${environment.siteUrl}/`,
            },
          },
        });
        return;
      }

      if (result.status === 'loading') {
        return;
      }

      this.seo.setPage({
        title: result.status === 'missing' ? 'Challenge not found' : 'Challenge unavailable',
        description:
          result.status === 'missing'
            ? 'That challenge is not in the catalog.'
            : 'The challenge could not be loaded.',
        path: '/challenges',
        noindex: true,
      });
    });
  }

  toggleHint(): void {
    this.showHint.update((value) => !value);
  }

  toggleSolution(): void {
    this.showSolution.update((value) => !value);
  }

  labelFor(difficulty: string): string {
    switch (difficulty) {
      case 'warmup':
        return 'Warm-up';
      case 'practice':
        return 'Practice';
      case 'stretch':
        return 'Stretch';
      default:
        return difficulty;
    }
  }
}
