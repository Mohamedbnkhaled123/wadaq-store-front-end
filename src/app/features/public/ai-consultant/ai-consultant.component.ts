import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Title, Meta, DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslocoDirective } from '@jsverse/transloco';

import { AiConsultantService, AiChatMessage } from '../../../core/services/ai-consultant.service';
import { LanguageService } from '../../../core/services/language.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AiTopicCardCMS } from '../../../core/models/models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-ai-consultant',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    TranslocoDirective,
    ProductCardComponent,
  ],
  templateUrl: './ai-consultant.component.html',
  styleUrl: './ai-consultant.component.css',
})
export class AiConsultantComponent implements OnInit, AfterViewChecked {
  aiService = inject(AiConsultantService);
  langService = inject(LanguageService);
  whatsappService = inject(WhatsappService);
  settingsService = inject(SettingsService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private sanitizer = inject(DomSanitizer);

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
            list[lastIdx] = {
              ...list[lastIdx],
              content: cleanContent,
              isStreaming: false,
              recommendedProducts: doneData.recommendedProducts || [],
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
          list[lastIdx] = {
            ...list[lastIdx],
            content: cleanResp,
            isStreaming: false,
            recommendedProducts: res.data?.recommendedProducts || [],
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
      sessionStorage.removeItem(this.STORAGE_KEY);
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
      if (this.messagesScrollContainer) {
        this.messagesScrollContainer.nativeElement.scrollTop =
          this.messagesScrollContainer.nativeElement.scrollHeight;
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

  /**
   * Formats raw markdown into clean, beautiful HTML:
   * - Eliminates raw hashtags (###, ##, #) and converts to styled bold section headers
   * - Converts numbered steps (1., 2.) into styled step badges
   * - Converts sub-steps (أ., ب., etc.) into clean sub-item indicators
   * - Converts bullet points (*, -) into styled bullet indicators
   * - Converts **bold** into <strong class="msg-bold">
   * - Strips any unwanted markdown asterisks or internal tags
   */
  formatContent(rawText: string): SafeHtml {
    if (!rawText) return '';

    // Strip internal slug tags completely and aggressively
    let cleaned = rawText
      .replace(/\[?\s*RECOMMENDED_SLUGS?.*$/gis, '')
      .replace(/\[?\s*RECOMMEND[A-Z_]*.*$/gis, '')
      .replace(/\[?\s*RECOMMENDED_SLUGS?:?[^\]\n]*\]?/gi, '')
      .replace(/RECOMMENDED_SLUGS?:?[^\n]*/gi, '')
      .replace(/\[?\s*RECOMMENDED_SLUG[^\n\]]*\]?/gi, '')
      .replace(/\[\s*$/g, '')
      .trim();

    // Escape HTML special characters
    const escaped = cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const lines = escaped.split('\n');
    const resultParts: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (!line) {
        resultParts.push('<div class="msg-line-gap"></div>');
        continue;
      }

      // Convert Bold **text** -> <strong class="msg-bold">text</strong>
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong class="msg-bold">$1</strong>');
      // Clean single asterisks used for italics
      line = line.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');

      // Headings: ### or ####
      if (/^#{3,5}\s+(.*)/.test(line)) {
        const headingText = line.replace(/^#{3,5}\s+/, '');
        resultParts.push(`<h4 class="msg-section-heading">${headingText}</h4>`);
        continue;
      }

      // Main Headings: # or ##
      if (/^#{1,2}\s+(.*)/.test(line)) {
        const headingText = line.replace(/^#{1,2}\s+/, '');
        resultParts.push(`<h3 class="msg-main-heading">${headingText}</h3>`);
        continue;
      }

      // Numbered List: 1. or 2.
      const numMatch = line.match(/^(\d+)[\.\)]\s+(.*)/);
      if (numMatch) {
        const num = numMatch[1];
        const body = numMatch[2];
        resultParts.push(
          `<div class="msg-list-item"><span class="msg-num-badge">${num}</span><div class="msg-item-body">${body}</div></div>`
        );
        continue;
      }

      // Sub-letter List: أ. or ب. or ج. or a. or b.
      const subMatch = line.match(/^([أ-يa-zA-Z])[\.\)]\s+(.*)/);
      if (subMatch) {
        const letter = subMatch[1];
        const body = subMatch[2];
        resultParts.push(
          `<div class="msg-sublist-item"><span class="msg-sub-badge">${letter}</span><div class="msg-item-body">${body}</div></div>`
        );
        continue;
      }

      // Bullet items: * or - or •
      const bulletMatch = line.match(/^[\*\-•]\s+(.*)/);
      if (bulletMatch) {
        const body = bulletMatch[1];
        resultParts.push(
          `<div class="msg-bullet-item"><span class="msg-bullet-dot"></span><div class="msg-item-body">${body}</div></div>`
        );
        continue;
      }

      // Regular paragraph line
      resultParts.push(`<p class="msg-paragraph">${line}</p>`);
    }

    const htmlString = resultParts.join('');
    return this.sanitizer.bypassSecurityTrustHtml(htmlString);
  }
}
