import { inject, Injectable, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Observable, of, tap } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { Category } from '../models/models';

export const CATEGORIES_STATE_KEY = makeStateKey<Category[]>('wadaq_ssr_categories_key');

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);
  private readonly STORAGE_KEY = 'wadaq_categories_cache_v1';
  private readonly defaultTtlMs = 15 * 60 * 1000; // 15 mins

  private cache = new Map<string, { data: ApiResponse<Category[]>; expiresAt: number }>();

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    // 1. SSR TransferState absorption
    if (isPlatformBrowser(this.platformId) && this.transferState.hasKey(CATEGORIES_STATE_KEY)) {
      try {
        const ssrCats = this.transferState.get(CATEGORIES_STATE_KEY, []);
        if (Array.isArray(ssrCats) && ssrCats.length > 0) {
          this.cache.set('public', {
            data: { success: true, data: ssrCats },
            expiresAt: Date.now() + this.defaultTtlMs,
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
      if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < this.defaultTtlMs) {
        if (parsed.publicList) {
          this.cache.set('public', { data: parsed.publicList, expiresAt: parsed.timestamp + this.defaultTtlMs });
        }
        if (parsed.allList) {
          this.cache.set('all', { data: parsed.allList, expiresAt: parsed.timestamp + this.defaultTtlMs });
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
      const publicEntry = this.cache.get('public');
      const allEntry = this.cache.get('all');
      const payload = {
        timestamp: Date.now(),
        publicList: publicEntry?.data || null,
        allList: allEntry?.data || null,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage quota or restriction
    }
  }

  getCachedSync(all = false): ApiResponse<Category[]> | null {
    const key = all ? 'all' : 'public';
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data;
    }
    return null;
  }

  getCategories(all = false, forceRefresh = false): Observable<ApiResponse<Category[]>> {
    const key = all ? 'all' : 'public';
    const entry = this.cache.get(key);
    if (!forceRefresh && entry && Date.now() < entry.expiresAt) {
      return of(entry.data);
    }

    return this.api.get<Category[]>('/categories', { all }, false).pipe(
      tap((res) => {
        if (res.success && Array.isArray(res.data)) {
          this.cache.set(key, {
            data: res,
            expiresAt: Date.now() + this.defaultTtlMs,
          });
          this.saveToStorage();

          if (isPlatformServer(this.platformId) && !all && res.data) {
            this.transferState.set(CATEGORIES_STATE_KEY, res.data);
          }
        }
      })
    );
  }

  clearCache(): void {
    this.cache.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  createCategory(data: Partial<Category>): Observable<ApiResponse<Category>> {
    return this.api.post<Category>('/categories', data).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  updateCategory(id: string, data: Partial<Category>): Observable<ApiResponse<Category>> {
    return this.api.put<Category>(`/categories/${id}`, data).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  toggleCategory(id: string): Observable<ApiResponse<Category>> {
    return this.api.patch<Category>(`/categories/${id}/toggle`).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  deleteCategory(id: string): Observable<ApiResponse<Category>> {
    return this.api.delete<Category>(`/categories/${id}`).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  restoreCategory(id: string): Observable<ApiResponse<Category>> {
    return this.api.patch<Category>(`/categories/${id}/restore`).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }
}

