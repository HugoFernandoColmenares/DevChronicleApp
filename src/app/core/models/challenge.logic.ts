import { ChallengeDraft } from '@core/models/challenge.model';
import { SLUG_PATTERN, TAG_PATTERN } from '@core/models/entry.logic';
import { JournalError } from '@core/models/journal-error';

const DIFFICULTIES = ['warmup', 'practice', 'stretch'] as const;

export function normalizeChallenge(draft: ChallengeDraft): ChallengeDraft {
  const slug = draft.slug.trim();
  const title = draft.title.trim();
  const tags = draft.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  const articleSlug = draft.articleSlug?.trim() || null;
  const status = draft.status === 'draft' ? 'draft' : 'published';

  if (!SLUG_PATTERN.test(slug)) {
    throw new JournalError('invalid-slug', 'Usa un slug en minúsculas con guiones.');
  }
  if (!title || title.length >= 180) {
    throw new JournalError('invalid', 'El título debe tener entre 1 y 179 caracteres.');
  }
  if (draft.summary.length >= 600) {
    throw new JournalError('invalid', 'El resumen debe tener menos de 600 caracteres.');
  }
  if (!DIFFICULTIES.includes(draft.difficulty)) {
    throw new JournalError('invalid', 'Dificultad no válida.');
  }
  if (tags.length >= 16 || tags.some((tag) => !TAG_PATTERN.test(tag))) {
    throw new JournalError('invalid', 'Hasta 15 etiquetas en minúsculas con guiones.');
  }
  if (!draft.language.trim() || draft.language.length >= 40) {
    throw new JournalError('invalid', 'Indica el lenguaje (máx. 39 caracteres).');
  }
  if (!draft.prompt.trim() || draft.prompt.length >= 20_000) {
    throw new JournalError('invalid', 'El enunciado es obligatorio (máx. 19 999).');
  }
  if (draft.hint.length >= 20_000 || draft.solution.length >= 50_000) {
    throw new JournalError('invalid', 'Pista o solución demasiado largas.');
  }
  if (articleSlug && !SLUG_PATTERN.test(articleSlug)) {
    throw new JournalError('invalid', 'El slug del tutorial no es válido.');
  }
  if (!Number.isInteger(draft.order) || draft.order < 0 || draft.order >= 100_000) {
    throw new JournalError('invalid', 'El orden debe ser un entero entre 0 y 99 999.');
  }
  if (status === 'published' && !(draft.publishedAt instanceof Date)) {
    throw new JournalError('invalid', 'Elige una fecha de publicación.');
  }

  return {
    ...draft,
    slug,
    title,
    tags,
    articleSlug,
    articleTitle: articleSlug ? draft.articleTitle?.trim() || null : null,
    summary: draft.summary.trim(),
    language: draft.language.trim(),
    status,
    publishedAt: status === 'published' ? draft.publishedAt : null,
  };
}
