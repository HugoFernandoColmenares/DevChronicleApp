import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, filter, from, map, of, switchMap, tap } from 'rxjs';

import { ArticleBody, ArticleContent } from '@core/models/article.model';
import { JournalError } from '@core/models/journal-error';
import { READ_RETRY, retryTransient } from '@core/rxjs/retry-transient';
import { JournalService } from '@core/services/journal.service';
import { MarkdownParserService } from '@core/services/markdown-parser.service';
import { OfflineSnapshotService } from '@core/services/offline-snapshot.service';
import { SeoService } from '@core/services/seo.service';
import { CodeBlocksDirective } from '@shared/code-blocks/code-blocks';
import { OfflineNoticeComponent } from '@shared/offline-notice/offline-notice';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader';
import { TagComponent } from '@shared/tag/tag';

@Component({
  selector: 'dev-article-viewer',
  imports: [
    DatePipe,
    RouterLink,
    CodeBlocksDirective,
    OfflineNoticeComponent,
    SkeletonLoaderComponent,
    TagComponent,
  ],
  templateUrl: './article-viewer.html',
  styleUrl: './article-viewer.css',
})
export class ArticleViewerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly journal = inject(JournalService);
  private readonly parser = inject(MarkdownParserService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly seo = inject(SeoService);
  private readonly snapshot = inject(OfflineSnapshotService);
  private readonly retryOptions = inject(READ_RETRY);
  private readonly attempt = signal(0);

  readonly errorKind = signal<'not-found' | 'unavailable' | null>(null);
  readonly offline = this.journal.offline;
  /** Fecha de la copia estática en uso; null cuando la entrada viene de Firestore. */
  readonly copyGeneratedAt = signal<string | null>(null);
  readonly showOfflineNotice = computed(() => this.copyGeneratedAt() !== null || this.offline());

  readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')), {
    initialValue: '',
  });

  readonly article = toSignal(
    combineLatest([toObservable(this.slug), toObservable(this.attempt)]).pipe(
      map(([slug]) => slug),
      filter((slug) => slug.length > 0),
      tap(() => {
        this.errorKind.set(null);
        this.copyGeneratedAt.set(null);
      }),
      switchMap((slug) =>
        this.journal.watchEntry(slug).pipe(
          retryTransient(this.retryOptions),
          tap(() => this.copyGeneratedAt.set(null)),
          map((body) => this.compile(body.metadata, body.markdown)),
          catchError((error: unknown) => {
            const missing =
              error instanceof JournalError &&
              (error.code === 'not-found' || error.code === 'invalid-slug');

            if (missing) {
              // Una entrada inexistente nunca se rellena con la copia sin conexión.
              this.errorKind.set('not-found');
              return of(null);
            }

            return from(this.snapshot.entry(slug)).pipe(
              map((copy) => {
                if (!copy) {
                  this.errorKind.set('unavailable');
                  return null;
                }
                this.copyGeneratedAt.set(copy.generatedAt);
                return this.compile(copy.body.metadata, copy.body.markdown);
              }),
            );
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
          title: 'Artículo no encontrado',
          description: 'Esta entrada no existe o el enlace no es válido.',
          path: '/404',
          noindex: true,
        });
      } else if (error === 'unavailable') {
        this.seo.setPage({
          title: 'Diario no disponible',
          description: 'No se pudo obtener la entrada de DevChronicle.',
          path: '/404',
          noindex: true,
        });
      }
    });
  }

  private compile(metadata: ArticleBody['metadata'], markdown: string): ArticleContent {
    return { metadata, markdown, html: this.parser.compile(markdown) };
  }

  retry(): void {
    this.attempt.update((value) => value + 1);
  }
}
