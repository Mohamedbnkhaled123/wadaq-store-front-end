import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { TranslocoDirective } from '@jsverse/transloco';

import { AiConsultantService, AiChatMessage } from '../../../core/services/ai-consultant.service';
import { ProductsService } from '../../../core/services/products.service';
import { LanguageService } from '../../../core/services/language.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AiTopicCardCMS, Product } from '../../../core/models/models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { ChatMessageFormatterPipe } from '../../../shared/pipes/chat-message-formatter.pipe';

@Component({
  selector: 'app-ai-consultant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoDirective,
    ProductCardComponent,
    ChatMessageFormatterPipe,
  ],
  templateUrl: './ai-consultant.component.html',
  styleUrl: './ai-consultant.component.css',
})
export class AiConsultantComponent implements OnInit, AfterViewChecked {
  aiService = inject(AiConsultantService);
  productsService = inject(ProductsService);
  langService = inject(LanguageService);
  whatsappService = inject(WhatsappService);
  settingsService = inject(SettingsService);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  @ViewChild('messagesScroll') private messagesScrollContainer?: ElementRef<HTMLDivElement>;

  private readonly STORAGE_KEY = 'wadaq_consultant_chat_history';

  messages = signal<AiChatMessage[]>([]);
  inputText = signal<string>('');
  isLoading = signal<boolean>(false);
  isConfigured = signal<boolean>(true);
  modelName = signal<string>('Qwen 32B');
  suggestions = signal<string[]>([]);
  expandedProducts = signal<Record<number, boolean>>({});

  topicCards = computed<AiTopicCardCMS[]>(() => {
    const s = this.settingsService.settings();
    const custom = s?.aiConsultant?.topicCards;
    if (custom && custom.length > 0) {
      return custom;
    }
    return [
      {
        iconType: 'vestibular',
        title: { ar: 'الحس الدهليزي والتوازن', en: 'Vestibular & Balance' },
        description: {
          ar: 'ترشيح الأراجيح ومنصات التوازن المناسبة لفرط أو نقص الاستثارة',
          en: 'Recommending swings and balance boards for vestibular regulation',
        },
        promptText: {
          ar: 'ما هي أفضل أدوات وأراجيح التحفيز الدهليزي والتوازن للأطفال ذوي الحساسية الدهليزية؟',
          en: 'What are the best vestibular stimulation and balance swings for children?',
        },
      },
      {
        iconType: 'deep_pressure',
        title: { ar: 'الضغط العميق والتهدئة', en: 'Deep Pressure & Calming' },
        description: {
          ar: 'أسطوانات الضغط، السترات الثقيلة، والمهدئات الحسية لتنظيم الحركة',
          en: 'Compression rollers, weighted vests, and sensory calmers',
        },
        promptText: {
          ar: 'ما هي أدوات الضغط العميق والسترات الثقيلة المناسبة للمساعدة على التهدئة والتنظيم الذاتي؟',
          en: 'What deep pressure tools and weighted vests help with calming and self-regulation?',
        },
      },
      {
        iconType: 'snoezelen',
        title: { ar: 'غرف سنوزلين المتكاملة', en: 'Snoezelen Multi-Sensory Rooms' },
        description: {
          ar: 'تجهيزات الألياف الضوئية، أعمدة الفقاعات، وتوزيع المساحات',
          en: 'Fiber optics, bubble columns, and room spatial planning',
        },
        promptText: {
          ar: 'كيف أجهز غرفة سنوزلين متعددة الحواس بمعدات الإضاءة التفاعلية والألياف الضوئية؟',
          en: 'How to equip a Snoezelen multi-sensory room with interactive lighting and fiber optics?',
        },
      },
    ];
  });

  private shouldScroll = false;

  ngOnInit(): void {
    const isAr = this.langService.currentLang() === 'ar';
    const pageTitle = isAr
      ? 'المستشار الحسي الذكي للأخصائيين — متجر ودق'
      : 'Sensory AI Consultant for Therapists — Wadaq Store';
    this.titleService.setTitle(pageTitle);

    this.metaService.updateTag({
      name: 'description',
      content: isAr
        ? 'استشارات ذكية فورية مدعومة بالذكاء الاصطناعي لاختيار وتنسيق أدوات التكامل الحسي وتجهيزات غرف سنوزلين للأخصائيين والمراكز.'
        : 'Instant AI-powered consultation for occupational therapists to select sensory integration tools and Snoezelen room equipment.',
    });

    this.loadStoredMessages();
    this.checkStatus();
    this.loadSuggestions();
    this.productsService.getProducts({ limit: 60 }).subscribe({ error: () => {} });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private checkStatus(): void {
    this.aiService.getStatus().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.isConfigured.set(res.data.configured);
          if (res.data.model) {
            this.modelName.set(res.data.model);
          }
        }
      },
      error: () => {},
    });
  }

  private loadSuggestions(): void {
    const s = this.settingsService.settings()?.aiConsultant?.suggestions;
    const lang = this.langService.currentLang();
    if (s && s[lang] && s[lang].length > 0) {
      this.suggestions.set(s[lang]);
      return;
    }

    this.aiService.getSuggestions(lang).subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          this.suggestions.set(res.data);
        }
      },
      error: () => {
        this.suggestions.set([
          'ما هي أفضل أرجوحة حسية للأطفال الذين يعانون من فرط الحركة وتشتت الانتباه؟',
          'كيف أصمم ركن هدوء حسي (Calming Corner) بمساحة صغيرة؟',
          'ما هي أدوات الضغط العميق الموصى بها لتخفيف التوتر الحسي؟',
          'ما الفرق بين أرجوحة التوازن القماشية والمنصة الدهليزية الصلبة؟',
        ]);
      },
    });
  }

  private loadStoredMessages(): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
    try {
      const saved = sessionStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const restored: AiChatMessage[] = parsed.map((m: any) => ({
            ...m,
            content: (m.content || '')
              .replace(/\[?\s*RECOMMENDED_SLUGS?.*$/gis, '')
              .replace(/\[?\s*RECOMMEND[A-Z_]*.*$/gis, '')
              .replace(/\[?\s*RECOMMENDED_SLUGS?:?[^\]\n]*\]?/gi, '')
              .replace(/RECOMMENDED_SLUGS?:?[^\n]*/gi, '')
              .trim(),
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            isStreaming: false,
          }));
          this.messages.set(restored);
          this.shouldScroll = true;
        }
      }
    } catch (e) {
      console.warn('Failed to restore chat from sessionStorage:', e);
    }
  }

  private saveMessagesToStorage(): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
    try {
      const msgs = this.messages().filter((m) => m.content && !m.isStreaming);
      if (msgs.length > 0) {
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(msgs));
      } else {
        sessionStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save chat to sessionStorage:', e);
    }
  }

  useSuggestion(promptText: string): void {
    if (this.isLoading()) return;
    this.inputText.set(promptText);
    this.sendMessage();
  }

  @ViewChild('chatTextarea') private chatTextareaElement?: ElementRef<HTMLTextAreaElement>;

  selectTopicCard(card: AiTopicCardCMS): void {
    const lang = this.langService.currentLang();
    const prompt = card.promptText?.[lang] || card.title?.[lang] || '';
    if (prompt) {
      this.inputText.set(prompt);
      setTimeout(() => {
        if (this.chatTextareaElement) {
          this.chatTextareaElement.nativeElement.focus();
        }
      }, 50);
    }
  }

  onInputChange(value: string): void {
    this.inputText.set(value);
    this.adjustTextareaHeight();
  }

  private adjustTextareaHeight(): void {
    if (this.chatTextareaElement?.nativeElement) {
      const el = this.chatTextareaElement.nativeElement;
      el.style.height = 'auto';
      const newHeight = Math.min(el.scrollHeight, 180);
      el.style.height = `${newHeight}px`;
    }
  }

  async sendMessage(): Promise<void> {
    const text = this.inputText().trim();
    if (!text || this.isLoading()) return;

    const currentList = this.messages();
    const userMsg: AiChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const assistantMsg: AiChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      recommendedProducts: [],
    };

    this.messages.set([...currentList, userMsg, assistantMsg]);
    this.inputText.set('');
    this.adjustTextareaHeight();
    this.isLoading.set(true);
    this.shouldScroll = true;

    const payload = this.messages()
      .filter((m) => m.content && !m.isStreaming)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      await this.aiService.streamMessage(
        payload,
        this.langService.currentLang(),
        (token: string) => {
          const list = [...this.messages()];
          const lastIdx = list.length - 1;
          if (lastIdx >= 0 && list[lastIdx].role === 'assistant') {
            let current = list[lastIdx].content + token;
            current = current
              .replace(/\[?\s*RECOMMENDED_SLUGS?.*$/gis, '')
              .replace(/\[?\s*RECOMMEND[A-Z_]*.*$/gis, '')
              .replace(/\[?\s*RECOMMENDED_SLUGS?:?[^\]\n]*\]?/gi, '')
              .replace(/RECOMMENDED_SLUGS?:?[^\n]*/gi, '')
              .replace(/\[\s*$/g, '');
            list[lastIdx] = {
              ...list[lastIdx],
              content: current,
            };
            this.messages.set(list);
            this.shouldScroll = true;
          }
        },
        (doneData) => {
          const list = [...this.messages()];
          const lastIdx = list.length - 1;
          if (lastIdx >= 0 && list[lastIdx].role === 'assistant') {
            const cleanContent = list[lastIdx].content
              .replace(/\[?\s*RECOMMENDED_SLUGS?.*$/gis, '')
              .replace(/\[?\s*RECOMMEND[A-Z_]*.*$/gis, '')
              .replace(/\[?\s*RECOMMENDED_SLUGS?:?[^\]\n]*\]?/gi, '')
              .replace(/RECOMMENDED_SLUGS?:?[^\n]*/gi, '')
              .replace(/\[\s*$/g, '')
              .trim();
            let prods = doneData.recommendedProducts || [];
            if (prods.length === 0) {
              prods = this.fallbackMatchProducts(cleanContent);
            }
            list[lastIdx] = {
              ...list[lastIdx],
              content: cleanContent,
              isStreaming: false,
              recommendedProducts: prods,
            };
            this.messages.set(list);
            this.shouldScroll = true;
            this.saveMessagesToStorage();
          }
          this.isLoading.set(false);
        },
        (err) => {
          console.warn('Streaming failed, falling back to standard API call:', err);
          this.fallbackToNonStreaming(payload);
        }
      );
    } catch (err) {
      this.fallbackToNonStreaming(payload);
    }
  }

  private fallbackToNonStreaming(payload: { role: string; content: string }[]): void {
    this.aiService.sendMessage(payload, this.langService.currentLang()).subscribe({
      next: (res) => {
        const list = [...this.messages()];
        const lastIdx = list.length - 1;
        if (lastIdx >= 0 && list[lastIdx].role === 'assistant') {
          const cleanResp = (res.data?.response || 'عذراً، لم أتمكن من إتمام الرد حالياً.')
            .replace(/\[?\s*RECOMMENDED_SLUGS?.*$/gis, '')
            .replace(/\[?\s*RECOMMEND[A-Z_]*.*$/gis, '')
            .replace(/\[?\s*RECOMMENDED_SLUGS?:?[^\]\n]*\]?/gi, '')
            .replace(/RECOMMENDED_SLUGS?:?[^\n]*/gi, '')
            .trim();
          let prods = res.data?.recommendedProducts || [];
          if (prods.length === 0) {
            prods = this.fallbackMatchProducts(cleanResp);
          }
          list[lastIdx] = {
            ...list[lastIdx],
            content: cleanResp,
            isStreaming: false,
            recommendedProducts: prods,
          };
          this.messages.set(list);
          this.shouldScroll = true;
          this.saveMessagesToStorage();
        }
        this.isLoading.set(false);
      },
      error: () => {
        const list = [...this.messages()];
        const lastIdx = list.length - 1;
        if (lastIdx >= 0 && list[lastIdx].role === 'assistant') {
          list[lastIdx] = {
            ...list[lastIdx],
            content:
              this.langService.currentLang() === 'ar'
                ? 'عذراً، حدث خطأ أثناء الاتصال بالخادم. يرجى التأكد من تشغيل الخادم وضبط مفتاح GROQ_API_KEY.'
                : 'Connection error. Please ensure the backend is running and GROQ_API_KEY is configured.',
            isStreaming: false,
            recommendedProducts: [],
          };
          this.messages.set(list);
        }
        this.isLoading.set(false);
      },
    });
  }

  clearConversation(): void {
    this.messages.set([]);
    try {
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(this.STORAGE_KEY);
      }
    } catch {}
  }

  onTextareaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesScrollContainer?.nativeElement) {
        const el = this.messagesScrollContainer.nativeElement;
        el.scrollTo({
          top: el.scrollHeight,
          behavior: 'smooth',
        });
      }
    } catch {}
  }


  toggleShowProducts(msgIndex: number): void {
    this.expandedProducts.update((prev) => ({
      ...prev,
      [msgIndex]: !prev[msgIndex],
    }));
    this.shouldScroll = true;
  }

  isProductsVisible(msgIndex: number): boolean {
    return !!this.expandedProducts()[msgIndex];
  }

  /**
   * Intelligently matches relevant store products based on consultation keywords
   * ensuring clinical product cards are always recommended even if backend tag is omitted.
   */
  private fallbackMatchProducts(text: string): Product[] {
    const all = this.productsService.cachedProducts();
    if (!all || all.length === 0) return [];

    const lower = text.toLowerCase();
    const matchedSet = new Set<string>();
    const matches: Product[] = [];

    const addProduct = (p: Product) => {
      const id = String(p._id);
      if (!matchedSet.has(id)) {
        matchedSet.add(id);
        matches.push(p);
      }
    };

    // 1. Exact Name or Slug Matching
    for (const p of all) {
      const nameAr = p.name?.ar?.toLowerCase() || '';
      const nameEn = p.name?.en?.toLowerCase() || '';
      const slugAr = p.slug?.ar?.toLowerCase() || '';
      const slugEn = p.slug?.en?.toLowerCase() || '';

      if (
        (slugAr && lower.includes(slugAr)) ||
        (slugEn && lower.includes(slugEn)) ||
        (nameAr && lower.includes(nameAr)) ||
        (nameEn && lower.includes(nameEn))
      ) {
        addProduct(p);
      }
    }

    // 2. Keyword Matching (e.g. أرجوحة, ضغط, سترة, سنوزلين, مسار, أسطوانة)
    if (matches.length < 4) {
      for (const p of all) {
        const nameAr = p.name?.ar?.toLowerCase() || '';
        const keywords = nameAr
          .split(/\s+/)
          .filter((w) => w.length >= 4 && !['أداة', 'حسية', 'أدوات', 'خاصة', 'لتجهيز'].includes(w));

        for (const kw of keywords) {
          if (lower.includes(kw)) {
            addProduct(p);
            break;
          }
        }
        if (matches.length >= 4) break;
      }
    }

    // 3. Clinical Sensory Domains Heuristic
    if (matches.length === 0) {
      if (lower.includes('دهليز') || lower.includes('توازن') || lower.includes('أرجوح') || lower.includes('حرك')) {
        for (const p of all) {
          const n = (p.name?.ar || '').toLowerCase();
          const s = (p.sensorySystem?.ar || '').toLowerCase();
          if (n.includes('أرجوح') || n.includes('توازن') || s.includes('دهليز')) {
            addProduct(p);
            if (matches.length >= 3) break;
          }
        }
      } else if (lower.includes('ضغط') || lower.includes('عميق') || lower.includes('تهدئ') || lower.includes('ستر') || lower.includes('تنظيم')) {
        for (const p of all) {
          const n = (p.name?.ar || '').toLowerCase();
          const s = (p.sensorySystem?.ar || '').toLowerCase();
          if (n.includes('ضغط') || n.includes('ستر') || s.includes('عميق') || n.includes('أسطوان')) {
            addProduct(p);
            if (matches.length >= 3) break;
          }
        }
      } else if (lower.includes('سنوزلين') || lower.includes('ضوئ') || lower.includes('فقاع') || lower.includes('ألياف') || lower.includes('غرف')) {
        for (const p of all) {
          const n = (p.name?.ar || '').toLowerCase();
          if (n.includes('ضوئ') || n.includes('فقاع') || n.includes('ألياف') || n.includes('سنوزلين')) {
            addProduct(p);
            if (matches.length >= 3) break;
          }
        }
      }
    }

    return matches.slice(0, 4);
  }

  getCustomInquiryUrl(): string {
    return this.whatsappService.buildCustomInquiryLink(
      'أود طلب استشارة وتجهيز غرفة حسية أو مركز تأهيل متكامل مع مهندسي وأخصائيي ودق',
      this.langService.currentLang()
    );
  }

  getCustomProductWhatsAppUrl(): string {
    return this.whatsappService.buildCustomInquiryLink(
      'أبحث عن أداة حسية أو جهاز تأهيلي بمواصفات ومقاسات خاصة لمركزي لم أجده بالمتجر',
      this.langService.currentLang()
    );
  }
}

