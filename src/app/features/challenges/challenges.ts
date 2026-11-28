import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { Challenge } from '@core/models/challenge.model';
import { JournalError } from '@core/models/journal-error';
import { ChallengeService } from '@core/services/challenge.service';
import { SeoService } from '@core/services/seo.service';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader';
import { environment } from '@env';

import { fallbackChallenges } from './challenges.fallback';

type ChallengeState =
  | { status: 'loading'; items: Challenge[] }
  | { status: 'ready'; items: Challenge[]; fallback?: boolean }
  | { status: 'error'; items: Challenge[] };

@Component({
  selector: 'dev-challenges',
  imports: [RouterLink, SkeletonLoaderComponent],
  templateUrl: './challenges.html',
  styleUrl: './challenges.css',
})
export class ChallengesComponent {
  private readonly service = inject(ChallengeService);
  private readonly seo = inject(SeoService);
  private readonly attempt = signal(0);

  readonly offline = this.service.offline;
  readonly state = toSignal(
    toObservable(this.attempt).pipe(
      switchMap(() =>
        this.service.watchPublished().pipe(
          map((items): ChallengeState => ({ status: 'ready', items })),
          catchError((error: unknown) => {
            if (error instanceof JournalError && error.code === 'offline') {
              return of<ChallengeState>({
                status: 'ready',
                items: fallbackChallenges(),
                fallback: true,
              });
            }
            return of<ChallengeState>({ status: 'error', items: [] });
          }),
          startWith<ChallengeState>({ status: 'loading', items: [] }),
        ),
      ),
    ),
    { initialValue: { status: 'loading', items: [] } as ChallengeState },
  );

  readonly usingFallback = computed(() => {
    const state = this.state();
    return state.status === 'ready' && state.fallback === true;
  });

  constructor() {
    this.seo.setPage({
      title: 'Challenges',
      description:
        'Short coding drills with a prompt, a starter hint, and one possible solution. Practice without leaving DevChronicle.',
      path: '/challenges',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Challenges',
        url: `${environment.siteUrl}/challenges`,
        description:
          'Short coding drills with a prompt, a starter hint, and one possible solution.',
        isPartOf: {
          '@type': 'WebSite',
          name: environment.siteName,
          url: `${environment.siteUrl}/`,
        },
      },
    });
  }

  retry(): void {
    this.attempt.update((value) => value + 1);
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
