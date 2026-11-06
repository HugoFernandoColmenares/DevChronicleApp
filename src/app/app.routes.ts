import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing').then((m) => m.LandingComponent),
  },
  {
    path: 'articles',
    loadComponent: () => import('./features/articles/articles').then((m) => m.ArticlesComponent),
  },
  {
    path: 'articulos',
    redirectTo: 'articles',
  },
  {
    path: 'post/:slug',
    loadComponent: () =>
      import('./features/article-viewer/article-viewer').then((m) => m.ArticleViewerComponent),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: '404',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
  },
];
