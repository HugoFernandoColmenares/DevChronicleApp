import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { environment } from '@env';
import { ServiceStatusComponent } from '@shared/service-status/service-status';

@Component({
  selector: 'dev-site-header',
  imports: [RouterLink, RouterLinkActive, ServiceStatusComponent],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeaderComponent {
  readonly siteName = environment.siteName;
}
