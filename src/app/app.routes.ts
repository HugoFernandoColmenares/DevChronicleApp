import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing').then((m) => m.LandingComponent),
  },
  {
    path: 'post/:slug',
    loadComponent: () =>
      import('./features/article-viewer/article-viewer').then((m) => m.ArticleViewerComponent),
  },
  { path: '**', redirectTo: '' },
];
