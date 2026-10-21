import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, tap, throwError } from 'rxjs';

import { ArticleBody, ArticleMetadata } from '@core/models/article.model';
import { MarkdownParserService } from '@core/services/markdown-parser.service';
import { NotificationService } from '@core/services/notification.service';
import { environment } from '@env';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OUTAGE_KEY = 'devchronicle.api-outage-announced';

@Injectable({ providedIn: 'root' })
export class ContentFetcherService {
  private readonly http = inject(HttpClient);
  private readonly parser = inject(MarkdownParserService);
  private readonly notifications = inject(NotificationService);
  private readonly apiPath = environment.apiBasePath.replace(/\/$/, '');
  private readonly contentPath = environment.contentBasePath.replace(/\/$/, '');
  private outageAnnounced = false;

  readonly apiOffline = signal(false);

  getIndex(): Observable<ArticleMetadata[]> {
    return this.http.get<ArticleMetadata[]>(`${this.apiPath}/articles`).pipe(
      tap(() => this.markReachable()),
      catchError((error: unknown) => {
        if (!this.isUnreachable(error)) {
          this.markReachable();
          return throwError(() => error);
        }

        this.markUnreachable();
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
      tap(() => this.markReachable()),
      catchError((error: unknown) => {
        if (!this.isUnreachable(error)) {
          this.markReachable();
          return throwError(() => error);
        }

        this.markUnreachable();
        return this.http
          .get(`${this.contentPath}/${slug}.md`, { responseType: 'text' })
          .pipe(map((raw) => this.toBody(raw, slug)));
      }),
    );
  }

  private markReachable(): void {
    this.apiOffline.set(false);
    this.outageAnnounced = false;
    sessionStorage.removeItem(OUTAGE_KEY);
  }

  private markUnreachable(): void {
    this.apiOffline.set(true);
    if (this.outageAnnounced || sessionStorage.getItem(OUTAGE_KEY) === '1') {
      this.outageAnnounced = true;
      return;
    }

    this.outageAnnounced = true;
    sessionStorage.setItem(OUTAGE_KEY, '1');
    void this.notifications.info(
      'API is offline',
      'Showing the local journal until the service responds again.',
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
