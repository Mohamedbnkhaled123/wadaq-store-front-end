import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  private get baseUrl(): string {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return 'https://wadaq-store-back-end.vercel.app/api';
      }
    }
    return environment.apiUrl || 'https://wadaq-store-back-end.vercel.app/api';
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('wadaq_admin_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  }

  get<T>(endpoint: string, params?: Record<string, any>, withCredentials = true): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, {
      params: httpParams,
      headers: this.getHeaders(),
      withCredentials: withCredentials,
    });
  }

  post<T>(endpoint: string, body: any, withCredentials = true): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders(),
      withCredentials: withCredentials,
    });
  }

  put<T>(endpoint: string, body: any, withCredentials = true): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders(),
      withCredentials: withCredentials,
    });
  }

  patch<T>(endpoint: string, body?: any, withCredentials = true): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body || {}, {
      headers: this.getHeaders(),
      withCredentials: withCredentials,
    });
  }

  delete<T>(endpoint: string, withCredentials = true): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
      withCredentials: withCredentials,
    });
  }

  upload<T>(endpoint: string, formData: FormData, withCredentials = true): Observable<ApiResponse<T>> {
    const normalizedEndpoint = endpoint === '/uploads' ? '/admin/uploads' : endpoint;
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${normalizedEndpoint}`, formData, {
      headers: this.getHeaders(),
      withCredentials: withCredentials,
    });
  }
}
