import { Timestamp } from 'firebase/firestore';

/** Converts a Firestore timestamp (or an ISO string) into an ISO string. */
export function timestampToIso(value: unknown): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return (value.toDate as () => Date)().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}
