import { EntryStatus } from './article.model';

export type ChallengeDifficulty = 'warmup' | 'practice' | 'stretch';

export interface Challenge {
  slug: string;
  title: string;
  summary: string;
  difficulty: ChallengeDifficulty;
  tags: string[];
  prompt: string;
  hint: string;
  solution: string;
  language: string;
  /** Optional link to the DevChronicle tutorial this drill belongs to. */
  articleSlug?: string | null;
  articleTitle?: string | null;
  // Firestore fields:
  order: number;
  status: EntryStatus;
  publishedAt: string | null;
  updatedAt: string;
}

/** Bundled drills from before challenges moved to Firestore. */
export type LegacyChallenge = Omit<Challenge, 'order' | 'status' | 'publishedAt' | 'updatedAt'>;

/** What the Studio edits (dates as Date, no updatedAt). */
export interface ChallengeDraft extends Omit<Challenge, 'publishedAt' | 'updatedAt'> {
  publishedAt: Date | null;
}
