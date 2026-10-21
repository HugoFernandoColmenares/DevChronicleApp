export interface ArticleMetadata {
  slug: string;
  title: string;
  author: string;
  date: string;
  tags: string[];
  excerpt: string;
}

export interface ArticleContent {
  metadata: ArticleMetadata;
  markdown: string;
  html: string;
}
