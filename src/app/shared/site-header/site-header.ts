import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { environment } from '@env';

@Component({
  selector: 'dev-site-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeaderComponent {
  readonly siteName = environment.siteName;
}
