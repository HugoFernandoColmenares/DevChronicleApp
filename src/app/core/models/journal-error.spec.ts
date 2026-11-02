import { JournalError, journalErrorFromUnknown } from './journal-error';

describe('journalErrorFromUnknown', () => {
  it('hides drafts from the public as not found', () => {
    const error = journalErrorFromUnknown({ code: 'permission-denied' }, 'public');
    expect(error).toBeInstanceOf(JournalError);
    expect(error.code).toBe('not-found');
  });

  it('tells an author when rules deny a write', () => {
    expect(journalErrorFromUnknown({ code: 'firestore/permission-denied' }, 'admin').code).toBe(
      'denied',
    );
  });

  it('marks transport failures as offline', () => {
    expect(journalErrorFromUnknown({ code: 'unavailable' }, 'public').code).toBe('offline');
  });
});
