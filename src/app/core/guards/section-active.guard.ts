import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { SettingsService } from '../services/settings.service';
import { LanguageService } from '../services/language.service';
import { map, catchError, of } from 'rxjs';

/** Guard that protects the Sensory Room Packages routes when deactivated by admin */
export const packagesActiveGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const settingsService = inject(SettingsService);
  const router = inject(Router);
  const langService = inject(LanguageService);

  const lang = route.parent?.paramMap.get('lang') || langService.currentLang() || 'ar';

  if (settingsService.settings() !== null) {
    if (!settingsService.showPackagesSection()) {
      router.navigate(['/', lang, '404'], { replaceUrl: true });
      return false;
    }
    return true;
  }

  return settingsService.getSettings().pipe(
    map(() => {
      if (!settingsService.showPackagesSection()) {
        router.navigate(['/', lang, '404'], { replaceUrl: true });
        return false;
      }
      return true;
    }),
    catchError(() => {
      if (!settingsService.showPackagesSection()) {
        router.navigate(['/', lang, '404'], { replaceUrl: true });
        return of(false);
      }
      return of(true);
    })
  );
};

/** Guard that protects the Projects / Showcase routes when deactivated by admin */
export const projectsActiveGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const settingsService = inject(SettingsService);
  const router = inject(Router);
  const langService = inject(LanguageService);

  const lang = route.parent?.paramMap.get('lang') || langService.currentLang() || 'ar';

  if (settingsService.settings() !== null) {
    if (!settingsService.showProjectsSection()) {
      router.navigate(['/', lang, '404'], { replaceUrl: true });
      return false;
    }
    return true;
  }

  return settingsService.getSettings().pipe(
    map(() => {
      if (!settingsService.showProjectsSection()) {
        router.navigate(['/', lang, '404'], { replaceUrl: true });
        return false;
      }
      return true;
    }),
    catchError(() => {
      if (!settingsService.showProjectsSection()) {
        router.navigate(['/', lang, '404'], { replaceUrl: true });
        return of(false);
      }
      return of(true);
    })
  );
};
