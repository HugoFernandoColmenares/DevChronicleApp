import { Component, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { ArticleMetadata, EntryStatus } from '@core/models/article.model';
import { Challenge, ChallengeDifficulty, ChallengeDraft } from '@core/models/challenge.model';
import {
  dateInputToDate,
  dateToInput,
  joinTags,
  slugify,
  splitTags,
} from '@core/models/entry.logic';
import { JournalError } from '@core/models/journal-error';
import { ChallengeService } from '@core/services/challenge.service';
import { JournalService } from '@core/services/journal.service';
import { NotificationService } from '@core/services/notification.service';
import { CodeBlocksDirective } from '@shared/code-blocks/code-blocks';
import { StudioBarComponent } from './studio-bar';

@Component({
  selector: 'dev-admin-challenge-editor',
  imports: [ReactiveFormsModule, CodeBlocksDirective, StudioBarComponent],
  templateUrl: './admin-challenge-editor.html',
  styleUrl: './admin-challenge-editor.css',
})
export class AdminChallengeEditorComponent {
  private readonly challengesService = inject(ChallengeService);
  private readonly journal = inject(JournalService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private slugTouched = false;
  private baseline = '';
  private expectedUpdatedAt: string | null = null;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingSlug = signal<string | null>(null);
  readonly articles = signal<ArticleMetadata[]>([]);
  readonly challenges = signal<Challenge[]>([]);
  readonly title = signal('');
  readonly prompt = signal('');
  readonly hint = signal('');
  readonly solution = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    summary: ['', Validators.required],
    difficulty: ['warmup' as ChallengeDifficulty, Validators.required],
    language: ['javascript', Validators.required],
    tags: [''],
    order: [0, [Validators.required, Validators.min(0), Validators.max(99999)]],
    articleSlug: [''],
    prompt: ['', Validators.required],
    hint: [''],
    solution: [''],
    publishedOn: [dateToInput(null), Validators.required],
  });

  constructor() {
    this.form.controls.title.valueChanges.pipe(takeUntilDestroyed()).subscribe((title) => {
      this.title.set(title);
      if (!this.editingSlug() && !this.slugTouched) {
        this.form.controls.slug.setValue(slugify(title), { emitEvent: false });
      }
    });

    this.form.controls.prompt.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.prompt.set(value));

    this.form.controls.hint.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.hint.set(value));

    this.form.controls.solution.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.solution.set(value));

    this.journal
      .watchAll()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (articles) => this.articles.set(articles),
        error: () => this.articles.set([]),
      });

    this.challengesService
      .watchAll()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (challenges) => {
          this.challenges.set(challenges);
          this.syncSuggestedOrder();
        },
        error: () => this.challenges.set([]),
      });

    this.route.paramMap
      .pipe(
        map((params) => params.get('slug')),
        takeUntilDestroyed(),
      )
      .subscribe((slug) => {
        void this.open(slug);
      });
  }

  markSlugTouched(): void {
    this.slugTouched = true;
  }

  hasUnsavedChanges(): boolean {
    if (this.loading() || this.saving()) {
      return false;
    }
    return JSON.stringify(this.form.getRawValue()) !== this.baseline;
  }

  confirmDiscard(): Promise<boolean> {
    return this.notifications.confirm(
      'Discard unsaved changes?',
      'Leaving Studio now loses the edits in this challenge.',
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  }

  async save(status: EntryStatus): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void this.notifications.error(
        'Check the challenge',
        'Title, slug, summary, prompt, and publication date are required.',
      );
      return;
    }

    const value = this.form.getRawValue();
    const publishedAt = dateInputToDate(value.publishedOn);
    const creating = !this.editingSlug();
    const draft: ChallengeDraft = {
      slug: value.slug,
      title: value.title,
      summary: value.summary,
      difficulty: value.difficulty,
      tags: splitTags(value.tags),
      language: value.language,
      prompt: value.prompt,
      hint: value.hint,
      solution: value.solution,
      articleSlug: value.articleSlug || null,
      articleTitle: value.articleSlug ? this.articleTitleFor(value.articleSlug) : null,
      order: value.order,
      status,
      publishedAt,
    };

    this.saving.set(true);
    try {
      const updatedAt = await this.challengesService.save(draft, {
        create: creating,
        expectedUpdatedAt: creating ? null : this.expectedUpdatedAt,
      });
      this.expectedUpdatedAt = updatedAt;
      this.markClean();
      void this.notifications.toast(status === 'published' ? 'Published' : 'Draft saved');
      if (creating) {
        await this.router.navigate(['/admin/challenges/edit', value.slug], { replaceUrl: true });
      }
    } catch (error) {
      if (error instanceof JournalError && error.code === 'conflict' && this.editingSlug()) {
        const reload = await this.notifications.confirm(
          'Challenge changed elsewhere',
          'Another tab saved a newer revision. Reload that version? Your current edits will be discarded.',
        );
        if (reload) {
          await this.open(this.editingSlug());
        }
        return;
      }
      void this.notifications.error('Save failed', this.message(error));
    } finally {
      this.saving.set(false);
    }
  }

  async remove(): Promise<void> {
    const slug = this.editingSlug();
    if (!slug) {
      return;
    }
    const confirmed = await this.notifications.confirm(
      'Delete this challenge?',
      'The drill leaves the practice catalog.',
    );
    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    try {
      await this.challengesService.remove(slug);
      this.markClean();
      void this.notifications.toast('Challenge deleted');
      await this.router.navigateByUrl('/admin/challenges');
    } catch (error) {
      void this.notifications.error('Delete failed', this.message(error));
    } finally {
      this.saving.set(false);
    }
  }

  private async open(slug: string | null): Promise<void> {
    this.slugTouched = false;
    if (!slug) {
      this.editingSlug.set(null);
      this.expectedUpdatedAt = null;
      this.form.controls.slug.enable();
      this.form.reset({
        title: '',
        slug: '',
        summary: '',
        difficulty: 'warmup',
        language: 'javascript',
        tags: '',
        order: this.suggestedOrder(),
        articleSlug: '',
        prompt: '',
        hint: '',
        solution: '',
        publishedOn: dateToInput(null),
      });
      this.setPreview('', '', '', '');
      this.loading.set(false);
      this.markClean();
      return;
    }

    this.loading.set(true);
    try {
      const challenge = await this.challengesService.load(slug);
      this.editingSlug.set(slug);
      this.expectedUpdatedAt = challenge.updatedAt;
      this.form.controls.slug.disable();
      this.form.reset({
        title: challenge.title,
        slug: challenge.slug,
        summary: challenge.summary,
        difficulty: challenge.difficulty,
        language: challenge.language,
        tags: joinTags(challenge.tags),
        order: challenge.order,
        articleSlug: challenge.articleSlug ?? '',
        prompt: challenge.prompt,
        hint: challenge.hint,
        solution: challenge.solution,
        publishedOn: dateToInput(challenge.publishedAt),
      });
      this.setPreview(challenge.title, challenge.prompt, challenge.hint, challenge.solution);
      this.markClean();
    } catch (error) {
      void this.notifications.error('Challenge unavailable', this.message(error));
      await this.router.navigateByUrl('/admin/challenges');
    } finally {
      this.loading.set(false);
    }
  }

  private suggestedOrder(): number {
    const highest = this.challenges().reduce((max, item) => Math.max(max, item.order), 0);
    return highest + 10;
  }

  /** The list arrives asynchronously; fill a fresh form without clobbering typed values. */
  private syncSuggestedOrder(): void {
    if (this.editingSlug() || this.loading() || this.form.dirty) {
      return;
    }
    const order = this.suggestedOrder();
    if (this.form.controls.order.value === order) {
      return;
    }
    this.form.controls.order.setValue(order, { emitEvent: false });
    this.markClean();
  }

  private articleTitleFor(slug: string): string | null {
    return this.articles().find((article) => article.slug === slug)?.title ?? null;
  }

  private setPreview(title: string, prompt: string, hint: string, solution: string): void {
    this.title.set(title);
    this.prompt.set(prompt);
    this.hint.set(hint);
    this.solution.set(solution);
  }

  private markClean(): void {
    this.baseline = JSON.stringify(this.form.getRawValue());
  }

  private message(error: unknown): string {
    return error instanceof JournalError ? error.message : 'Firestore rejected the change.';
  }
}
