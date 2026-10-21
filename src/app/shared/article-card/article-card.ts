import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArticleMetadata } from '@core/models/article.model';
import { TagComponent } from '@shared/tag/tag';

@Component({
  selector: 'dev-article-card',
  imports: [DatePipe, RouterLink, TagComponent],
  templateUrl: './article-card.html',
  styleUrl: './article-card.css',
})
export class ArticleCardComponent {
  readonly article = input.required<ArticleMetadata>();
  readonly featured = input(false);
}
