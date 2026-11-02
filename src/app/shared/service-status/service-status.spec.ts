import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { JournalService } from '@core/services/journal.service';

import { ServiceStatusComponent } from './service-status';

describe('ServiceStatusComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ServiceStatusComponent],
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('stays hidden while Firestore has not failed', async () => {
    const fixture = TestBed.createComponent(ServiceStatusComponent);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.medal')).toBeNull();
  });

  it('shows the medal only while the journal is offline', async () => {
    const fixture = TestBed.createComponent(ServiceStatusComponent);
    const journal = TestBed.inject(JournalService);

    journal.offline.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.medal')?.textContent).toContain('Journal offline');

    journal.offline.set(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.medal')).toBeNull();
  });
});
