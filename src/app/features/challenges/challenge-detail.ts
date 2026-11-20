import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { SeoService } from '@core/services/seo.service';
import { environment } from '@env';

import { challengeBySlug } from './challenges.data';

@Component({
  selector: 'dev-challenge-detail',
  imports: [RouterLink],
  templateUrl: './challenge-detail.html',
  styleUrl: './challenge-detail.css',
})
export class ChallengeDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  private readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug'))), {
    initialValue: this.route.snapshot.paramMap.get('slug'),
  });

  readonly challenge = computed(() => {
    const value = this.slug();
    return value ? (challengeBySlug(value) ?? null) : null;
  });

  readonly showHint = signal(false);
  readonly showSolution = signal(false);

  constructor() {
    effect(() => {
      this.slug();
      this.showHint.set(false);
      this.showSolution.set(false);
    });

    effect(() => {
      const item = this.challenge();
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

      this.seo.setPage({
        title: 'Challenge not found',
        description: 'That challenge is not in the catalog.',
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
