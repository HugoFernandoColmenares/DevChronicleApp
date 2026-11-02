import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { ArticleMetadata } from '@core/models/article.model';
import { JournalService } from '@core/services/journal.service';
import { NotificationService } from '@core/services/notification.service';
import { StudioBarComponent } from './studio-bar';

@Component({
  selector: 'dev-admin-list',
  imports: [DatePipe, RouterLink, StudioBarComponent],
  templateUrl: './admin-list.html',
})
export class AdminListComponent {
  private readonly journal = inject(JournalService);
  private readonly notifications = inject(NotificationService);

  readonly entries = signal<ArticleMetadata[]>([]);
  readonly loading = signal(true);

  constructor() {
    this.journal
      .watchAll()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (entries) => {
          this.entries.set(entries);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          void this.notifications.error(
            'Unable to load the studio',
            'Firestore did not return the entries. Confirm this account is in admins.',
          );
        },
      });
  }
}
