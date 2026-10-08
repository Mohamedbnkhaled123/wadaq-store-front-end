import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'wadaq_theme';

  public currentTheme = signal<Theme>('light');
  public isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
      if (saved === 'light' || saved === 'dark') {
        this.setTheme(saved, false);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(prefersDark ? 'dark' : 'light', false);
      }

      // Listen to OS theme changes if user hasn't set explicit preference
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const hasManual = localStorage.getItem(this.STORAGE_KEY);
        if (!hasManual) {
          this.setTheme(e.matches ? 'dark' : 'light', false);
        }
      });
    } catch {
      this.setTheme('light', false);
    }
  }

  public toggleTheme(): void {
    const nextTheme: Theme = this.currentTheme() === 'dark' ? 'light' : 'dark';

    if (typeof document !== 'undefined') {
      const docEl = document.documentElement;
      docEl.classList.add('theme-transitioning');

      if ('startViewTransition' in document && typeof (document as any).startViewTransition === 'function') {
        (document as any).startViewTransition(() => {
          this.setTheme(nextTheme, true);
        });
      } else {
        this.setTheme(nextTheme, true);
      }

      setTimeout(() => {
        docEl.classList.remove('theme-transitioning');
      }, 500);
    } else {
      this.setTheme(nextTheme, true);
    }
  }

  public setTheme(theme: Theme, persist = true): void {
    this.currentTheme.set(theme);

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      
      // Update theme-color meta tag for mobile browser address bars
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#0B141A' : '#165E74');
      }
    }

    if (persist && typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, theme);
      } catch {}
    }
  }
}
