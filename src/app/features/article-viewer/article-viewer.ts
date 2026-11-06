import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, filter, map, of, switchMap, tap } from 'rxjs';

import { JournalError } from '@core/models/journal-error';
import { JournalService } from '@core/services/journal.service';
import { MarkdownParserService } from '@core/services/markdown-parser.service';
import { NotificationService } from '@core/services/notification.service';
import { SeoService } from '@core/services/seo.service';
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
  private readonly journal = inject(JournalService);
  private readonly parser = inject(MarkdownParserService);
  private readonly notifications = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly seo = inject(SeoService);

  readonly errorKind = signal<'not-found' | 'unavailable' | null>(null);

  readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')), {
    initialValue: '',
  });

  readonly article = toSignal(
    toObservable(this.slug).pipe(
      filter((slug) => slug.length > 0),
      tap(() => this.errorKind.set(null)),
      switchMap((slug) =>
        this.journal.watchEntry(slug).pipe(
          map((body) => ({
            metadata: body.metadata,
            markdown: body.markdown,
            html: this.parser.compile(body.markdown),
          })),
          catchError((error: unknown) => {
            const missing =
              error instanceof JournalError &&
              (error.code === 'not-found' || error.code === 'invalid-slug');

            this.errorKind.set(missing ? 'not-found' : 'unavailable');

            if (!missing) {
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

  constructor() {
    effect(() => {
      const entry = this.article();
      if (entry) {
        this.seo.setArticle(entry.metadata);
        return;
      }

      const error = this.errorKind();
      if (error === 'not-found') {
        this.seo.setPage({
          title: 'Article not found',
          description: 'This entry is missing or the link is invalid.',
          path: '/404',
          noindex: true,
        });
      } else if (error === 'unavailable') {
        this.seo.setPage({
          title: 'Journal unavailable',
          description: 'The DevChronicle entry could not be retrieved.',
          path: '/404',
          noindex: true,
        });
      }
    });
  }
}
