import { inject, Injectable, signal, computed, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Observable, of, tap, catchError, timeout, shareReplay, finalize } from 'rxjs';
import { ApiService } from './api.service';
import { Settings } from '../models/models';

export const SETTINGS_STATE_KEY = makeStateKey<Settings>('wadaq_ssr_settings_key');

export const DEFAULT_SETTINGS: Settings = {
  logo: '/images/logo.png',
  whatsappNumber: '201000000000',
  phone: '01000000000',
  email: 'info@wadaq-store.com',
  address: { ar: 'القاهرة، مصر', en: 'Cairo, Egypt' },
  currency: 'ج.م',
  shippingNote: {
    ar: 'يضاف مصاريف الشحن حسب المحافظة وموقع التوصيل',
    en: 'Shipping fees will be added based on governorate and delivery location',
  },
  social: {},
  hero: {
    title: { ar: 'بيئة حسية متكاملة تنبض بالحياة والتعلم', en: 'Integrated Sensory Environments' },
    subtitle: {
      ar: 'أكبر متجر عربي متخصص في أدوات التكامل الحسي وتجهيز غرف التأهيل الحسي للأطفال والمراكز المتخصصة',
      en: 'The leading Arabic store specialized in sensory integration and therapy rooms',
    },
    ctaPrimary: { ar: 'تصفح المنتجات', en: 'Browse Products' },
    ctaSecondary: { ar: 'استشر الذكاء الاصطناعي', en: 'Consult AI' },
  },
  about: {
    title: { ar: 'رواد تجهيز البيئات الحسية', en: 'Pioneers in Sensory Environments' },
    content: {
      ar: 'نقدم حلولاً وأدوات حسية مبتكرة مصممة بعناية لتنمية المهارات وتطوير الحواس.',
      en: 'We provide innovative sensory solutions crafted to empower sensory skills.',
    },
    mission: {
      ar: 'تمكين الأطفال والمراكز من بيئات علاجية حسية متكاملة وفق أعلى المعايير.',
      en: 'Empowering children and centers with integrated sensory environments.',
    },
    vision: {
      ar: 'أن نكون الوجهة الأولى في العالم العربي في حلول التكامل الحسي.',
      en: 'To be the premier destination in the Arab world for sensory solutions.',
    },
  },
  stats: [],
  customProductCta: {
    title: { ar: 'لم تجد ما تبحث عنه؟', en: "Didn't find what you need?" },
    description: {
      ar: 'نصنع لك أي أداة أو جهاز حسي بمقاسات ومواصفات خاصة تناسب مركزك أو منزلك',
      en: 'We manufacture custom sensory tools tailored for your space',
    },
    buttonText: { ar: 'طلب تفصيل مخصص', en: 'Request Custom Order' },
  },
  showPackagesSection: true,
  showProjectsSection: true,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);
  private settingsRequest$: Observable<any> | null = null;

  private readonly SETTINGS_STORAGE_KEY = 'wadaq_settings_cache_v2';
  private readonly defaultTtlMs = 24 * 60 * 60 * 1000; // 24 hours
  private cacheExpiresAt = 0;
  private readonly PKG_SECTION_KEY = 'wadaq_section_packages';
  private readonly PROJ_SECTION_KEY = 'wadaq_section_projects';

  public settings = signal<Settings | null>(this.getInitialSettings());

  private localPackagesActive = signal<boolean>(
    this.settings()?.showPackagesSection ??
      (typeof window !== 'undefined' && localStorage.getItem(this.PKG_SECTION_KEY) !== null
        ? localStorage.getItem(this.PKG_SECTION_KEY) === 'true'
        : true)
  );

  private localProjectsActive = signal<boolean>(
    this.settings()?.showProjectsSection ??
      (typeof window !== 'undefined' && localStorage.getItem(this.PROJ_SECTION_KEY) !== null
        ? localStorage.getItem(this.PROJ_SECTION_KEY) === 'true'
        : true)
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Absorb SSR TransferState if present
      if (this.transferState.hasKey(SETTINGS_STATE_KEY)) {
        try {
          const ssrSettings = this.transferState.get(SETTINGS_STATE_KEY, null);
          if (ssrSettings) {
            this.applySettings(ssrSettings);
          }
        } catch {
          // Safe fallback
        }
      }
    }
  }

  private getInitialSettings(): Settings | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.settings && parsed.timestamp) {
            this.cacheExpiresAt = parsed.timestamp + this.defaultTtlMs;
            return parsed.settings as Settings;
          }
          this.cacheExpiresAt = Date.now() + this.defaultTtlMs;
          return parsed as Settings;
        }
      }
    } catch {
      // Safe fallback
    }
    return null;
  }

  private applySettings(data: Settings): void {
    this.settings.set(data);
    this.cacheExpiresAt = Date.now() + this.defaultTtlMs;
    if (data.showPackagesSection !== undefined) {
      this.setLocalPackageSection(data.showPackagesSection);
    }
    if (data.showProjectsSection !== undefined) {
      this.setLocalProjectSection(data.showProjectsSection);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          this.SETTINGS_STORAGE_KEY,
          JSON.stringify({
            timestamp: Date.now(),
            settings: data,
          })
        );
      } catch {}
    }
  }

  public showPackagesSection = computed(() => {
    const s = this.settings();
    if (s && s.showPackagesSection !== undefined) {
      return s.showPackagesSection;
    }
    return this.localPackagesActive();
  });

  public showProjectsSection = computed(() => {
    const s = this.settings();
    if (s && s.showProjectsSection !== undefined) {
      return s.showProjectsSection;
    }
    return this.localProjectsActive();
  });

  getSettings(forceRefresh = false): Observable<any> {
    if (!forceRefresh && this.settings() && Date.now() < this.cacheExpiresAt) {
      return of({ success: true, data: this.settings() });
    }

    if (this.settings()) {
      if (!this.settingsRequest$) {
        this.fetchSettingsInBackground();
      }
      return of({ success: true, data: this.settings() });
    }

    if (this.settingsRequest$) {
      return this.settingsRequest$;
    }

    return this.fetchSettingsInBackground();
  }

  private fetchSettingsInBackground(): Observable<any> {
    this.settingsRequest$ = this.api.get<Settings>('/settings', undefined, false).pipe(
      timeout(3500),
      tap((res) => {
        if (res.success && res.data) {
          this.applySettings(res.data);
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(SETTINGS_STATE_KEY, res.data);
          }
        }
      }),
      catchError(() => {
        // Fallback gracefully without breaking UI or throwing 500 error to user
        const fallback = this.settings() || DEFAULT_SETTINGS;
        if (!this.settings()) {
          this.applySettings(fallback);
        }
        return of({ success: true, data: fallback });
      }),
      finalize(() => {
        this.settingsRequest$ = null;
      }),
      shareReplay(1)
    );

    return this.settingsRequest$;
  }

  updateSettings(data: Partial<Settings>): Observable<any> {
    this.settingsRequest$ = null;
    if (data.showPackagesSection !== undefined) {
      this.setLocalPackageSection(data.showPackagesSection);
    }
    if (data.showProjectsSection !== undefined) {
      this.setLocalProjectSection(data.showProjectsSection);
    }

    return this.api.put<Settings>('/settings', data).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.applySettings(res.data);
        }
      })
    );
  }

  setPackagesSectionActive(active: boolean): Observable<any> {
    this.setLocalPackageSection(active);
    return this.updateSettings({ showPackagesSection: active });
  }

  setProjectsSectionActive(active: boolean): Observable<any> {
    this.setLocalProjectSection(active);
    return this.updateSettings({ showProjectsSection: active });
  }

  private setLocalPackageSection(active: boolean): void {
    this.localPackagesActive.set(active);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.PKG_SECTION_KEY, active ? 'true' : 'false');
      } catch {}
    }
  }

  private setLocalProjectSection(active: boolean): void {
    this.localProjectsActive.set(active);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.PROJ_SECTION_KEY, active ? 'true' : 'false');
      } catch {}
    }
  }
}
