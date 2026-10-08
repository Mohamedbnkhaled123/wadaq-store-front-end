import { inject, Injectable, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Observable, of, tap } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { Package } from '../models/models';

export const PACKAGES_STATE_KEY = makeStateKey<Package[]>('wadaq_ssr_packages_key');

@Injectable({ providedIn: 'root' })
export class PackagesService {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);

  private cachedPackages: ApiResponse<Package[]> | null = null;
  private cacheExpiresAt = 0;
  private readonly ttlMs = 10 * 60 * 1000;

  constructor() {
    if (isPlatformBrowser(this.platformId) && this.transferState.hasKey(PACKAGES_STATE_KEY)) {
      try {
        const ssrPackages = this.transferState.get(PACKAGES_STATE_KEY, []);
        if (Array.isArray(ssrPackages) && ssrPackages.length > 0) {
          this.cachedPackages = { success: true, data: ssrPackages };
          this.cacheExpiresAt = Date.now() + this.ttlMs;
        }
      } catch {
        // Safe fallback
      }
    }
  }

  getPackages(all = false): Observable<ApiResponse<Package[]>> {
    if (!all && this.cachedPackages && Date.now() < this.cacheExpiresAt) {
      return of(this.cachedPackages);
    }

    return this.api.get<Package[]>('/packages', { all }, false).pipe(
      tap((res) => {
        if (!all && res.success && Array.isArray(res.data)) {
          this.cachedPackages = res;
          this.cacheExpiresAt = Date.now() + this.ttlMs;
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(PACKAGES_STATE_KEY, res.data);
          }
        }
      })
    );
  }

  getPackageBySlug(slug: string): Observable<ApiResponse<Package>> {
    return this.api.get<Package>(`/packages/${encodeURIComponent(slug)}`, undefined, false);
  }

  createPackage(data: Partial<Package>): Observable<ApiResponse<Package>> {
    this.cachedPackages = null;
    return this.api.post<Package>('/packages', data);
  }

  updatePackage(id: string, data: Partial<Package>): Observable<ApiResponse<Package>> {
    this.cachedPackages = null;
    return this.api.put<Package>(`/packages/${id}`, data);
  }

  togglePackage(id: string): Observable<ApiResponse<Package>> {
    this.cachedPackages = null;
    return this.api.patch<Package>(`/packages/${id}/toggle`);
  }

  deletePackage(id: string): Observable<ApiResponse<Package>> {
    this.cachedPackages = null;
    return this.api.delete<Package>(`/packages/${id}`);
  }
}
