import { inject, Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';
import { LocalizedString } from '../../core/models/models';

@Pipe({
  name: 'localize',
  standalone: true,
  pure: false,
})
export class LocalizePipe implements PipeTransform {
  private langService = inject(LanguageService);

  transform(value: LocalizedString | undefined | null, fallback = ''): string {
    if (!value) return fallback;
    const current = this.langService.currentLang();
    return value[current] || value.ar || value.en || fallback;
  }
}
