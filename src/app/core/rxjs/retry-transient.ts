import { InjectionToken } from '@angular/core';
import { MonoTypeOperatorFunction, retry, throwError, timer } from 'rxjs';

import { JournalError } from '@core/models/journal-error';

export interface ReadRetryOptions {
  /** Automatic retries before surfacing the error. Manual retries stay available. */
  attempts: number;
  /** First backoff step; each retry doubles it. */
  baseDelayMs: number;
}

export const READ_RETRY = new InjectionToken<ReadRetryOptions>('READ_RETRY', {
  providedIn: 'root',
  factory: () => ({ attempts: 2, baseDelayMs: 400 }),
});

/**
 * Retries only transient Firestore failures. Permission, validation and not-found errors are
 * permanent, so retrying them would only delay the error state.
 */
export function retryTransient<T>(options: ReadRetryOptions): MonoTypeOperatorFunction<T> {
  return retry({
    count: options.attempts,
    delay: (error, retryCount) =>
      isTransient(error)
        ? timer(options.baseDelayMs * 2 ** (retryCount - 1))
        : throwError(() => error),
  });
}

export function isTransient(error: unknown): boolean {
  return error instanceof JournalError && error.code === 'offline';
}
