import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SeoService } from '@core/services/seo.service';

@Component({
  selector: 'dev-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFoundComponent {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setPage({
      title: 'Page not found',
      description: 'The page you requested is not part of the DevChronicle journal.',
      path: '/404',
      noindex: true,
    });
  }
}
