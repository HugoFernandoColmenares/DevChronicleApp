/**
 * Une los duplicados bilingües conocidos en su forma en español, para que los filtros y
 * las etiquetas compartan un solo nombre aunque quede contenido antiguo en inglés.
 */
const TAG_ALIASES: Record<string, string> = {
  architecture: 'arquitectura',
  design: 'diseno',
  journal: 'diario',
  typography: 'tipografia',
};

export function normalizeTag(tag: string): string {
  const folded = tag.trim().toLocaleLowerCase();
  return TAG_ALIASES[folded] ?? folded;
}

export function normalizeTags(tags: string[]): string[] {
  const unique = new Set<string>();
  for (const tag of tags) {
    if (!tag.trim()) {
      continue;
    }
    unique.add(normalizeTag(tag));
  }
  return [...unique].sort((a, b) => a.localeCompare(b));
}
