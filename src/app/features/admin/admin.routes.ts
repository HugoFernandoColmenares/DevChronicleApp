import { Routes } from '@angular/router';

import { adminGuard } from '@core/guards/admin.guard';
import { unsavedChangesGuard } from '@core/guards/unsaved-changes.guard';

export const adminRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./admin-login').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'denied',
    loadComponent: () => import('./admin-denied').then((m) => m.AdminDeniedComponent),
  },
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin-list').then((m) => m.AdminListComponent),
  },
  {
    path: 'new',
    canActivate: [adminGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./admin-editor').then((m) => m.AdminEditorComponent),
  },
  {
    path: 'edit/:slug',
    canActivate: [adminGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./admin-editor').then((m) => m.AdminEditorComponent),
  },
];
