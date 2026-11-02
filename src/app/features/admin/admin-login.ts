import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import type { User } from 'firebase/auth';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'dev-admin-login',
  templateUrl: './admin-login.html',
})
export class AdminLoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly ready = signal(false);
  readonly busy = signal(false);

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user === undefined) {
        return;
      }
      if (!user) {
        this.ready.set(true);
        return;
      }
      void this.routeFor(user);
    });
  }

  private async routeFor(user: User): Promise<void> {
    const allowed = await this.auth.refreshAdmin(user);
    if (this.auth.user()?.uid !== user.uid) {
      return;
    }
    await this.router.navigateByUrl(allowed ? '/admin' : '/admin/denied');
  }

  async continueWithGoogle(): Promise<void> {
    this.busy.set(true);
    try {
      const result = await this.auth.signInWithGoogle();
      const allowed = await this.auth.refreshAdmin(result.user);
      await this.router.navigateByUrl(allowed ? '/admin' : '/admin/denied');
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'auth/popup-closed-by-user') {
        void this.notifications.info('Sign-in cancelled', 'The Google window was closed.');
      } else if (error instanceof FirebaseError && error.code === 'auth/popup-blocked') {
        void this.notifications.error(
          'Popup blocked',
          'Allow popups for this site, then try Google sign-in again.',
        );
      } else {
        void this.notifications.error(
          'Sign-in failed',
          'Google sign-in did not finish. Check the Auth emulator or the authorized domain.',
        );
      }
    } finally {
      this.busy.set(false);
    }
  }
}
