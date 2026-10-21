import { Component, inject, input, signal } from '@angular/core';

import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'dev-copy-button',
  templateUrl: './copy-button.html',
  styleUrl: './copy-button.css',
})
export class CopyButtonComponent {
  private readonly notifications = inject(NotificationService);

  readonly value = input.required<string>();
  readonly copied = signal(false);

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.value());
      this.copied.set(true);
      await this.notifications.toast('Copied to clipboard');
      window.setTimeout(() => this.copied.set(false), 1600);
    } catch {
      await this.notifications.error(
        'Copy failed',
        'The browser blocked access to the clipboard.',
      );
    }
  }
}
