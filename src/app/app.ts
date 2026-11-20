import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { FocusService } from '@core/services/focus.service';
import { SeoService } from '@core/services/seo.service';
import { SiteFooterComponent } from '@shared/site-footer/site-footer';
import { SiteHeaderComponent } from '@shared/site-header/site-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly focus = inject(FocusService);

  constructor() {
    void this.focus;
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        if (event.urlAfterRedirects.startsWith('/admin')) {
          this.seo.setPrivate();
        }
      });
  }
}
