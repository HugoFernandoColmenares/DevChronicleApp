import { signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import type { User } from 'firebase/auth';

import { AuthService } from '@core/services/auth.service';

import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  const auth = {
    user: signal<User | null | undefined>(undefined),
    isAdmin: signal(false),
    waitForUser: vi.fn<() => Promise<User | null>>(),
    refreshAdmin: vi.fn<(user: User | null) => Promise<boolean>>(),
  };

  beforeEach(() => {
    auth.waitForUser.mockReset();
    auth.refreshAdmin.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  async function activate(): Promise<true | UrlTree> {
    return TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never)) as Promise<
      true | UrlTree
    >;
  }

  it('sends anonymous visitors to the Google sign-in page', async () => {
    auth.waitForUser.mockResolvedValue(null);
    const result = await activate();
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/admin/login');
    expect(auth.refreshAdmin).not.toHaveBeenCalled();
  });

  it('sends a signed-in stranger to the denied page', async () => {
    const user = { uid: 'stranger' } as User;
    auth.waitForUser.mockResolvedValue(user);
    auth.refreshAdmin.mockResolvedValue(false);
    const result = await activate();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/admin/denied');
  });

  it('allows an account listed in admins', async () => {
    const user = { uid: 'author' } as User;
    auth.waitForUser.mockResolvedValue(user);
    auth.refreshAdmin.mockResolvedValue(true);
    await expect(activate()).resolves.toBe(true);
  });
});
