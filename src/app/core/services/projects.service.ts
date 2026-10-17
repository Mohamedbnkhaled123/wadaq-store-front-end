import { inject, Injectable, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Observable, of, tap } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { Project } from '../models/models';

export const PROJECTS_STATE_KEY = makeStateKey<Project[]>('wadaq_ssr_projects_key');

interface CacheEntry<T> {
  data: ApiResponse<T>;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);

  private readonly STORAGE_KEY = 'wadaq_projects_cache_v2';
  private readonly defaultTtlMs = 24 * 60 * 60 * 1000; // 24 hours

  private listCache = new Map<string, CacheEntry<Project[]>>();
  private itemCache = new Map<string, CacheEntry<Project>>();

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    // 1. SSR TransferState hydration
    if (isPlatformBrowser(this.platformId) && this.transferState.hasKey(PROJECTS_STATE_KEY)) {
      try {
        const ssrProjects = this.transferState.get(PROJECTS_STATE_KEY, []);
        if (Array.isArray(ssrProjects) && ssrProjects.length > 0) {
          const entry: CacheEntry<Project[]> = {
            data: { success: true, data: ssrProjects },
            expiresAt: Date.now() + this.defaultTtlMs,
          };
          this.listCache.set('public', entry);
          ssrProjects.forEach((p) => {
            const singleEntry = { data: { success: true, data: p }, expiresAt: Date.now() + this.defaultTtlMs };
            if (p._id) this.itemCache.set(p._id, singleEntry);
            if (p.slug?.ar) this.itemCache.set(p.slug.ar, singleEntry);
            if (p.slug?.en) this.itemCache.set(p.slug.en, singleEntry);
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

  getProjects(all = false, forceRefresh = false): Observable<ApiResponse<Project[]>> {
    const key = all ? 'all' : 'public';
    const entry = this.listCache.get(key);
    if (!forceRefresh && entry && Date.now() < entry.expiresAt) {
      return of(entry.data);
    }

    return this.api.get<Project[]>('/projects', { all }, false).pipe(
      tap((res) => {
        if (res.success && Array.isArray(res.data)) {
          this.listCache.set(key, {
            data: res,
            expiresAt: Date.now() + this.defaultTtlMs,
          });

          res.data.forEach((p) => {
            const itemEntry = { data: { success: true, data: p }, expiresAt: Date.now() + this.defaultTtlMs };
            if (p._id) this.itemCache.set(p._id, itemEntry);
            if (p.slug?.ar) this.itemCache.set(p.slug.ar, itemEntry);
            if (p.slug?.en) this.itemCache.set(p.slug.en, itemEntry);
          });

          this.saveToStorage();

          if (isPlatformServer(this.platformId) && !all && res.data) {
            this.transferState.set(PROJECTS_STATE_KEY, res.data);
          }
        }
      })
    );
  }

  getProjectBySlug(slug: string, forceRefresh = false): Observable<ApiResponse<Project>> {
    const trimmed = slug.trim();
    const entry = this.itemCache.get(trimmed) || this.itemCache.get(decodeURIComponent(trimmed));
    if (!forceRefresh && entry && Date.now() < entry.expiresAt) {
      return of(entry.data);
    }

    return this.api.get<Project>(`/projects/${encodeURIComponent(trimmed)}`, undefined, false).pipe(
      tap((res) => {
        if (res.success && res.data) {
          const itemEntry = { data: res, expiresAt: Date.now() + this.defaultTtlMs };
          if (res.data._id) this.itemCache.set(res.data._id, itemEntry);
          if (res.data.slug?.ar) this.itemCache.set(res.data.slug.ar, itemEntry);
          if (res.data.slug?.en) this.itemCache.set(res.data.slug.en, itemEntry);
        }
      })
    );
  }

  createProject(data: Partial<Project>): Observable<ApiResponse<Project>> {
    return this.api.post<Project>('/projects', data).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  updateProject(id: string, data: Partial<Project>): Observable<ApiResponse<Project>> {
    return this.api.put<Project>(`/projects/${id}`, data).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  toggleProject(id: string, currentActive: boolean): Observable<ApiResponse<Project>> {
    return this.api.put<Project>(`/projects/${id}`, { isActive: !currentActive }).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  deleteProject(id: string): Observable<ApiResponse<Project>> {
    return this.api.delete<Project>(`/projects/${id}`).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }
}

