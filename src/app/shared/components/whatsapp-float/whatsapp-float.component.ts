import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-whatsapp-float',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whatsapp-float.component.html',
  styleUrl: './whatsapp-float.component.css',
})
export class WhatsappFloatComponent {
  whatsappService = inject(WhatsappService);
  langService = inject(LanguageService);

  get whatsappUrl(): string {
    return this.whatsappService.buildCustomInquiryLink('', this.langService.currentLang());
  }
}
