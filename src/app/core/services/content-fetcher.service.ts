import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ArticleMetadata } from '@core/models/article.model';
import { environment } from '@env';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable({ providedIn: 'root' })
export class ContentFetcherService {
  private readonly http = inject(HttpClient);
  private readonly basePath = environment.contentBasePath.replace(/\/$/, '');

  getIndex(): Observable<ArticleMetadata[]> {
    return this.http.get<ArticleMetadata[]>(`${this.basePath}/index.json`);
  }

  getMarkdown(slug: string): Observable<string> {
    return this.http.get(`${this.basePath}/${this.assertSafeSlug(slug)}.md`, {
      responseType: 'text',
    });
  }

  private assertSafeSlug(slug: string): string {
    if (!SLUG_PATTERN.test(slug)) {
      throw new Error('Invalid article slug.');
    }

    return slug;
  }
}
