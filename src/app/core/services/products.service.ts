import { inject, Injectable, PLATFORM_ID, signal, TransferState, makeStateKey } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Observable, of, tap } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { Product } from '../models/models';

export const PRODUCTS_STATE_KEY = makeStateKey<Product[]>('wadaq_ssr_products_key');

export interface ProductQueryParams {
  category?: string;
  featured?: boolean;
  q?: string;
  sort?: string;
  page?: number;
  limit?: number;
  all?: boolean;
  status?: string;
}

interface CacheEntry<T> {
  data: ApiResponse<T>;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);

  // In-Memory Caches
  private listCache = new Map<string, CacheEntry<Product[]>>();
  private itemCache = new Map<string, CacheEntry<Product>>();
  private relatedCache = new Map<string, CacheEntry<Product[]>>();
  private masterMap = new Map<string, Product>();

  // Storage key for client-side persistence across page reloads
  private readonly STORAGE_KEY = 'wadaq_products_cache_v2';

  // Reactive Signal of all known cached products (Storefront + Dashboard)
  public cachedProducts = signal<Product[]>([]);
  public isCacheLoaded = signal<boolean>(false);

  // Default TTL: 10 minutes (in ms)
  private readonly defaultTtlMs = 10 * 60 * 1000;

  constructor() {
    this.hydrateFromStorage();
  }

  /**
   * Hydrates in-memory cache from SSR TransferState and browser storage so reload doesn't wipe cache.
   */
  private hydrateFromStorage(): void {
    // 1. First: Check SSR TransferState immediately upon hydration
    if (isPlatformBrowser(this.platformId) && this.transferState.hasKey(PRODUCTS_STATE_KEY)) {
      try {
        const ssrProducts = this.transferState.get(PRODUCTS_STATE_KEY, []);
        if (Array.isArray(ssrProducts) && ssrProducts.length > 0) {
          ssrProducts.forEach((p: Product) => {
            this.indexProduct(p);
            const entry: CacheEntry<Product> = {
              data: { success: true, data: p },
              expiresAt: Date.now() + this.defaultTtlMs,
            };
            if (p._id) this.itemCache.set(p._id, entry);
            if (p.slug?.ar) this.itemCache.set(p.slug.ar, entry);
            if (p.slug?.en) this.itemCache.set(p.slug.en, entry);
          });
          const cacheEntry: CacheEntry<Product[]> = {
            data: { success: true, data: ssrProducts },
            expiresAt: Date.now() + this.defaultTtlMs,
          };
          this.listCache.set('__all_default__', cacheEntry);
          this.listCache.set(this.buildListKey({ featured: true, limit: 8 }), cacheEntry);
          this.updateSignalFromMap();
        }
      } catch {
        // Safe fallback
      }
    }

    // 2. Hydrate from localStorage
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      const now = Date.now();

      if (parsed && parsed.timestamp && now - parsed.timestamp < this.defaultTtlMs) {
        if (Array.isArray(parsed.masterProducts)) {
          parsed.masterProducts.forEach((p: Product) => {
            this.indexProduct(p);
            const entry: CacheEntry<Product> = {
              data: { success: true, data: p },
              expiresAt: parsed.timestamp + this.defaultTtlMs,
            };
            if (p._id) this.itemCache.set(p._id, entry);
            if (p.slug?.ar) this.itemCache.set(p.slug.ar, entry);
            if (p.slug?.en) this.itemCache.set(p.slug.en, entry);
          });
        }

        if (Array.isArray(parsed.lists)) {
          parsed.lists.forEach((item: { key: string; data: ApiResponse<Product[]> }) => {
            this.listCache.set(item.key, {
              data: item.data,
              expiresAt: parsed.timestamp + this.defaultTtlMs,
            });
          });
        }

        this.updateSignalFromMap();
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch {
      // Storage corrupted or quota exceeded, ignore safely
    }
  }

  /**
   * Persists cache snapshot to localStorage.
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const lists: { key: string; data: ApiResponse<Product[]> }[] = [];
      this.listCache.forEach((val, key) => {
        lists.push({ key, data: val.data });
      });

      const uniqueProducts = Array.from(new Set(this.masterMap.values()));

      const payload = {
        timestamp: Date.now(),
        masterProducts: uniqueProducts,
        lists: lists.slice(0, 10), // keep top 10 most recent query lists
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Quota exceeded or private browsing restrictions, ignore gracefully
    }
  }

  /**
   * Returns true if any products are present in the master map.
   */
  hasAnyProducts(): boolean {
    return this.masterMap.size > 0;
  }

  /**
   * Checks if valid unexpired cache exists for query params.
   */
  hasCached(params?: ProductQueryParams): boolean {
    const key = this.buildListKey(params);
    const entry = this.listCache.get(key);
    if (entry && Date.now() < entry.expiresAt) return true;
    return this.masterMap.size > 0;
  }

  /**
   * Returns cached list data synchronously if present and valid.
   * Performs smart fallback against the master map if an exact query cache key isn't stored yet.
   */
  getCachedSync(params?: ProductQueryParams): ApiResponse<Product[]> | null {
    const key = this.buildListKey(params);
    const entry = this.listCache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data;
    }

    // Smart in-memory fallback from masterMap
    if (this.masterMap.size > 0) {
      let items = Array.from(new Set(this.masterMap.values()));

      if (!params?.all) {
        items = items.filter((p) => !p.isDeleted && p.isActive !== false);
      }

      if (params?.featured) {
        items = items.filter((p) => p.isFeatured);
      }

      if (params?.category) {
        const cat = params.category.trim();
        let decodedCat = cat;
        try {
          decodedCat = decodeURIComponent(cat);
        } catch {}
        items = items.filter((p) => {
          const pCat = p.category as any;
          if (!pCat) return false;
          if (typeof pCat === 'string') return pCat === cat || pCat === decodedCat;
          return (
            pCat.slug?.ar === cat ||
            pCat.slug?.en === cat ||
            pCat.slug?.ar === decodedCat ||
            pCat.slug?.en === decodedCat ||
            pCat._id === cat
          );
        });
      }

      if (params?.q) {
        const q = params.q.toLowerCase().trim();
        items = items.filter((p) => {
          const catNameAr = (p.category as any)?.name?.ar?.toLowerCase() || '';
          const catNameEn = (p.category as any)?.name?.en?.toLowerCase() || '';
          const specsMatch = Array.isArray(p.specs) && p.specs.some((s) =>
            s?.value?.ar?.toLowerCase().includes(q) ||
            s?.value?.en?.toLowerCase().includes(q) ||
            s?.label?.ar?.toLowerCase().includes(q) ||
            s?.label?.en?.toLowerCase().includes(q)
          );

          return (
            p.name?.ar?.toLowerCase().includes(q) ||
            p.name?.en?.toLowerCase().includes(q) ||
            p.shortDescription?.ar?.toLowerCase().includes(q) ||
            p.shortDescription?.en?.toLowerCase().includes(q) ||
            p.description?.ar?.toLowerCase().includes(q) ||
            p.description?.en?.toLowerCase().includes(q) ||
            p.sensorySystem?.ar?.toLowerCase().includes(q) ||
            p.sensorySystem?.en?.toLowerCase().includes(q) ||
            catNameAr.includes(q) ||
            catNameEn.includes(q) ||
            specsMatch
          );
        });
      }

      if (params?.sort === 'price_asc') {
        items.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (params?.sort === 'price_desc') {
        items.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else if (params?.sort === 'newest') {
        items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }

      const total = items.length;
      const limit = params?.limit || 15;
      const page = params?.page || 1;
      const totalPages = Math.ceil(total / limit) || 1;
      const skip = (page - 1) * limit;
      const paginatedItems = items.slice(skip, skip + limit);

      return {
        success: true,
        data: paginatedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    }

    return null;
  }

  /**
   * Generates a deterministic cache key from query params.
   */
  private buildListKey(params?: ProductQueryParams): string {
    if (!params || Object.keys(params).length === 0) return '__all_default__';
    const sortedEntries = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sortedEntries);
  }

  /**
   * Indexes a product into the master in-memory map for instantaneous lookup.
   */
  private indexProduct(p: Product): void {
    if (!p) return;
    if (p._id) this.masterMap.set(p._id, p);
    if (p.slug?.ar) {
      this.masterMap.set(p.slug.ar, p);
      this.masterMap.set(encodeURIComponent(p.slug.ar), p);
    }
    if (p.slug?.en) {
      this.masterMap.set(p.slug.en, p);
      this.masterMap.set(encodeURIComponent(p.slug.en), p);
    }
  }

  /**
   * Updates the reactive cachedProducts signal with unique products.
   */
  private updateSignalFromMap(): void {
    const unique = Array.from(new Set(this.masterMap.values()));
    this.cachedProducts.set(unique);
    this.isCacheLoaded.set(unique.length > 0);
  }

  /**
   * Retrieves products with in-memory and persistent caching.
   * Caches responses for both storefront and admin dashboard queries.
   */
  getProducts(params?: ProductQueryParams, forceRefresh: boolean = false): Observable<ApiResponse<Product[]>> {
    const key = this.buildListKey(params);
    const cached = this.listCache.get(key);
    const now = Date.now();

    if (!forceRefresh && cached && now < cached.expiresAt) {
      return of(cached.data);
    }

    return this.api.get<Product[]>('/products', params, false).pipe(
      tap((res) => {
        if (res.success && Array.isArray(res.data)) {
          this.listCache.set(key, {
            data: res,
            expiresAt: Date.now() + this.defaultTtlMs,
          });

          // Pre-populate individual product caches and master map
          res.data.forEach((p) => {
            this.indexProduct(p);
            const itemEntry: CacheEntry<Product> = {
              data: { success: true, data: p },
              expiresAt: Date.now() + this.defaultTtlMs,
            };
            if (p._id) this.itemCache.set(p._id, itemEntry);
            if (p.slug?.ar) this.itemCache.set(p.slug.ar, itemEntry);
            if (p.slug?.en) this.itemCache.set(p.slug.en, itemEntry);
          });

          this.updateSignalFromMap();
          this.saveToStorage();

          if (isPlatformServer(this.platformId) && res.data) {
            this.transferState.set(PRODUCTS_STATE_KEY, res.data);
          }
        }
      })
    );
  }

  /**
   * Retrieves a single product by slug or _id with in-memory cache lookup.
   */
  getProductBySlug(slugOrId: string, forceRefresh: boolean = false): Observable<ApiResponse<Product>> {
    const rawKey = slugOrId.trim();
    const decodedKey = decodeURIComponent(rawKey);
    const now = Date.now();

    if (!forceRefresh) {
      // 1. Check exact itemCache
      const cached = this.itemCache.get(rawKey) || this.itemCache.get(decodedKey);
      if (cached && now < cached.expiresAt) {
        return of(cached.data);
      }

      // 2. Check masterMap if loaded from any previous list
      const inMemoryProd = this.masterMap.get(rawKey) || this.masterMap.get(decodedKey);
      if (inMemoryProd) {
        const synthesized: ApiResponse<Product> = { success: true, data: inMemoryProd };
        return of(synthesized);
      }
    }

    return this.api.get<Product>(`/products/${encodeURIComponent(rawKey)}`, undefined, false).pipe(
      tap((res) => {
        if (res.success && res.data) {
          const entry: CacheEntry<Product> = {
            data: res,
            expiresAt: Date.now() + this.defaultTtlMs,
          };
          this.itemCache.set(rawKey, entry);
          this.itemCache.set(decodedKey, entry);
          this.indexProduct(res.data);
          this.updateSignalFromMap();
          this.saveToStorage();
        }
      })
    );
  }

  /**
   * Retrieves related products with in-memory caching.
   */
  getRelatedProducts(slug: string, forceRefresh: boolean = false): Observable<ApiResponse<Product[]>> {
    const key = slug.trim();
    const cached = this.relatedCache.get(key);
    const now = Date.now();

    if (!forceRefresh && cached && now < cached.expiresAt) {
      return of(cached.data);
    }

    return this.api.get<Product[]>(`/products/${encodeURIComponent(key)}/related`, undefined, false).pipe(
      tap((res) => {
        if (res.success) {
          this.relatedCache.set(key, {
            data: res,
            expiresAt: Date.now() + this.defaultTtlMs,
          });
        }
      })
    );
  }

  /**
   * Synchronous helper to get any product already held in memory.
   */
  getInMemoryProduct(idOrSlug: string): Product | undefined {
    const key = idOrSlug.trim();
    return this.masterMap.get(key) || this.masterMap.get(decodeURIComponent(key));
  }

  /**
   * Clears in-memory caches and persistent storage. Automatically invoked upon any mutation.
   */
  clearCache(): void {
    this.listCache.clear();
    this.itemCache.clear();
    this.relatedCache.clear();
    this.masterMap.clear();
    this.cachedProducts.set([]);
    this.isCacheLoaded.set(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch {
        // Ignore safely
      }
    }
  }

  createProduct(data: Partial<Product>): Observable<ApiResponse<Product>> {
    return this.api.post<Product>('/products', data).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  updateProduct(id: string, data: Partial<Product>): Observable<ApiResponse<Product>> {
    return this.api.put<Product>(`/products/${id}`, data).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  toggleProduct(id: string): Observable<ApiResponse<Product>> {
    return this.api.patch<Product>(`/products/${id}/toggle`).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  deleteProduct(id: string): Observable<ApiResponse<Product>> {
    return this.api.delete<Product>(`/products/${id}`).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  restoreProduct(id: string): Observable<ApiResponse<Product>> {
    return this.api.patch<Product>(`/products/${id}/restore`).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }

  permanentDeleteProduct(id: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`/products/${id}/permanent`).pipe(
      tap((res) => {
        if (res.success) this.clearCache();
      })
    );
  }
}
