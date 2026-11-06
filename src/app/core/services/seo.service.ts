import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { ArticleMetadata } from '@core/models/article.model';
import { environment } from '@env';

export interface PageSeo {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | null;
}

const CANONICAL_ID = 'devchronicle-canonical';
const JSON_LD_ID = 'devchronicle-jsonld';
const ARTICLE_META = [
  'article:published_time',
  'article:modified_time',
  'article:author',
  'article:section',
];

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  setPage(page: PageSeo): void {
    const type = page.type ?? 'website';
    const fullTitle =
      page.title === environment.siteName
        ? environment.siteName
        : `${page.title} · ${environment.siteName}`;
    const url = this.absolute(page.path);
    const image = this.absolute(page.image ?? environment.socialImage);
    const description = page.description || environment.defaultDescription;

    this.title.setTitle(fullTitle);

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({
      name: 'robots',
      content: page.noindex ? 'noindex, nofollow' : 'index, follow',
    });

    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:site_name', content: environment.siteName });
    this.meta.updateTag({ property: 'og:locale', content: 'en_US' });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:type', content: 'image/png' });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({
      property: 'og:image:alt',
      content: `${page.title} — ${environment.siteName}`,
    });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    if (type !== 'article') {
      this.clearArticleMeta();
    }

    this.setCanonical(url);
    this.setJsonLd(page.jsonLd ?? null);
  }

  setArticle(article: ArticleMetadata): void {
    const path = `/post/${article.slug}`;
    const url = this.absolute(path);
    const image = this.absolute(environment.socialImage);

    this.setPage({
      title: article.title,
      description: article.summary,
      path,
      type: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.summary,
        datePublished: article.publishedAt ?? article.updatedAt,
        dateModified: article.updatedAt,
        author: { '@type': 'Person', name: article.author },
        publisher: { '@type': 'Organization', name: environment.siteName },
        url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        image,
        keywords: article.tags.join(', '),
        articleSection: article.category || undefined,
        inLanguage: 'en',
      },
    });

    this.meta.updateTag({
      property: 'article:published_time',
      content: article.publishedAt ?? article.updatedAt,
    });
    this.meta.updateTag({ property: 'article:modified_time', content: article.updatedAt });
    this.meta.updateTag({ property: 'article:author', content: article.author });
    this.meta.updateTag({ property: 'article:section', content: article.category });
  }

  setPrivate(title = 'Studio', description = 'Authoring studio for DevChronicle.'): void {
    this.setPage({ title, description, path: '/admin', noindex: true });
  }

  private absolute(path: string): string {
    return new URL(path, `${environment.siteUrl.replace(/\/+$/, '')}/`).toString();
  }

  private clearArticleMeta(): void {
    for (const property of ARTICLE_META) {
      this.meta.removeTag(`property="${property}"`);
    }
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>(`link#${CANONICAL_ID}`);

    if (!link) {
      link = this.document.createElement('link');
      link.id = CANONICAL_ID;
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }

    link.href = url;
  }

  private setJsonLd(data: Record<string, unknown> | null): void {
    const existing = this.document.getElementById(JSON_LD_ID);

    if (!data) {
      existing?.remove();
      return;
    }

    const script = (existing as HTMLScriptElement | null) ?? this.document.createElement('script');

    script.id = JSON_LD_ID;
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(data);

    if (!existing) {
      this.document.head.appendChild(script);
    }
  }
}
