import { EntryDraft, EntryStatus } from '@core/models/article.model';
import { JournalError } from '@core/models/journal-error';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TAG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MARKDOWN_MAX_CHARS = 200_000;
export const MARKDOWN_MAX_BYTES = 900_000;

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function readingTimeMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) {
    return 1;
  }
  return Math.max(1, Math.round(words / 200));
}

export function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);
}

export function joinTags(tags: string[]): string {
  return tags.join(', ');
}

export function dateInputToDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return new Date(`${value}T12:00:00.000Z`);
}

export function dateToInput(iso: string | null): string {
  if (!iso) {
    return new Date().toISOString().slice(0, 10);
  }
  return iso.slice(0, 10);
}

export function normalizeDraft(draft: EntryDraft): EntryDraft {
  const slug = draft.slug.trim();
  const title = draft.title.trim();
  const summary = draft.summary.trim();
  const category = draft.category.trim().replace(/\s+/g, ' ');
  const series = draft.series.trim().replace(/\s+/g, ' ');
  const author = draft.author.trim();
  const markdown = draft.markdown.replace(/^\uFEFF/, '');
  const tags = draft.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  const status: EntryStatus = draft.status === 'draft' ? 'draft' : 'published';

  if (!SLUG_PATTERN.test(slug)) {
    throw new JournalError('invalid-slug', 'Usa un slug en minúsculas con guiones.');
  }
  if (!title || title.length >= 180) {
    throw new JournalError('invalid', 'El título debe tener entre 1 y 179 caracteres.');
  }
  if (summary.length >= 600) {
    throw new JournalError('invalid', 'El resumen debe tener menos de 600 caracteres.');
  }
  if (!category || category.length >= 80 || !series || series.length >= 80) {
    throw new JournalError(
      'invalid',
      'La categoría y la serie deben tener entre 1 y 79 caracteres.',
    );
  }
  if (!author || author.length >= 120) {
    throw new JournalError('invalid', 'El autor debe tener entre 1 y 119 caracteres.');
  }
  if (tags.length >= 16 || tags.some((tag) => !TAG_PATTERN.test(tag))) {
    throw new JournalError('invalid', 'Usa hasta 15 etiquetas con minúsculas, números y guiones.');
  }
  if (!markdown.trim()) {
    throw new JournalError('invalid', 'Escribe el cuerpo en Markdown antes de guardar.');
  }
  if (markdown.length >= MARKDOWN_MAX_CHARS || utf8Bytes(markdown) > MARKDOWN_MAX_BYTES) {
    throw new JournalError(
      'invalid',
      'Esta entrada es demasiado larga para un solo documento de Firestore.',
    );
  }
  if (status === 'published') {
    if (!(draft.publishedAt instanceof Date) || Number.isNaN(draft.publishedAt.getTime())) {
      throw new JournalError('invalid', 'Elige una fecha de publicación.');
    }
  }

  return {
    slug,
    title,
    summary,
    tags,
    category,
    series,
    author,
    status,
    publishedAt: status === 'published' ? draft.publishedAt : null,
    markdown,
  };
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}
