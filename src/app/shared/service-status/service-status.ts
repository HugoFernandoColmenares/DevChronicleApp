import { Component, inject } from '@angular/core';

import { JournalService } from '@core/services/journal.service';

@Component({
  selector: 'dev-service-status',
  templateUrl: './service-status.html',
  styleUrl: './service-status.css',
})
export class ServiceStatusComponent {
  private readonly journal = inject(JournalService);

  readonly offline = this.journal.offline;
}
