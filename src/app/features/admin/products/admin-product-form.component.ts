import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Product, Category, SpecItem } from '../../../core/models/models';

@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-product-form.component.html',
  styleUrl: './admin-product-form.component.css'
})
export class AdminProductFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private confirmDialog = inject(ConfirmDialogService);

  isUploadingImage = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  productId = signal<string>('');
  originalProduct = signal<Product | null>(null);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  saveSuccessMessage = signal<string>('');
  errorMessage = signal<string>('');

  categories = signal<Category[]>(this.categoriesService.getCachedSync(true)?.data || []);
  activeTab: 'ar' | 'en' = 'ar';

  newIndicationInput = '';
  newImageUrl = '';
  clinicalIndicationsList: string[] = [];

  formData: any = {
    name: { ar: '', en: '' },
    shortDescription: { ar: '', en: '' },
    description: { ar: '', en: '' },
    price: 0,
    oldPrice: undefined,
    category: '',
    sensorySystem: { ar: '', en: '' },
    ageRange: { ar: 'مناسب لجميع الأعمار (أطفال وبالغين)', en: 'Suitable for all ages' },
    inStock: true,
    isFeatured: false,
    isActive: true,
    images: [] as Array<{ url: string; alt?: { ar: string; en: string } }>,
    specs: [] as SpecItem[],
  };

  ngOnInit(): void {
    if (this.categories().length === 0) {
      this.loadCategories();
    }

    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.isEditMode.set(true);
        this.productId.set(id);
        this.loadProductData(id);
      } else {
        this.isEditMode.set(false);
      }
    });
  }

  loadCategories(): void {
    this.categoriesService.getCategories(true).subscribe({
      next: (res) => {
        if (res.success && res.data) this.categories.set(res.data);
      },
    });
  }

  private populateFormData(p: Product): void {
    if (!p) return;
    this.originalProduct.set(p);

    // Extract clinical indications from specs safely
    const indicationsSpec = p.specs?.find((s) => {
      const arLabel = s.label?.ar || '';
      const enLabel = (s.label?.en || '').toLowerCase();
      return arLabel.includes('دواعي') || enLabel.includes('indication');
    });

    if (indicationsSpec && indicationsSpec.value?.ar) {
      this.clinicalIndicationsList = indicationsSpec.value.ar
        .split(/[،,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      this.clinicalIndicationsList = [];
    }

    // Populate remaining specs safely
    const otherSpecs = (p.specs || []).filter((s) => {
      const arLabel = s.label?.ar || '';
      const enLabel = (s.label?.en || '').toLowerCase();
      return !arLabel.includes('دواعي') && !enLabel.includes('indication');
    });

    this.formData = {
      name: { ar: p.name?.ar || '', en: p.name?.en || '' },
      shortDescription: { ar: p.shortDescription?.ar || '', en: p.shortDescription?.en || '' },
      description: { ar: p.description?.ar || '', en: p.description?.en || '' },
      price: p.price ?? 0,
      oldPrice: p.oldPrice || undefined,
      category: (p.category as any)?._id || (p.category as any)?.id || p.category || '',
      sensorySystem: { ar: p.sensorySystem?.ar || '', en: p.sensorySystem?.en || '' },
      ageRange: { ar: p.ageRange?.ar || '', en: p.ageRange?.en || '' },
      inStock: p.inStock !== false,
      isFeatured: !!p.isFeatured,
      isActive: p.isActive !== false,
      images: Array.isArray(p.images) ? [...p.images] : [],
      specs: otherSpecs.map((s) => ({
        label: { ar: s.label?.ar || '', en: s.label?.en || '' },
        value: { ar: s.value?.ar || '', en: s.value?.en || '' },
      })),
    };
  }

  loadProductData(idOrSlug: string): void {
    // 1. Instant synchronous check from in-memory cache (0ms rendering)
    const inMemory = this.productsService.getInMemoryProduct(idOrSlug);
    if (inMemory) {
      this.populateFormData(inMemory);
      this.isLoading.set(false);
    } else {
      this.isLoading.set(true);
    }

    // 2. Fetch fresh data in the background
    this.productsService.getProductBySlug(idOrSlug).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.populateFormData(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        if (!inMemory) {
          this.errorMessage.set('فشل تحميل بيانات المنتج المطلوب.');
        }
        this.isLoading.set(false);
      },
    });
  }

  onCategoryChange(): void {
    const selected = this.categories().find((c) => c._id === this.formData.category);
    if (selected) {
      this.formData.sensorySystem = {
        ar: selected.name.ar,
        en: selected.name.en,
      };
    }
  }

  calculateDiscount(): number {
    if (!this.formData.oldPrice || this.formData.oldPrice <= this.formData.price) return 0;
    return Math.round(((this.formData.oldPrice - this.formData.price) / this.formData.oldPrice) * 100);
  }

  addIndication(): void {
    if (!this.newIndicationInput.trim()) return;
    this.clinicalIndicationsList.push(this.newIndicationInput.trim());
    this.newIndicationInput = '';
  }

  removeIndication(index: number): void {
    this.clinicalIndicationsList.splice(index, 1);
  }

  addSpec(): void {
    this.formData.specs.push({
      label: { ar: '', en: '' },
      value: { ar: '', en: '' },
    });
  }

  removeSpec(index: number): void {
    this.formData.specs.splice(index, 1);
  }

  addImage(): void {
    if (!this.newImageUrl.trim()) return;
    this.formData.images.push({
      url: this.newImageUrl.trim(),
      alt: { ar: this.formData.name.ar, en: this.formData.name.en },
    });
    this.newImageUrl = '';
  }

  removeImage(index: number): void {
    this.formData.images.splice(index, 1);
  }

  makePrimaryImage(index: number): void {
    const [img] = this.formData.images.splice(index, 1);
    this.formData.images.unshift(img);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.uploadImageFile(file);
      input.value = '';
    }
  }

  uploadImageFile(file: File): void {
    this.isUploadingImage.set(true);
    this.errorMessage.set('');

    const fd = new FormData();
    fd.append('image', file);

    this.apiService.upload<{ url: string; publicId: string }>('/admin/uploads', fd).subscribe({
      next: (res) => {
        this.isUploadingImage.set(false);
        if (res.success && res.data?.url) {
          this.formData.images.push({
            url: res.data.url,
            alt: { ar: this.formData.name.ar || '', en: this.formData.name.en || '' },
          });
        }
      },
      error: (err) => {
        this.isUploadingImage.set(false);
        this.errorMessage.set(err.error?.message || 'فشل في رفع الصورة، يرجى المحاولة مجدداً.');
      },
    });
  }

  async toggleActive(): Promise<void> {
    const p = this.originalProduct();
    if (!p) return;

    const isDeactivating = p.isActive;
    const confirmed = await this.confirmDialog.confirm({
      title: isDeactivating ? 'تأكيد إيقاف تنشيط المنتج' : 'تأكيد تنشيط المنتج',
      message: isDeactivating
        ? `هل أنت متأكد من إيقاف تنشيط المنتج "${p.name.ar}"؟ سيتم إخفاؤه من المتجر.`
        : `هل ترغب في إعادة تنشيط المنتج "${p.name.ar}" وإتاحته للعملاء؟`,
      confirmText: isDeactivating ? 'نعم، إيقاف التنشيط' : 'تنشيط المنتج',
      cancelText: 'تراجع',
      type: isDeactivating ? 'warning' : 'primary',
      confirmIcon: isDeactivating ? 'pause' : 'play',
    });
    if (!confirmed) return;

    this.productsService.toggleProduct(p._id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.originalProduct.set(res.data);
          this.formData.isActive = res.data.isActive;
          this.saveSuccessMessage.set(
            res.data.isActive ? 'تم تنشيط المنتج وإتاحته للعملاء.' : 'تم إيقاف تنشيط المنتج بنجاح.'
          );
        }
      },
    });
  }

  async softDeleteProduct(): Promise<void> {
    const p = this.originalProduct();
    if (!p) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'تأكيد حذف المنتج مؤقتاً',
      message: `هل أنت متأكد من حذف المنتج "${p.name.ar}" مؤقتاً؟ سيتم نقله إلى سلة المحذوفات.`,
      confirmText: 'نعم، حذف المنتج',
      cancelText: 'إلغاء التراجع',
      type: 'danger',
      confirmIcon: 'trash',
    });
    if (!confirmed) return;

    this.productsService.deleteProduct(p._id).subscribe({
      next: () => {
        this.saveSuccessMessage.set('تم حذف المنتج بنظام Soft Delete بنجاح.');
        setTimeout(() => this.router.navigate(['/admin/products']), 1200);
      },
    });
  }

  restoreProduct(): void {
    const p = this.originalProduct();
    if (!p) return;
    this.productsService.restoreProduct(p._id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.originalProduct.set(res.data);
          this.saveSuccessMessage.set('تم استرجاع المنتج بنجاح.');
        }
      },
    });
  }

  onSubmit(): void {
    if (!this.formData.name.ar.trim() || !this.formData.name.en.trim()) {
      this.errorMessage.set('يرجى إدخال اسم المنتج باللغتين العربية والإنجليزية.');
      return;
    }
    if (!this.formData.category) {
      this.errorMessage.set('يرجى اختيار التصنيف الحسي للمنتج.');
      return;
    }
    if (this.formData.price === null || this.formData.price === undefined || this.formData.price < 0) {
      this.errorMessage.set('يرجى إدخال سعر صحيح للمنتج.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.saveSuccessMessage.set('');

    // Prepare specs with clinical indications combined
    const finalSpecs: SpecItem[] = [...this.formData.specs];
    if (this.clinicalIndicationsList.length > 0) {
      finalSpecs.unshift({
        label: { ar: 'دواعي الاستخدام والتأهيل الحسي', en: 'Clinical Indications' },
        value: {
          ar: this.clinicalIndicationsList.join('، '),
          en: this.clinicalIndicationsList.join(', '),
        },
      });
    }

    const payload = {
      ...this.formData,
      specs: finalSpecs,
    };

    if (this.isEditMode()) {
      const p = this.originalProduct();
      const id = p ? p._id : this.productId();
      this.productsService.updateProduct(id, payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res.success) {
            this.saveSuccessMessage.set('تم حفظ وتحديث بيانات المنتج في MongoDB Atlas بنجاح!');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'حدث خطأ أثناء حفظ التعديلات.');
        },
      });
    } else {
      this.productsService.createProduct(payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res.success) {
            this.saveSuccessMessage.set('تم إنشاء المنتج وإضافته لقاعدة البيانات بنجاح!');
            setTimeout(() => {
              this.router.navigate(['/admin/products']);
            }, 1200);
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'حدث خطأ أثناء إضافة المنتج.');
        },
      });
    }
  }
}
