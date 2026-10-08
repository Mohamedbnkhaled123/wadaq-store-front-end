import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LanguageService } from '../../../core/services/language.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslocoDirective],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  langService = inject(LanguageService);
  cartService = inject(CartService);
  authService = inject(AuthService);
  settingsService = inject(SettingsService);
  themeService = inject(ThemeService);

  private router = inject(Router);
  private logoClickCount = 0;
  private logoClickTimer: any = null;

  mobileMenuOpen = signal<boolean>(false);
  isLangFlipping = signal<boolean>(false);

  onLanguageToggle(): void {
    if (this.isLangFlipping()) return;
    this.isLangFlipping.set(true);
    this.langService.toggleLanguage();
    setTimeout(() => {
      this.isLangFlipping.set(false);
    }, 600);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  logoUrl(): string {
    const sLogo = this.settingsService.settings()?.logo;
    return sLogo || '/images/logo.png';
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.includes('logo.png')) {
      img.src = '/images/logo.png';
    }
  }

  onLogoClick(event: MouseEvent): void {
    // 1. Prevent default routerLink navigation immediately on every click
    event.preventDefault();
    event.stopPropagation();

    this.logoClickCount++;
    clearTimeout(this.logoClickTimer);

    // 2. If 3 clicks reached (or native triple-click event.detail >= 3)
    if (this.logoClickCount >= 3 || event.detail >= 3) {
      this.logoClickCount = 0;
      if (this.authService.isAdmin()) {
        this.router.navigateByUrl('/admin/products');
      } else {
        this.router.navigateByUrl('/admin/login');
      }
      return;
    }

    // 3. If single/double click, wait 450ms for possible next click.
    // If no further clicks arrive, navigate normally to the home page!
    this.logoClickTimer = setTimeout(() => {
      this.logoClickCount = 0;
      this.router.navigateByUrl(`/${this.langService.currentLang()}`);
    }, 450);
  }
}
