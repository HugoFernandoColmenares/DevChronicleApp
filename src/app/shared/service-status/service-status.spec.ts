import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ContentFetcherService } from '@core/services/content-fetcher.service';

import { ServiceStatusComponent } from './service-status';

describe('ServiceStatusComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ServiceStatusComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
    });
  });

  it('stays hidden while the API has not failed', async () => {
    const fixture = TestBed.createComponent(ServiceStatusComponent);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.medal')).toBeNull();
  });

  it('shows the medal only while the API is offline', async () => {
    const fixture = TestBed.createComponent(ServiceStatusComponent);
    const content = TestBed.inject(ContentFetcherService);

    content.apiOffline.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.medal')?.textContent).toContain('API offline');

    content.apiOffline.set(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.medal')).toBeNull();
  });
});
