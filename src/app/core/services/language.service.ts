import { inject, Injectable, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';

export type LanguageCode = 'ar' | 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private transloco = inject(TranslocoService);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  public currentLang = signal<LanguageCode>('ar');
  public currentDir = signal<'rtl' | 'ltr'>('rtl');

  constructor() {
    this.initLanguage();
  }

  private initLanguage(): void {
    if (isPlatformBrowser(this.platformId)) {
      const pathLang = window.location.pathname.split('/')[1];
      if (pathLang === 'en' || pathLang === 'ar') {
        this.setLanguage(pathLang);
        return;
      }

      const savedLang = localStorage.getItem('wadaq_lang') as LanguageCode;
      if (savedLang === 'en' || savedLang === 'ar') {
        this.setLanguage(savedLang);
        return;
      }
    }

    this.setLanguage('ar');
  }

  public setLanguage(lang: LanguageCode): void {
    this.currentLang.set(lang);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.currentDir.set(dir);

    this.transloco.setActiveLang(lang);

    const htmlEl = this.document.documentElement;
    if (htmlEl) {
      htmlEl.setAttribute('lang', lang);
      htmlEl.setAttribute('dir', dir);
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('wadaq_lang', lang);
    }
  }

  private isFlipping = false;

  public toggleLanguage(): void {
    if (this.isFlipping) return;
    this.isFlipping = true;

    const nextLang: LanguageCode = this.currentLang() === 'ar' ? 'en' : 'ar';

    if (isPlatformBrowser(this.platformId)) {
      const target = (this.document.querySelector('.site-main') || this.document.body) as HTMLElement;
      target.classList.remove('page-flip-effect');
      void target.offsetWidth;
      target.classList.add('page-flip-effect');

      setTimeout(() => {
        this.setLanguage(nextLang);
        this.syncUrl(nextLang);
      }, 240);

      setTimeout(() => {
        target.classList.remove('page-flip-effect');
        this.isFlipping = false;
      }, 580);
    } else {
      this.setLanguage(nextLang);
      this.isFlipping = false;
    }
  }

  private syncUrl(nextLang: LanguageCode): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const currentPath = window.location.pathname;
    const segments = currentPath.split('/');
    if (segments[1] === 'ar' || segments[1] === 'en') {
      segments[1] = nextLang;
      const newPath = segments.join('/') + window.location.search + window.location.hash;
      window.history.replaceState(null, '', newPath);
    }
  }
}
