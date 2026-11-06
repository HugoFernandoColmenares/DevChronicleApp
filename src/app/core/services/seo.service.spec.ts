import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { ArticleMetadata } from '@core/models/article.model';
import { environment } from '@env';

import { SeoService } from './seo.service';

const article: ArticleMetadata = {
  slug: 'angular-signals-in-practice',
  title: 'Angular signals in practice',
  author: 'Hugo Colmenares',
  summary: 'Signal inputs keep a content site explicit.',
  tags: ['angular', 'architecture'],
  category: 'journal',
  series: 'Signals',
  publishedAt: '2026-09-10T12:00:00.000Z',
  updatedAt: '2026-09-11T12:00:00.000Z',
  status: 'published',
  readingTimeMinutes: 4,
};

describe('SeoService', () => {
  let seo: SeoService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    seo = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
  });

  it('writes titles, descriptions, canonical and Open Graph tags', () => {
    seo.setPage({ title: 'Articles', description: 'The archive.', path: '/articles' });

    expect(doc.title).toBe('Articles · DevChronicle');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'The archive.',
    );
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${environment.siteUrl}/articles`,
    );
    expect(doc.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      `${environment.siteUrl}/articles`,
    );
    expect(doc.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      `${environment.siteUrl}${environment.socialImage}`,
    );
  });

  it('adds BlogPosting structured data for an article', () => {
    seo.setArticle(article);

    const schema = JSON.parse(
      doc.getElementById('devchronicle-jsonld')?.textContent ?? '{}',
    ) as Record<string, unknown>;

    expect(doc.title).toBe('Angular signals in practice · DevChronicle');
    expect(schema['@type']).toBe('BlogPosting');
    expect(schema['headline']).toBe('Angular signals in practice');
    expect(schema['datePublished']).toBe('2026-09-10T12:00:00.000Z');
    expect(doc.querySelector('meta[property="article:author"]')?.getAttribute('content')).toBe(
      'Hugo Colmenares',
    );
  });

  it('clears article data and marks private views as noindex', () => {
    seo.setArticle(article);
    seo.setPage({ title: 'Page not found', description: 'Missing.', path: '/404', noindex: true });

    expect(doc.getElementById('devchronicle-jsonld')).toBeNull();
    expect(doc.querySelector('meta[property="article:author"]')).toBeNull();
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
  });
});
