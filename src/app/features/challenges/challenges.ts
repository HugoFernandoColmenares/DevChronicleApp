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
      title: 'Desafíos',
      description:
        'Ejercicios cortos de programación con enunciado, pista y una posible solución. Practica sin salir de DevChronicle.',
      path: '/challenges',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Desafíos',
        url: `${environment.siteUrl}/challenges`,
        description:
          'Ejercicios cortos de programación con enunciado, pista y una posible solución.',
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
        return 'Calentamiento';
      case 'practice':
        return 'Práctica';
      case 'stretch':
        return 'Reto';
      default:
        return difficulty;
    }
  }
}
