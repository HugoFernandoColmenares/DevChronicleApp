import { Injectable, signal } from '@angular/core';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { firebaseAuth } from '@core/firebase/auth';
import { firebaseFirestore } from '@core/firebase/firestore';

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

  signOut(): Promise<void> {
    this.isAdmin.set(false);
    return signOut(this.auth);
  }
}
