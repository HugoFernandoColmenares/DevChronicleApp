import { Component, inject, input, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'dev-studio-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './studio-bar.html',
})
export class StudioBarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly heading = input('Studio');
  readonly showNew = input(false);
  readonly showExport = input(false);
  readonly exporting = input(false);
  readonly newLink = input('/admin/new');
  readonly newLabel = input('New entry');
  readonly exportRequested = output<void>();
  readonly user = this.auth.user;

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}
