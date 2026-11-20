import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SeoService } from '@core/services/seo.service';
import { environment } from '@env';

import { CHALLENGES } from './challenges.data';

@Component({
  selector: 'dev-challenges',
  imports: [RouterLink],
  templateUrl: './challenges.html',
  styleUrl: './challenges.css',
})
export class ChallengesComponent {
  private readonly seo = inject(SeoService);

  readonly challenges = CHALLENGES;

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
