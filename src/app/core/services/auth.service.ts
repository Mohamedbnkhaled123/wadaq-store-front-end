import { inject, Injectable, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { ApiService } from './api.service';
import { AdminUser } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private readonly TOKEN_KEY = 'wadaq_admin_token';
  private readonly USER_KEY = 'wadaq_admin_user';

  public currentUser = signal<AdminUser | null>(null);
  public isLoading = signal<boolean>(false);
  public isAdmin = computed(() => !!this.currentUser());

  constructor() {
    this.hydrateFromStorage();
    this.checkSession();
  }

  private hydrateFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      const user = localStorage.getItem(this.USER_KEY);
      if (token && user) {
        this.currentUser.set(JSON.parse(user));
      }
    } catch {
      // Storage corrupted, ignore
    }
  }

  hasToken(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  checkSession(): void {
    if (!isPlatformBrowser(this.platformId) || !this.hasToken()) return;

    this.api.get<{ admin: AdminUser }>('/auth/me').subscribe({
      next: (res) => {
        if (res.success && res.data?.admin) {
          this.currentUser.set(res.data.admin);
          try {
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.data.admin));
          } catch {}
        } else {
          this.clearSession();
        }
      },
      error: () => {
        this.clearSession();
      },
    });
  }

  verifySession(): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId) || !this.hasToken()) {
      return of(false);
    }

    return this.api.get<{ admin: AdminUser }>('/auth/me').pipe(
      map((res) => {
        if (res.success && res.data?.admin) {
          this.currentUser.set(res.data.admin);
          try {
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.data.admin));
          } catch {}
          return true;
        }
        this.clearSession();
        return false;
      }),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }

  private clearSession(): void {
    this.currentUser.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  getSetupStatus(): Observable<any> {
    return this.api.get<{ isInitialized: boolean }>('/auth/setup-status');
  }

  setupAdmin(data: { name?: string; email: string; password: string }): Observable<any> {
    this.isLoading.set(true);
    return this.api.post<{ token: string; admin: AdminUser }>('/auth/setup', data).pipe(
      tap((res) => {
        if (res.success && res.data?.admin) {
          this.currentUser.set(res.data.admin);
          if (isPlatformBrowser(this.platformId)) {
            if (res.data.token) localStorage.setItem(this.TOKEN_KEY, res.data.token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.data.admin));
          }
        }
      }),
      tap({
        complete: () => this.isLoading.set(false),
        error: () => this.isLoading.set(false),
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.api.post('/auth/change-password', { currentPassword, newPassword });
  }

  login(email: string, password: string): Observable<any> {
    this.isLoading.set(true);
    return this.api.post<{ token: string; admin: AdminUser }>('/auth/login', { email, password }).pipe(
      tap((res) => {
        if (res.success && res.data?.admin) {
          this.currentUser.set(res.data.admin);
          if (isPlatformBrowser(this.platformId)) {
            if (res.data.token) localStorage.setItem(this.TOKEN_KEY, res.data.token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.data.admin));
          }
        }
      }),
      tap({
        complete: () => this.isLoading.set(false),
        error: () => this.isLoading.set(false),
      })
    );
  }

  logout(): void {
    this.api.post('/auth/logout', {}).subscribe({
      next: () => {
        this.clearSession();
        this.router.navigate(['/ar']);
      },
      error: () => {
        this.clearSession();
        this.router.navigate(['/ar']);
      },
    });
  }
}
