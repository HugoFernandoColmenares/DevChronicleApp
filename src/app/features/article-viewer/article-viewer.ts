import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, filter, map, of, switchMap } from 'rxjs';

import { ContentFetcherService } from '@core/services/content-fetcher.service';
import { MarkdownParserService } from '@core/services/markdown-parser.service';
import { NotificationService } from '@core/services/notification.service';
import { CodeBlocksDirective } from '@shared/code-blocks/code-blocks';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader';
import { TagComponent } from '@shared/tag/tag';

@Component({
  selector: 'dev-article-viewer',
  imports: [DatePipe, RouterLink, CodeBlocksDirective, SkeletonLoaderComponent, TagComponent],
  templateUrl: './article-viewer.html',
  styleUrl: './article-viewer.css',
})
export class ArticleViewerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(ContentFetcherService);
  private readonly parser = inject(MarkdownParserService);
  private readonly notifications = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: '' },
  );

  readonly article = toSignal(
    toObservable(this.slug).pipe(
      filter((slug) => slug.length > 0),
      switchMap((slug) =>
        this.content.getMarkdown(slug).pipe(
          map((body) => ({
            metadata: body.metadata,
            markdown: body.markdown,
            html: this.parser.compile(body.markdown),
          })),
          catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 404) {
              void this.notifications.error(
                'Article not found',
                'This entry is missing or the link is invalid.',
              );
            } else {
              void this.notifications.error(
                'Unable to load the journal',
                'This entry could not be retrieved. Refresh the page to try again.',
              );
            }
            return of(null);
          }),
        ),
      ),
    ),
  );

  readonly compiledHtml = computed<SafeHtml | null>(() => {
    const article = this.article();
    return article ? this.sanitizer.bypassSecurityTrustHtml(article.html) : null;
  });
}
