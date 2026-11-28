/**
 * Reads only published documents through the public Firestore REST API. The build must keep
 * working without network access or credentials, so callers treat failures as "no remote rows".
 *
 * Env is read per call (not at import time) so `loadEnv()` can populate `.env` first.
 */
export async function listPublished(collectionId) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.DEVCHRONICLE_PROJECT_ID || 'devchronicle-hugo';
  const apiKey = process.env.FIREBASE_API_KEY || process.env.DEVCHRONICLE_WEB_API_KEY || '';
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const url = `${base}:runQuery${apiKey ? `?key=${apiKey}` : ''}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'published' },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Firestore ${collectionId} query failed with HTTP ${response.status}.`);
  }

  const rows = await response.json();
  return rows
    .filter((row) => row.document)
    .map((row) => ({
      ...fromFields(row.document.fields ?? {}),
      slug: row.document.fields?.slug?.stringValue || row.document.name.split('/').pop(),
    }));
}

function fromFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromValue(value)]));
}

function fromValue(value) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(fromValue);
  if ('mapValue' in value) return fromFields(value.mapValue.fields ?? {});
  return null;
}
