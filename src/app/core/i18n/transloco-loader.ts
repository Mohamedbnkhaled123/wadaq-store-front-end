import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import arTranslations from '../../../../public/i18n/ar.json';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private http = inject(HttpClient);

  getTranslation(lang: string): Observable<Translation> {
    if (lang === 'ar') {
      return of(arTranslations as unknown as Translation);
    }
    return this.http.get<Translation>(`/i18n/${lang}.json`);
  }
}

