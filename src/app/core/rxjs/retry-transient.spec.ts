import { defer, firstValueFrom, of, throwError } from 'rxjs';

import { JournalError } from '@core/models/journal-error';

import { retryTransient } from './retry-transient';

describe('retryTransient', () => {
  it('retries a transient failure and keeps the successful value', async () => {
    const source = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new JournalError('offline', 'down')))
      .mockReturnValueOnce(of('ready'));

    const result = await firstValueFrom(
      defer(() => source()).pipe(retryTransient({ attempts: 2, baseDelayMs: 1 })),
    );

    expect(result).toBe('ready');
    expect(source).toHaveBeenCalledTimes(2);
  });

  it('gives up after the configured attempts', async () => {
    const source = vi.fn(() => throwError(() => new JournalError('offline', 'down')));

    await expect(
      firstValueFrom(defer(() => source()).pipe(retryTransient({ attempts: 2, baseDelayMs: 1 }))),
    ).rejects.toThrow('down');
    expect(source).toHaveBeenCalledTimes(3);
  });

  it('does not retry permanent errors', async () => {
    const source = vi.fn(() => throwError(() => new JournalError('invalid', 'bad request')));

    await expect(
      firstValueFrom(defer(() => source()).pipe(retryTransient({ attempts: 2, baseDelayMs: 1 }))),
    ).rejects.toThrow('bad request');
    expect(source).toHaveBeenCalledTimes(1);
  });

  it('does not retry when attempts is zero', async () => {
    const source = vi.fn(() => throwError(() => new JournalError('offline', 'down')));

    await expect(
      firstValueFrom(defer(() => source()).pipe(retryTransient({ attempts: 0, baseDelayMs: 1 }))),
    ).rejects.toThrow('down');
    expect(source).toHaveBeenCalledTimes(1);
  });
});
