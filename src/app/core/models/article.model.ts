export type EntryStatus = 'draft' | 'published';

export interface ArticleMetadata {
  slug: string;
  title: string;
  author: string;
  summary: string;
  tags: string[];
  category: string;
  series: string;
  publishedAt: string | null;
  updatedAt: string;
  status: EntryStatus;
  readingTimeMinutes: number;
}

export interface ArticleBody {
  metadata: ArticleMetadata;
  markdown: string;
}

export interface ArticleContent extends ArticleBody {
  html: string;
}

export interface EntryDraft {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  category: string;
  series: string;
  author: string;
  status: EntryStatus;
  publishedAt: Date | null;
  markdown: string;
}
