import { inject, Injectable, signal, computed, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Observable, of, tap, shareReplay } from 'rxjs';
import { ApiService } from './api.service';
import { Settings } from '../models/models';

export const SETTINGS_STATE_KEY = makeStateKey<Settings>('wadaq_ssr_settings_key');

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);
  private settingsRequest$: Observable<any> | null = null;

  public settings = signal<Settings | null>(null);

  // Local storage keys for resilient section visibility persistence
  private readonly PKG_SECTION_KEY = 'wadaq_section_packages';
  private readonly PROJ_SECTION_KEY = 'wadaq_section_projects';

  private localPackagesActive = signal<boolean>(
    typeof window !== 'undefined'
      ? localStorage.getItem('wadaq_section_packages') !== 'false'
      : true
  );

  private localProjectsActive = signal<boolean>(
    typeof window !== 'undefined'
      ? localStorage.getItem('wadaq_section_projects') !== 'false'
      : true
  );

  constructor() {
    if (isPlatformBrowser(this.platformId) && this.transferState.hasKey(SETTINGS_STATE_KEY)) {
      try {
        const ssrSettings = this.transferState.get(SETTINGS_STATE_KEY, null);
        if (ssrSettings) {
          this.settings.set(ssrSettings);
          if (ssrSettings.showPackagesSection !== undefined) {
            this.setLocalPackageSection(ssrSettings.showPackagesSection);
          }
          if (ssrSettings.showProjectsSection !== undefined) {
            this.setLocalProjectSection(ssrSettings.showProjectsSection);
          }
        }
      } catch {
        // Safe fallback
      }
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

  getSettings(): Observable<any> {
    if (this.settings()) {
      return of({ success: true, data: this.settings() });
    }
    if (this.settingsRequest$) {
      return this.settingsRequest$;
    }
    this.settingsRequest$ = this.api.get<Settings>('/settings', undefined, false).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.settings.set(res.data);
          if (res.data.showPackagesSection !== undefined) {
            this.setLocalPackageSection(res.data.showPackagesSection);
          }
          if (res.data.showProjectsSection !== undefined) {
            this.setLocalProjectSection(res.data.showProjectsSection);
          }
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(SETTINGS_STATE_KEY, res.data);
          }
        }
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
          this.settings.set(res.data);
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
