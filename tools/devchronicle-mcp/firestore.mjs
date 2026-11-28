import { idToken } from './auth.mjs';

const PROJECT = process.env.DEVCHRONICLE_PROJECT_ID || 'devchronicle-hugo';
const HOST = process.env.DEVCHRONICLE_FIRESTORE_EMULATOR
  ? `http://${process.env.DEVCHRONICLE_FIRESTORE_EMULATOR}/v1`
  : 'https://firestore.googleapis.com/v1';
export const ROOT = `projects/${PROJECT}/databases/(default)/documents`;

async function call(path, init = {}) {
  const response = await fetch(`${HOST}/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await idToken()}`,
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const status = body?.error?.status ?? response.status;
    const map = {
      PERMISSION_DENIED:
        'Las reglas de Firestore rechazaron la escritura (campo inválido, rol sin permiso o modo solo borradores).',
      FAILED_PRECONDITION:
        'Conflicto: el documento cambió (o ya existe). Vuelve a leerlo con get_* y reintenta.',
      ALREADY_EXISTS: 'Ya existe un documento con ese slug.',
      NOT_FOUND: 'No existe.',
    };
    throw new Error(map[status] ?? `Firestore respondió ${status}`);
  }
  return body;
}

export const getDoc = (path) => call(`${ROOT}/${path}`);
export const commit = (writes) =>
  call(`${ROOT}:commit`, { method: 'POST', body: JSON.stringify({ writes }) });
export const runQuery = (structuredQuery) =>
  call(`${ROOT}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery }) });

// Conversión JS <-> valores de Firestore
export function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  return { stringValue: String(value) };
}

export const toFields = (object) =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [key, toValue(value)]));

export function fromValue(value) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(fromValue);
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [key, fromValue(item)]),
    );
  }
  return null;
}

export const fromDoc = (document) => ({
  ...Object.fromEntries(
    Object.entries(document.fields ?? {}).map(([key, value]) => [key, fromValue(value)]),
  ),
  updateTime: document.updateTime,
});

export const write = (path, data, precondition) => ({
  update: { name: `${ROOT}/${path}`, fields: toFields(data) },
  ...(precondition ? { currentDocument: precondition } : {}),
});
