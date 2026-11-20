import { Injectable, signal } from '@angular/core';
import {
  User,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { firebaseAuth } from '@core/firebase/auth';
import { firebaseFirestore } from '@core/firebase/firestore';
import { environment } from '@env';

/** Seeded by `npm run seed:admin` for local Auth emulator flows and Playwright. */
export const EMULATOR_ADMIN_EMAIL = 'admin@devchronicle.test';
export const EMULATOR_ADMIN_UID = 'local-admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = firebaseAuth();
  private settled = false;
  private resolveReady!: (user: User | null) => void;
  private readonly ready = new Promise<User | null>((resolve) => {
    this.resolveReady = resolve;
  });

  readonly user = signal<User | null | undefined>(undefined);
  readonly isAdmin = signal(false);
  readonly emulatorAuth = environment.useEmulators;

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      if (!this.settled) {
        this.settled = true;
        this.resolveReady(user);
      }
      void this.refreshAdmin(user);
    });
  }

  waitForUser(): Promise<User | null> {
    const current = this.user();
    if (current !== undefined) {
      return Promise.resolve(current);
    }
    return this.ready;
  }

  async refreshAdmin(user: User | null = this.user() ?? null): Promise<boolean> {
    if (!user) {
      this.isAdmin.set(false);
      return false;
    }

    try {
      const admin = await getDoc(doc(firebaseFirestore(), 'admins', user.uid));
      const allowed = admin.exists();
      this.isAdmin.set(allowed);
      return allowed;
    } catch {
      this.isAdmin.set(false);
      return false;
    }
  }

  signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(this.auth, provider);
  }

  /**
   * Emulator-only Google credential for the seeded author. Avoids the Auth emulator popup widget
   * in automated smoke tests.
   */
  signInEmulatorAdmin() {
    if (!environment.useEmulators) {
      return Promise.reject(new Error('Emulator sign-in is only available in local development.'));
    }

    const credential = GoogleAuthProvider.credential(
      JSON.stringify({
        sub: EMULATOR_ADMIN_UID,
        email: EMULATOR_ADMIN_EMAIL,
        email_verified: true,
        name: environment.authorName,
      }),
    );
    return signInWithCredential(this.auth, credential);
  }

  signOut(): Promise<void> {
    this.isAdmin.set(false);
    return signOut(this.auth);
  }
}
