import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { SettingsService } from '../../../core/services/settings.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { LocalizePipe } from '../../../shared/pipes/localize.pipe';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TranslocoDirective, LocalizePipe],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent implements OnInit {
  settingsService = inject(SettingsService);
  private whatsappService = inject(WhatsappService);
  langService = inject(LanguageService);
  private seo = inject(SeoService);

  get whatsappUrl(): string {
    return this.whatsappService.buildCustomInquiryLink('', this.langService.currentLang());
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'عن متجر ودق — حلول وأدوات التكامل الحسي',
      description: 'تعرف على قصة ورسالة ودق للتنمية والتدريب في دعم أخصائيي العلاج الوظيفي وتجهيز المراكز المتخصصة لذوي الهمم والتوحد بأرقى المعايير.',
      path: `/${this.langService.currentLang()}/about`,
      arSlug: 'about',
      enSlug: 'about',
    });
  }
}
