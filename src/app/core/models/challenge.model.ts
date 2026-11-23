export interface Challenge {
  slug: string;
  title: string;
  summary: string;
  difficulty: 'warmup' | 'practice' | 'stretch';
  tags: string[];
  prompt: string;
  hint: string;
  solution: string;
  language: string;
  /** Optional link to the DevChronicle tutorial this drill belongs to. */
  articleSlug?: string;
  articleTitle?: string;
}
