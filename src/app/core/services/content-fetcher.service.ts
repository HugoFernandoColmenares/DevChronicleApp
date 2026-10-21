import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { ArticleBody, ArticleMetadata } from '@core/models/article.model';
import { MarkdownParserService } from '@core/services/markdown-parser.service';
import { environment } from '@env';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable({ providedIn: 'root' })
export class ContentFetcherService {
  private readonly http = inject(HttpClient);
  private readonly parser = inject(MarkdownParserService);
  private readonly apiPath = environment.apiBasePath.replace(/\/$/, '');
  private readonly contentPath = environment.contentBasePath.replace(/\/$/, '');

  getIndex(): Observable<ArticleMetadata[]> {
    return this.http.get<ArticleMetadata[]>(`${this.apiPath}/articles`).pipe(
      catchError((error: unknown) => {
        if (!this.isUnreachable(error)) {
          return throwError(() => error);
        }

        return this.http.get<ArticleMetadata[]>(`${this.contentPath}/index.json`);
      }),
    );
  }

  getMarkdown(slug: string): Observable<ArticleBody> {
    if (!SLUG_PATTERN.test(slug)) {
      return throwError(
        () => new HttpErrorResponse({ status: 404, statusText: 'Invalid article slug.' }),
      );
    }

    return this.http.get<ArticleBody>(`${this.apiPath}/articles/${slug}`).pipe(
      catchError((error: unknown) => {
        if (!this.isUnreachable(error)) {
          return throwError(() => error);
        }

        return this.http
          .get(`${this.contentPath}/${slug}.md`, { responseType: 'text' })
          .pipe(map((raw) => this.toBody(raw, slug)));
      }),
    );
  }

  private toBody(raw: string, slug: string): ArticleBody {
    const parsed = this.parser.parse(raw, slug);
    return { metadata: parsed.metadata, markdown: parsed.markdown };
  }

  private isUnreachable(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return true;
    }

    return error.status === 0 || error.status >= 500;
  }
}
