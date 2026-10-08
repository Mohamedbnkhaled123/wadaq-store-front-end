import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { Product } from '../models/models';
import { environment } from '../../../environments/environment';

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  recommendedProducts?: Product[];
  timestamp?: Date;
  isStreaming?: boolean;
}

export interface AiStatusResponse {
  configured: boolean;
  model: string;
  provider: string;
}

export interface AiChatResponse {
  response: string;
  model: string;
  recommendedProducts?: Product[];
}

@Injectable({
  providedIn: 'root',
})
export class AiConsultantService {
  private api = inject(ApiService);

  private get apiUrl(): string {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return 'https://wadaq-store-back-end.vercel.app/api';
      }
    }
    return environment.apiUrl || 'https://wadaq-store-back-end.vercel.app/api';
  }

  getStatus(): Observable<ApiResponse<AiStatusResponse>> {
    return this.api.get<AiStatusResponse>('/ai/status', undefined, false);
  }

  getSuggestions(lang = 'ar'): Observable<ApiResponse<string[]>> {
    return this.api.get<string[]>('/ai/suggestions', { lang }, false);
  }

  sendMessage(
    messages: { role: string; content: string }[],
    lang = 'ar'
  ): Observable<ApiResponse<AiChatResponse>> {
    return this.api.post<AiChatResponse>('/ai/chat', { messages, lang }, false);
  }

  /**
   * Streams responses token by token via Server-Sent Events.
   */
  async streamMessage(
    messages: { role: string; content: string }[],
    lang = 'ar',
    onToken: (token: string) => void,
    onDone: (data: { model?: string; recommendedProducts?: Product[] }) => void,
    onError: (err: any) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, lang }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.token) {
              onToken(parsed.token);
            }
            if (parsed.done) {
              onDone({
                model: parsed.model,
                recommendedProducts: parsed.recommendedProducts || [],
              });
            }
            if (parsed.error) {
              onError(new Error(parsed.error));
            }
          } catch (e) {
            // Ignore partial or unparseable chunks
          }
        }
      }
    } catch (error) {
      onError(error);
    }
  }
}
