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
  readonly exporting = signal(false);

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
            'No se pudo cargar el Estudio',
            'Firestore no devolvió las entradas. Confirma que esta cuenta esté en admins.',
          );
        },
      });
  }

  async exportBackup(): Promise<void> {
    this.exporting.set(true);
    try {
      const pack = await this.journal.exportAll();
      const stamp = new Date().toISOString().slice(0, 10);
      const payload = {
        exportedAt: new Date().toISOString(),
        site: 'DevChronicle',
        entries: pack,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `devchronicle-export-${stamp}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      void this.notifications.toast(
        `${pack.length} ${pack.length === 1 ? 'entrada exportada' : 'entradas exportadas'}`,
      );
    } catch {
      void this.notifications.error(
        'No se pudo exportar',
        'Firestore no devolvió una copia completa. Vuelve a intentarlo con conexión.',
      );
    } finally {
      this.exporting.set(false);
    }
  }
}
