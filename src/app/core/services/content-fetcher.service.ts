import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { ArticleBody, ArticleMetadata } from '@core/models/article.model';
import { environment } from '@env';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable({ providedIn: 'root' })
export class ContentFetcherService {
  private readonly http = inject(HttpClient);
  private readonly basePath = environment.apiBasePath.replace(/\/$/, '');

  getIndex(): Observable<ArticleMetadata[]> {
    return this.http.get<ArticleMetadata[]>(`${this.basePath}/articles`);
  }

  getMarkdown(slug: string): Observable<ArticleBody> {
    if (!SLUG_PATTERN.test(slug)) {
      return throwError(
        () => new HttpErrorResponse({ status: 404, statusText: 'Invalid article slug.' }),
      );
    }

    return this.http.get<ArticleBody>(`${this.basePath}/articles/${slug}`);
  }
}
