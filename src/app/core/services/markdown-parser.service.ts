import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

import { ArticleContent, ArticleMetadata } from '@core/models/article.model';
import { readingTimeMinutes } from '@core/models/entry.logic';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

@Injectable({ providedIn: 'root' })
export class MarkdownParserService {
  constructor() {
    marked.setOptions({ gfm: true, breaks: false });
  }

  parse(raw: string, slug: string): ArticleContent {
    const { frontmatter, markdown } = this.splitFrontmatter(raw);
    const metadata = this.toMetadata(frontmatter, slug, markdown);
    const html = this.compile(markdown);

    return { metadata, markdown, html };
  }

  compile(markdown: string): string {
    const rendered = marked.parse(markdown, { async: false });
    return DOMPurify.sanitize(rendered, {
      ADD_ATTR: ['class'],
      USE_PROFILES: { html: true },
    });
  }

  private splitFrontmatter(raw: string): { frontmatter: string; markdown: string } {
    const match = FRONTMATTER_PATTERN.exec(raw.trimStart());

    if (!match) {
      return { frontmatter: '', markdown: raw };
    }

    return { frontmatter: match[1], markdown: match[2] };
  }

  private toMetadata(frontmatter: string, slug: string, markdown: string): ArticleMetadata {
    const fields = this.parseFields(frontmatter);
    const category = fields['category'] || 'journal';
    const date = fields['date'] ?? '';
    const publishedAt = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00.000Z` : null;

    return {
      slug: fields['slug'] ?? slug,
      title: fields['title'] ?? slug,
      author: fields['author'] ?? 'Unknown',
      summary: fields['summary'] ?? fields['excerpt'] ?? '',
      tags: this.parseTags(fields['tags']),
      category,
      series: fields['series'] || category,
      publishedAt,
      updatedAt: publishedAt ?? new Date(0).toISOString(),
      status: fields['status'] === 'draft' ? 'draft' : 'published',
      readingTimeMinutes: readingTimeMinutes(markdown),
    };
  }

  private parseFields(frontmatter: string): Record<string, string> {
    const fields: Record<string, string> = {};

    for (const line of frontmatter.split(/\r?\n/)) {
      const separator = line.indexOf(':');

      if (separator < 1) {
        continue;
      }

      const key = line.slice(0, separator).trim();
      const value = line
        .slice(separator + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      fields[key] = value;
    }

    return fields;
  }

  private parseTags(value?: string): string[] {
    if (!value) {
      return [];
    }

    return value
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(',')
      .map((tag) => tag.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
}
