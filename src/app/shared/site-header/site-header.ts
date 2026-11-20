import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { environment } from '@env';
import { ServiceStatusComponent } from '@shared/service-status/service-status';

@Component({
  selector: 'dev-site-header',
  imports: [RouterLink, RouterLinkActive, ServiceStatusComponent],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeaderComponent {
  private readonly auth = inject(AuthService);

  readonly siteName = environment.siteName;
  readonly isAdmin = this.auth.isAdmin;
}
