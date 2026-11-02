import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { EntryStatus } from '@core/models/article.model';
import {
  dateInputToDate,
  dateToInput,
  joinTags,
  readingTimeMinutes,
  slugify,
  splitTags,
} from '@core/models/entry.logic';
import { JournalError } from '@core/models/journal-error';
import { JournalService } from '@core/services/journal.service';
import { MarkdownParserService } from '@core/services/markdown-parser.service';
import { NotificationService } from '@core/services/notification.service';
import { environment } from '@env';
import { CodeBlocksDirective } from '@shared/code-blocks/code-blocks';
import { StudioBarComponent } from './studio-bar';

@Component({
  selector: 'dev-admin-editor',
  imports: [ReactiveFormsModule, CodeBlocksDirective, StudioBarComponent],
  templateUrl: './admin-editor.html',
})
export class AdminEditorComponent {
  private readonly journal = inject(JournalService);
  private readonly parser = inject(MarkdownParserService);
  private readonly notifications = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private slugTouched = false;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingSlug = signal<string | null>(null);
  readonly markdown = signal('');
  readonly title = signal('');
  readonly minutes = computed(() => readingTimeMinutes(this.markdown()));

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    summary: ['', Validators.required],
    category: ['journal', Validators.required],
    series: ['journal', Validators.required],
    author: [environment.authorName, Validators.required],
    tags: [''],
    publishedOn: [dateToInput(null), Validators.required],
    markdown: ['', Validators.required],
  });

  readonly previewHtml = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.parser.compile(this.markdown())),
  );

  constructor() {
    this.form.controls.title.valueChanges.pipe(takeUntilDestroyed()).subscribe((title) => {
      this.title.set(title);
      if (!this.editingSlug() && !this.slugTouched) {
        this.form.controls.slug.setValue(slugify(title), { emitEvent: false });
      }
    });

    this.form.controls.markdown.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.markdown.set(value);
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

  async save(status: EntryStatus): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void this.notifications.error(
        'Check the entry',
        'Title, slug, summary, and markdown are required.',
      );
      return;
    }

    const value = this.form.getRawValue();
    const publishedAt = dateInputToDate(value.publishedOn);
    this.saving.set(true);
    try {
      const creating = !this.editingSlug();
      await this.journal.save(
        {
          slug: value.slug,
          title: value.title,
          summary: value.summary,
          tags: splitTags(value.tags),
          category: value.category,
          series: value.series,
          author: value.author,
          status,
          publishedAt,
          markdown: value.markdown,
        },
        { create: creating },
      );
      void this.notifications.toast(status === 'published' ? 'Published' : 'Draft saved');
      if (creating) {
        await this.router.navigate(['/admin/edit', value.slug], { replaceUrl: true });
      }
    } catch (error) {
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
      'Delete this entry?',
      'The note leaves the journal, including its markdown.',
    );
    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    try {
      await this.journal.remove(slug);
      void this.notifications.toast('Entry deleted');
      await this.router.navigateByUrl('/admin');
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
      this.form.controls.slug.enable();
      this.form.reset({
        title: '',
        slug: '',
        summary: '',
        category: 'journal',
        series: 'journal',
        author: environment.authorName,
        tags: '',
        publishedOn: dateToInput(null),
        markdown: '',
      });
      this.markdown.set('');
      this.title.set('');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    try {
      const entry = await this.journal.loadEntry(slug);
      this.editingSlug.set(slug);
      this.form.controls.slug.disable();
      this.form.reset({
        title: entry.metadata.title,
        slug: entry.metadata.slug,
        summary: entry.metadata.summary,
        category: entry.metadata.category,
        series: entry.metadata.series,
        author: entry.metadata.author,
        tags: joinTags(entry.metadata.tags),
        publishedOn: dateToInput(entry.metadata.publishedAt),
        markdown: entry.markdown,
      });
      this.markdown.set(entry.markdown);
      this.title.set(entry.metadata.title);
    } catch (error) {
      void this.notifications.error('Entry unavailable', this.message(error));
      await this.router.navigateByUrl('/admin');
    } finally {
      this.loading.set(false);
    }
  }

  private message(error: unknown): string {
    return error instanceof JournalError ? error.message : 'Firestore rejected the change.';
  }
}
