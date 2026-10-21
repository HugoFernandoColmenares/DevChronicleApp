export interface ArticleMetadata {
  slug: string;
  title: string;
  author: string;
  date: string;
  tags: string[];
  excerpt: string;
}

export interface ArticleBody {
  metadata: ArticleMetadata;
  markdown: string;
}

export interface ArticleContent extends ArticleBody {
  html: string;
}
