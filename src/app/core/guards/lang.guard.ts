import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { LanguageService, LanguageCode } from '../services/language.service';

export const langGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const langService = inject(LanguageService);

  const lang = route.paramMap.get('lang') as LanguageCode;

  if (lang === 'ar' || lang === 'en') {
    langService.setLanguage(lang);
    return true;
  }

  // If path is admin or starts with admin, do not intercept
  if ((lang as string) === 'admin') {
    return false;
  }

  // Redirect to Arabic default
  router.navigate(['/ar']);
  return false;
};
