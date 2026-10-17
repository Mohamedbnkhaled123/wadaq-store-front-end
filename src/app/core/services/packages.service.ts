import { inject, Injectable, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Observable, of, tap } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { Package } from '../models/models';

export const PACKAGES_STATE_KEY = makeStateKey<Package[]>('wadaq_ssr_packages_key');

interface CacheEntry<T> {
  data: ApiResponse<T>;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class PackagesService {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);

  private readonly STORAGE_KEY = 'wadaq_packages_cache_v2';
  private readonly defaultTtlMs = 24 * 60 * 60 * 1000; // 24 hours

  private listCache = new Map<string, CacheEntry<Package[]>>();
  private itemCache = new Map<string, CacheEntry<Package>>();

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    // 1. SSR TransferState hydration
    if (isPlatformBrowser(this.platformId) && this.transferState.hasKey(PACKAGES_STATE_KEY)) {
      try {
        const ssrPackages = this.transferState.get(PACKAGES_STATE_KEY, []);
        if (Array.isArray(ssrPackages) && ssrPackages.length > 0) {
          const entry: CacheEntry<Package[]> = {
            data: { success: true, data: ssrPackages },
            expiresAt: Date.now() + this.defaultTtlMs,
          };
          this.listCache.set('public', entry);
          ssrPackages.forEach((pkg) => {
            const single = { data: { success: true, data: pkg }, expiresAt: Date.now() + this.defaultTtlMs };
            if (pkg._id) this.itemCache.set(pkg._id, single);
            if (pkg.slug?.ar) this.itemCache.set(pkg.slug.ar, single);
            if (pkg.slug?.en) this.itemCache.set(pkg.slug.en, single);
          });
        }
      } catch {
        // Safe fallback
      }
    }

    // 2. LocalStorage hydration
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const now = Date.now();
      if (parsed && parsed.timestamp && now - parsed.timestamp < this.defaultTtlMs) {
        if (parsed.publicList) {
          this.listCache.set('public', { data: parsed.publicList, expiresAt: parsed.timestamp + this.defaultTtlMs });
        }
        if (parsed.allList) {
          this.listCache.set('all', { data: parsed.allList, expiresAt: parsed.timestamp + this.defaultTtlMs });
        }
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch {
      // Storage unavailable or corrupted
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const payload = {
        timestamp: Date.now(),
        publicList: this.listCache.get('public')?.data || null,
        allList: this.listCache.get('all')?.data || null,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage quota or restriction
    }
  }

  clearCache(): void {
    this.listCache.clear();
    this.itemCache.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch {}
    }
  }

  getPackages(all = false, forceRefresh = false): Observable<ApiResponse<Package[]>> {
    const key = all ? 'all' : 'public';
    const entry = this.listCache.get(key);
    if (!forceRefresh && entry && Date.now() < entry.expiresAt) {
      return of(entry.data);
    }

    return this.api.get<Package[]>('/packages', { all }, false).pipe(
      tap((res) => {
        if (res.success && Array.isArray(res.data)) {
          this.listCache.set(key, {
            data: res,
            expiresAt: Date.now() + this.defaultTtlMs,
          });

          res.data.forEach((pkg) => {
            const single = { data: { success: true, data: pkg }, expiresAt: Date.now() + this.defaultTtlMs };
            if (pkg._id) this.itemCache.set(pkg._id, single);
            if (pkg.slug?.ar) this.itemCache.set(pkg.slug.ar, single);
            if (pkg.slug?.en) this.itemCache.set(pkg.slug.en, single);
          });

          this.saveToStorage();

          if (isPlatformServer(this.platformId) && !all && res.data) {
            this.transferState.set(PACKAGES_STATE_KEY, res.data);
          }
        }
      })
    );
  }

  getPackageBySlug(slug: string, forceRefresh = false): Observable<ApiResponse<Package>> {
    const trimmed = slug.trim();
    const entry = this.itemCache.get(trimmed) || this.itemCache.get(decodeURIComponent(trimmed));
    if (!forceRefresh && entry && Date.now() < entry.expiresAt) {
      return of(entry.data);
    }

    return this.api.get<Package>(`/packages/${encodeURIComponent(trimmed)}`, undefined, false).pipe(
      tap((res) => {
        if (res.success && res.data) {
          const single = { data: res, expiresAt: Date.now() + this.defaultTtlMs };
          if (res.data._id) this.itemCache.set(res.data._id, single);
          if (res.data.slug?.ar) this.itemCache.set(res.data.slug.ar, single);
          if (res.data.slug?.en) this.itemCache.set(res.data.slug.en, single);
        }
      })
    );
  }

  createPackage(data: Partial<Package>): Observable<ApiResponse<Package>> {
    return this.api.post<Package>('/packages', data).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  updatePackage(id: string, data: Partial<Package>): Observable<ApiResponse<Package>> {
    return this.api.put<Package>(`/packages/${id}`, data).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  togglePackage(id: string): Observable<ApiResponse<Package>> {
    return this.api.patch<Package>(`/packages/${id}/toggle`).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  deletePackage(id: string): Observable<ApiResponse<Package>> {
    return this.api.delete<Package>(`/packages/${id}`).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }
}
