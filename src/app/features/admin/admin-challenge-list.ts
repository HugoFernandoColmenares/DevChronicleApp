import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { Challenge } from '@core/models/challenge.model';
import { ChallengeService } from '@core/services/challenge.service';
import { NotificationService } from '@core/services/notification.service';
import { StudioBarComponent } from './studio-bar';

@Component({
  selector: 'dev-admin-challenge-list',
  imports: [DatePipe, RouterLink, StudioBarComponent],
  templateUrl: './admin-challenge-list.html',
})
export class AdminChallengeListComponent {
  private readonly challengesService = inject(ChallengeService);
  private readonly notifications = inject(NotificationService);

  readonly challenges = signal<Challenge[]>([]);
  readonly loading = signal(true);

  constructor() {
    this.challengesService
      .watchAll()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (challenges) => {
          this.challenges.set(challenges);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          void this.notifications.error(
            'Unable to load challenges',
            'Firestore did not return the challenges. Confirm this account is in admins.',
          );
        },
      });
  }

  labelFor(difficulty: string): string {
    switch (difficulty) {
      case 'warmup':
        return 'Warm-up';
      case 'practice':
        return 'Practice';
      case 'stretch':
        return 'Stretch';
      default:
        return difficulty;
    }
  }
}
