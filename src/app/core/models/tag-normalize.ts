/** Collapse known bilingual duplicates so filters and chips share one label. */
const TAG_ALIASES: Record<string, string> = {
  arquitectura: 'architecture',
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
