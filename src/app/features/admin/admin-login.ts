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
  readonly emulatorAuth = this.auth.emulatorAuth;

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
      this.reportSignInFailure(error);
    } finally {
      this.busy.set(false);
    }
  }

  async continueWithEmulatorAdmin(): Promise<void> {
    this.busy.set(true);
    try {
      const result = await this.auth.signInEmulatorAdmin();
      const allowed = await this.auth.refreshAdmin(result.user);
      await this.router.navigateByUrl(allowed ? '/admin' : '/admin/denied');
    } catch (error) {
      this.reportSignInFailure(error);
    } finally {
      this.busy.set(false);
    }
  }

  private reportSignInFailure(error: unknown): void {
    if (error instanceof FirebaseError && error.code === 'auth/popup-closed-by-user') {
      void this.notifications.info('Inicio de sesión cancelado', 'Se cerró la ventana de Google.');
    } else if (error instanceof FirebaseError && error.code === 'auth/popup-blocked') {
      void this.notifications.error(
        'Ventana emergente bloqueada',
        'Permite las ventanas emergentes de este sitio y vuelve a intentar con Google.',
      );
    } else {
      void this.notifications.error(
        'Falló el inicio de sesión',
        'Sign-in did not finish. Check the Auth emulator, seed:admin, or the authorized domain.',
      );
    }
  }
}
