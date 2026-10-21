import { Component } from '@angular/core';

import { environment } from '@env';

@Component({
  selector: 'dev-site-footer',
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
})
export class SiteFooterComponent {
  readonly siteName = environment.siteName;
  readonly year = new Date().getFullYear();
}
