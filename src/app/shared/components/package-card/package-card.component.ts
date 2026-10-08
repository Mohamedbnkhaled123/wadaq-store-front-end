import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Package } from '../../../core/models/models';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { LanguageService } from '../../../core/services/language.service';
import { LocalizePipe } from '../../pipes/localize.pipe';

@Component({
  selector: 'app-package-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoDirective, LocalizePipe],
  templateUrl: './package-card.component.html',
  styleUrl: './package-card.component.css',
})
export class PackageCardComponent {
  @Input({ required: true }) pkg!: Package;

  whatsappService = inject(WhatsappService);
  langService = inject(LanguageService);

  get whatsappUrl(): string {
    return this.whatsappService.buildPackageLink(this.pkg, this.langService.currentLang());
  }
}
