import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { SettingsService } from '../../../core/services/settings.service';
import { LanguageService } from '../../../core/services/language.service';
import { LocalizePipe } from '../../pipes/localize.pipe';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoDirective, LocalizePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  settingsService = inject(SettingsService);
  langService = inject(LanguageService);

  currentYear = new Date().getFullYear();

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
}
