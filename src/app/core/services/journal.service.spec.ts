import { isEmptyFromCache, isMissingFromCache } from './journal.service';

describe('detección de caídas de Firestore', () => {
  it('una lista vacía servida desde caché es una caída, no un diario vacío', () => {
    expect(isEmptyFromCache({ empty: true, metadata: { fromCache: true } })).toBe(true);
  });

  it('una lista vacía respondida por el servidor es un diario vacío real', () => {
    expect(isEmptyFromCache({ empty: true, metadata: { fromCache: false } })).toBe(false);
  });

  it('una lista con documentos nunca cuenta como caída', () => {
    expect(isEmptyFromCache({ empty: false, metadata: { fromCache: true } })).toBe(false);
  });

  it('un artículo ausente solo en caché es una caída; ausente en el servidor es un 404', () => {
    const missing = (fromCache: boolean) => ({ exists: () => false, metadata: { fromCache } });
    expect(isMissingFromCache(missing(true))).toBe(true);
    expect(isMissingFromCache(missing(false))).toBe(false);
    expect(isMissingFromCache({ exists: () => true, metadata: { fromCache: true } })).toBe(false);
  });
});
