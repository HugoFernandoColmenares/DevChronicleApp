import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GlobalErrorHandler } from './global-error.handler';

describe('GlobalErrorHandler', () => {
  it('logs unhandled errors with a route context', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), GlobalErrorHandler],
    });

    const handler = TestBed.inject(GlobalErrorHandler);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    handler.handleError(new Error('boom'));

    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0]?.[0])).toContain('[DevChronicle] Unhandled error');
    spy.mockRestore();
  });
});
