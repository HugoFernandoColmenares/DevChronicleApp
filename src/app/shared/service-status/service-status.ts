import { Component, inject } from '@angular/core';

import { ContentFetcherService } from '@core/services/content-fetcher.service';

@Component({
  selector: 'dev-service-status',
  templateUrl: './service-status.html',
  styleUrl: './service-status.css',
})
export class ServiceStatusComponent {
  private readonly content = inject(ContentFetcherService);

  readonly offline = this.content.apiOffline;
}
