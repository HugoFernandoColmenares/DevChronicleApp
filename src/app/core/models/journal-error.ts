export type JournalErrorCode =
  'not-found' | 'invalid-slug' | 'conflict' | 'invalid' | 'offline' | 'denied';

export class JournalError extends Error {
  readonly code: JournalErrorCode;

  constructor(code: JournalErrorCode, message: string) {
    super(message);
    this.name = 'JournalError';
    this.code = code;
  }
}

export function journalErrorFromUnknown(
  error: unknown,
  audience: 'public' | 'admin',
): JournalError {
  if (error instanceof JournalError) {
    return error;
  }

  const code = firebaseCode(error);

  if (code === 'permission-denied') {
    return audience === 'public'
      ? new JournalError('not-found', 'Article not found')
      : new JournalError('denied', 'This account cannot change the journal.');
  }

  if (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'cancelled' ||
    code === 'failed-precondition'
  ) {
    return new JournalError('offline', 'Firestore is unavailable.');
  }

  return new JournalError('invalid', 'The journal request failed.');
}

function firebaseCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    const slash = code.lastIndexOf('/');
    return slash >= 0 ? code.slice(slash + 1) : code;
  }

  return 'unknown';
}
