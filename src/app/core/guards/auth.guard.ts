import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { of, map, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Server has no access to the browser session; the real check runs in the browser.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // 1. If admin is synchronously logged in from memory/storage:
  if (auth.isAdmin()) {
    return true;
  }

  // 2. If token exists in storage, verify session asynchronously without kicking out:
  if (auth.hasToken()) {
    return auth.verifySession().pipe(
      map((isValid) => {
        if (isValid) {
          return true;
        }
        router.navigate(['/admin/login']);
        return false;
      }),
      catchError(() => {
        router.navigate(['/admin/login']);
        return of(false);
      })
    );
  }

  // 3. Not logged in and no token exists
  router.navigate(['/admin/login']);
  return false;
};
