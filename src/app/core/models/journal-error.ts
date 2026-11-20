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
      ? new JournalError('not-found', 'Artículo no encontrado')
      : new JournalError('denied', 'Esta cuenta no puede modificar el diario.');
  }

  if (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'cancelled' ||
    code === 'failed-precondition'
  ) {
    return new JournalError('offline', 'Firestore no está disponible.');
  }

  return new JournalError('invalid', 'La solicitud al diario falló.');
}

function firebaseCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    const slash = code.lastIndexOf('/');
    return slash >= 0 ? code.slice(slash + 1) : code;
  }

  return 'unknown';
}
