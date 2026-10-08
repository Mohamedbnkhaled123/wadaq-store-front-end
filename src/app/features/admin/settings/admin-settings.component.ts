import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SettingsService } from '../../../core/services/settings.service';
import { ApiService } from '../../../core/services/api.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css'
})
export class AdminSettingsComponent implements OnInit {
  public settingsService = inject(SettingsService);
  private apiService = inject(ApiService);
  private confirmDialog = inject(ConfirmDialogService);
  private route = inject(ActivatedRoute);

  formData: any = null;
  activeSection: 'sections' | 'media' | 'contact' | 'hero' | 'cta' | 'about' | 'social' | 'aiConsultant' = 'sections';

  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  saveSuccess = signal<boolean>(false);
  errorMessage = signal<string>('');
  uploadingTarget = signal<string | null>(null);

  // AI Consultant Management
  newSuggestionAr = '';
  newSuggestionEn = '';
  editingCardIndex = signal<number | null>(null);
  showCardModal = signal<boolean>(false);
  cardForm: any = {
    iconType: 'vestibular',
    title: { ar: '', en: '' },
    description: { ar: '', en: '' },
    promptText: { ar: '', en: '' },
  };

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const sec = params['section'] || params['tab'];
      if (sec === 'aiConsultant' || sec === 'faq' || sec === 'questions') {
        this.activeSection = 'aiConsultant';
      } else if (sec && ['sections', 'media', 'contact', 'hero', 'cta', 'about', 'social'].includes(sec)) {
        this.activeSection = sec;
      }
    });
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading.set(true);
    this.settingsService.getSettings().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const d = res.data;
          // Ensure safe non-null nested structures with image fields
          this.formData = {
            logo: d.logo || '/images/logo.png',
            showPackagesSection: this.settingsService.showPackagesSection(),
            showProjectsSection: this.settingsService.showProjectsSection(),
            whatsappNumber: d.whatsappNumber || '201024891448',
            phone: d.phone || '02 37358540',
            email: d.email || 'info@wadaqstore.com',
            currency: d.currency || 'ج.م',
            freeShippingThreshold: d.freeShippingThreshold || 5000,
            aiConsultant: {
              suggestions: {
                ar: d.aiConsultant?.suggestions?.ar || [
                  'ما هي أفضل أرجوحة حسية للأطفال الذين يعانون من فرط الحركة وتشتت الانتباه؟',
                  'كيف أصمم ركن هدوء حسي (Calming Corner) بمساحة صغيرة؟',
                  'ما هي أدوات الضغط العميق الموصى بها لتخفيف التوتر الحسي؟',
                  'ما الفرق بين أرجوحة التوازن القماشية والمنصة الدهليزية الصلبة؟',
                ],
                en: d.aiConsultant?.suggestions?.en || [
                  'What is the best sensory swing for children with ADHD?',
                  'How to design a calming sensory corner in a small room?',
                  'What deep pressure tools are recommended for sensory regulation?',
                  'Difference between fabric hammock swing and rigid platform swing?',
                ],
              },
              topicCards: d.aiConsultant?.topicCards?.length
                ? JSON.parse(JSON.stringify(d.aiConsultant.topicCards))
                : [
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
                  ],
            },
            address: {
              ar: d.address?.ar || 'جمهورية مصر العربية - القاهرة',
              en: d.address?.en || 'Cairo, Egypt',
            },
            shippingNote: {
              ar: d.shippingNote?.ar || 'يضاف مصاريف الشحن حسب المحافظة وموقع التوصيل',
              en: d.shippingNote?.en || 'Shipping fees apply according to governorate',
            },
            hero: {
              image: d.hero?.image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1000&q=80',
              title: {
                ar: d.hero?.title?.ar || 'ودق لتنمية المهارات وتجهيز غرف التكامل الحسي',
                en: d.hero?.title?.en || 'Wadaq for Skill Development & Sensory Rooms',
              },
              subtitle: {
                ar: d.hero?.subtitle?.ar || 'حلول متكاملة وأدوات حسية معتمدة للأطباء والأخصائيين ومراكز التأهيل والعلاج الوظيفي',
                en: d.hero?.subtitle?.en || 'Integrated solutions and sensory equipment for specialists',
              },
            },
            customProductCta: {
              image: d.customProductCta?.image || '',
              title: {
                ar: d.customProductCta?.title?.ar || 'لم تجد الأداة الحسية التي تبحث عنها؟',
                en: d.customProductCta?.title?.en || 'Looking for a custom sensory tool?',
              },
              description: {
                ar: d.customProductCta?.description?.ar || 'يمكننا تصنيع أو توفير أي أداة أو جهاز تكامل حسي بمواصفات خاصة تناسب احتياجات مركزك',
                en: d.customProductCta?.description?.en || 'We can customize and supply any sensory tool',
              },
              buttonText: {
                ar: d.customProductCta?.buttonText?.ar || 'اطلب منتجاً خاصاً عبر واتساب',
                en: d.customProductCta?.buttonText?.en || 'Request custom tool via WhatsApp',
              },
            },
            about: {
              image: d.about?.image || 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1000&q=80',
              title: {
                ar: d.about?.title?.ar || 'عن ودق لتنمية المهارات والتكامل الحسي',
                en: d.about?.title?.en || 'About Wadaq',
              },
              content: {
                ar: d.about?.content?.ar || '',
                en: d.about?.content?.en || '',
              },
              mission: {
                ar: d.about?.mission?.ar || '',
                en: d.about?.mission?.en || '',
              },
              vision: {
                ar: d.about?.vision?.ar || '',
                en: d.about?.vision?.en || '',
              },
            },
            social: {
              facebook: d.social?.facebook || '',
              instagram: d.social?.instagram || '',
              tiktok: d.social?.tiktok || '',
              youtube: d.social?.youtube || '',
            },
          };
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('فشل جلب إعدادات المتجر.');
        this.isLoading.set(false);
      },
    });
  }

  onFileSelected(event: Event, target: 'hero' | 'about' | 'cta' | 'logo'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadImage(file, target);
      input.value = ''; // Reset input to allow selecting the same file again
    }
  }

  uploadImage(file: File, target: 'hero' | 'about' | 'cta' | 'logo'): void {
    this.uploadingTarget.set(target);
    this.errorMessage.set('');

    const fd = new FormData();
    fd.append('image', file);

    this.apiService.upload<{ url: string; publicId: string }>('/admin/uploads', fd).subscribe({
      next: (res) => {
        this.uploadingTarget.set(null);
        if (res.success && res.data?.url) {
          if (target === 'hero') this.formData.hero.image = res.data.url;
          if (target === 'about') this.formData.about.image = res.data.url;
          if (target === 'cta') this.formData.customProductCta.image = res.data.url;
          if (target === 'logo') this.formData.logo = res.data.url;
        }
      },
      error: (err) => {
        this.uploadingTarget.set(null);
        this.errorMessage.set(err.error?.message || 'فشل في رفع الصورة، يرجى المحاولة مجدداً.');
      },
    });
  }

  saveSettings(scrollToTop = true): void {
    if (!this.formData) return;
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.errorMessage.set('');

    this.settingsService.updateSettings(this.formData).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res.success) {
          this.saveSuccess.set(true);
          if (scrollToTop) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          setTimeout(() => this.saveSuccess.set(false), 5000);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'حدث خطأ أثناء حفظ إعدادات CMS.');
      },
    });
  }

  async togglePackagesSection(): Promise<void> {
    const current = this.formData.showPackagesSection;
    const confirmed = await this.confirmDialog.confirm({
      title: current ? 'تأكيد إخفاء قسم باقات التجهيز' : 'تأكيد إظهار قسم باقات التجهيز',
      message: current
        ? 'هل أنت متأكد من إيقاف تنشيط وإخفاء قسم باقات تجهيز الغرف من الصفحة الرئيسية؟ لن يتمكن العملاء من مشاهدته.'
        : 'هل ترغب في تنشيط وإظهار قسم باقات تجهيز الغرف في الصفحة الرئيسية؟',
      confirmText: current ? 'نعم، إخفاء القسم' : 'تنشيط وإظهار القسم',
      cancelText: 'تراجع',
      type: current ? 'warning' : 'primary',
      confirmIcon: current ? 'pause' : 'play',
    });
    if (!confirmed) return;

    this.formData.showPackagesSection = !current;
    this.settingsService.setPackagesSectionActive(this.formData.showPackagesSection).subscribe();
  }

  async toggleProjectsSection(): Promise<void> {
    const current = this.formData.showProjectsSection;
    const confirmed = await this.confirmDialog.confirm({
      title: current ? 'تأكيد إخفاء قسم معرض الأعمال' : 'تأكيد إظهار قسم معرض الأعمال',
      message: current
        ? 'هل أنت متأكد من إيقاف تنشيط وإخفاء قسم معرض الأعمال والتجهيزات من الصفحة الرئيسية؟ لن يتمكن العملاء من مشاهدته.'
        : 'هل ترغب في تنشيط وإظهار قسم معرض الأعمال والتجهيزات في الصفحة الرئيسية؟',
      confirmText: current ? 'نعم، إخفاء القسم' : 'تنشيط وإظهار القسم',
      cancelText: 'تراجع',
      type: current ? 'warning' : 'primary',
      confirmIcon: current ? 'pause' : 'play',
    });
    if (!confirmed) return;

    this.formData.showProjectsSection = !current;
    this.settingsService.setProjectsSectionActive(this.formData.showProjectsSection).subscribe();
  }

  // AI Consultant Management CRUD Methods
  addSuggestion(): void {
    const ar = this.newSuggestionAr.trim();
    if (!ar) {
      this.errorMessage.set('يرجى كتابة نص السؤال بالعربية في الحقل أولاً لإضافته.');
      setTimeout(() => this.errorMessage.set(''), 4000);
      return;
    }
    if (!this.formData.aiConsultant) {
      this.formData.aiConsultant = { suggestions: { ar: [], en: [] }, topicCards: [] };
    }
    if (!this.formData.aiConsultant.suggestions) {
      this.formData.aiConsultant.suggestions = { ar: [], en: [] };
    }
    if (!this.formData.aiConsultant.suggestions.ar) {
      this.formData.aiConsultant.suggestions.ar = [];
    }
    this.formData.aiConsultant.suggestions.ar.push(ar);

    if (this.newSuggestionEn.trim()) {
      if (!this.formData.aiConsultant.suggestions.en) {
        this.formData.aiConsultant.suggestions.en = [];
      }
      this.formData.aiConsultant.suggestions.en.push(this.newSuggestionEn.trim());
    }

    this.newSuggestionAr = '';
    this.newSuggestionEn = '';
    this.saveSettings(false);
  }

  async removeSuggestion(index: number): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'تأكيد حذف السؤال المقترح',
      message: 'هل أنت متأكد من حذف هذا السؤال من قائمة الاستشارات الشائعة؟',
      confirmText: 'نعم، حذف',
      cancelText: 'إلغاء',
      type: 'danger',
      confirmIcon: 'trash',
    });
    if (confirmed) {
      this.formData.aiConsultant.suggestions.ar.splice(index, 1);
      if (this.formData.aiConsultant.suggestions.en?.[index] !== undefined) {
        this.formData.aiConsultant.suggestions.en.splice(index, 1);
      }
      this.saveSettings(false);
    }
  }

  openAddCardModal(): void {
    this.editingCardIndex.set(null);
    this.cardForm = {
      iconType: 'vestibular',
      title: { ar: '', en: '' },
      description: { ar: '', en: '' },
      promptText: { ar: '', en: '' },
    };
    this.showCardModal.set(true);
  }

  openEditCardModal(index: number): void {
    this.editingCardIndex.set(index);
    const existing = this.formData.aiConsultant.topicCards[index];
    this.cardForm = JSON.parse(JSON.stringify(existing));
    this.showCardModal.set(true);
  }

  closeCardModal(): void {
    this.showCardModal.set(false);
    this.editingCardIndex.set(null);
  }

  saveCardModal(): void {
    if (!this.cardForm.title.ar?.trim()) return;
    if (!this.formData.aiConsultant) {
      this.formData.aiConsultant = { suggestions: { ar: [], en: [] }, topicCards: [] };
    }
    if (!this.formData.aiConsultant.topicCards) {
      this.formData.aiConsultant.topicCards = [];
    }

    const idx = this.editingCardIndex();
    if (idx !== null && idx >= 0) {
      this.formData.aiConsultant.topicCards[idx] = { ...this.cardForm };
    } else {
      this.formData.aiConsultant.topicCards.push({ ...this.cardForm });
    }
    this.closeCardModal();
    this.saveSettings(false);
  }

  async deleteCard(index: number): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'تأكيد حذف كارت الموضوع',
      message: 'هل أنت متأكد من حذف هذا الكارت من شاشة الترحيب بالمستشار الذكي؟',
      confirmText: 'نعم، حذف',
      cancelText: 'إلغاء',
      type: 'danger',
      confirmIcon: 'trash',
    });
    if (confirmed) {
      this.formData.aiConsultant.topicCards.splice(index, 1);
      this.saveSettings(false);
    }
  }
}
