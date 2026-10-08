import { Routes } from '@angular/router';
import { langGuard } from './core/guards/lang.guard';
import { authGuard } from './core/guards/auth.guard';
import { PublicLayoutComponent } from './features/public/layout/public-layout.component';
import { HomeComponent } from './features/public/home/home.component';
import { packagesActiveGuard, projectsActiveGuard } from './core/guards/section-active.guard';

export const routes: Routes = [
  // Redirect root to /ar
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'ar',
  },
  // Admin Login (MUST BE BEFORE :lang TO PREVENT langGuard HIJACKING)
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  // Admin Dashboard (Protected by authGuard - MUST BE BEFORE :lang)
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'products',
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/admin/products/admin-products.component').then(
            (m) => m.AdminProductsComponent
          ),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./features/admin/products/admin-product-form.component').then(
            (m) => m.AdminProductFormComponent
          ),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./features/admin/products/admin-product-form.component').then(
            (m) => m.AdminProductFormComponent
          ),
      },
      {
        path: 'products/:id',
        loadComponent: () =>
          import('./features/admin/products/admin-product-form.component').then(
            (m) => m.AdminProductFormComponent
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/admin/overview/admin-overview.component').then(
            (m) => m.AdminOverviewComponent
          ),
      },
      {
        path: 'overview',
        redirectTo: 'analytics',
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/admin/categories/admin-categories.component').then(
            (m) => m.AdminCategoriesComponent
          ),
      },
      {
        path: 'packages',
        loadComponent: () =>
          import('./features/admin/packages/admin-packages.component').then(
            (m) => m.AdminPackagesComponent
          ),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/admin/projects/admin-projects.component').then(
            (m) => m.AdminProjectsComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/admin/settings/admin-settings.component').then(
            (m) => m.AdminSettingsComponent
          ),
      },
    ],
  },
  // Public storefront routes
  {
    path: ':lang',
    component: PublicLayoutComponent,
    canActivate: [langGuard],
    children: [
      {
        path: '',
        component: HomeComponent,
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/public/products/products-list.component').then(
            (m) => m.ProductsListComponent
          ),
      },
      {
        path: 'products/:slug',
        loadComponent: () =>
          import('./features/public/products/product-detail.component').then(
            (m) => m.ProductDetailComponent
          ),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./features/public/cart/cart-page.component').then((m) => m.CartPageComponent),
      },
      {
        path: 'packages',
        loadComponent: () =>
          import('./features/public/packages/packages-list.component').then(
            (m) => m.PackagesListComponent
          ),
        canActivate: [packagesActiveGuard],
      },
      {
        path: 'packages/:slug',
        loadComponent: () =>
          import('./features/public/packages/package-detail.component').then(
            (m) => m.PackageDetailComponent
          ),
        canActivate: [packagesActiveGuard],
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/public/projects/projects-list.component').then(
            (m) => m.ProjectsListComponent
          ),
        canActivate: [projectsActiveGuard],
      },
      {
        path: 'projects/:slug',
        loadComponent: () =>
          import('./features/public/projects/project-detail.component').then(
            (m) => m.ProjectDetailComponent
          ),
        canActivate: [projectsActiveGuard],
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/public/about/about.component').then((m) => m.AboutComponent),
      },
      {
        path: 'consultant',
        loadComponent: () =>
          import('./features/public/ai-consultant/ai-consultant.component').then(
            (m) => m.AiConsultantComponent
          ),
      },
      {
        path: 'ai-consultant',
        redirectTo: 'consultant',
      },
      {
        path: '404',
        loadComponent: () =>
          import('./features/public/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
      // Any other unrecognized route inside :lang -> redirect to :lang/404
      {
        path: '**',
        redirectTo: '404',
      },
    ],
  },
  // Fallback -> redirect to /ar/404
  {
    path: '**',
    redirectTo: 'ar/404',
  },
];
