import { signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { JournalService } from '@core/services/journal.service';
import { NotificationService } from '@core/services/notification.service';

import { AdminEditorComponent } from './admin-editor';

describe('AdminEditorComponent', () => {
  const journal = {
    offline: signal(false),
    loadEntry: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn(),
  };

  beforeEach(() => {
    journal.save.mockClear();
    TestBed.configureTestingModule({
      imports: [AdminEditorComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: JournalService, useValue: journal },
        { provide: AuthService, useValue: { user: signal(null), signOut: vi.fn() } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({})) } },
      ],
    });
    const notifications = TestBed.inject(NotificationService);
    vi.spyOn(notifications, 'toast').mockResolvedValue({ isConfirmed: true } as never);
    vi.spyOn(notifications, 'error').mockResolvedValue({ isConfirmed: true } as never);
  });

  it('previews markdown and publishes a new entry', async () => {
    const fixture = TestBed.createComponent(AdminEditorComponent);
    await fixture.whenStable();

    fixture.componentInstance.form.setValue({
      title: 'Field note',
      slug: 'field-note',
      summary: 'A note from the studio.',
      category: 'journal',
      series: 'Notes',
      author: 'Hugo Colmenares',
      tags: 'angular, journal',
      publishedOn: '2026-09-12',
      markdown: '## From the editor\n\nPreview this paragraph.',
    });
    await fixture.whenStable();

    const view = fixture.nativeElement as HTMLElement;
    expect(view.querySelector('.preview__title')?.textContent).toContain('Field note');
    expect(view.querySelector('.markdown-body h2')?.textContent).toContain('From the editor');

    await fixture.componentInstance.save('published');

    expect(journal.save).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'field-note',
        status: 'published',
        tags: ['angular', 'journal'],
        markdown: '## From the editor\n\nPreview this paragraph.',
      }),
      { create: true },
    );
  });
});
