import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'dev-studio-bar',
  imports: [RouterLink],
  templateUrl: './studio-bar.html',
})
export class StudioBarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly heading = input('Studio');
  readonly showNew = input(false);
  readonly user = this.auth.user;

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}
