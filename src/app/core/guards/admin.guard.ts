import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@core/services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await auth.waitForUser();

  if (!user) {
    return router.createUrlTree(['/admin/login']);
  }

  const allowed = await auth.refreshAdmin(user);
  return allowed ? true : router.createUrlTree(['/admin/denied']);
};
