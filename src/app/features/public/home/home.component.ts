import { Component, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { PackagesService } from '../../../core/services/packages.service';
import { SettingsService } from '../../../core/services/settings.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { Product, Category, Package } from '../../../core/models/models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { PackageCardComponent } from '../../../shared/components/package-card/package-card.component';
import { LocalizePipe } from '../../../shared/pipes/localize.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslocoDirective,
    ProductCardComponent,
    PackageCardComponent,
    LocalizePipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  productsService = inject(ProductsService);
  categoriesService = inject(CategoriesService);
  packagesService = inject(PackagesService);
  settingsService = inject(SettingsService);
  whatsappService = inject(WhatsappService);
  langService = inject(LanguageService);
  seo = inject(SeoService);
  private platformId = inject(PLATFORM_ID);

  featuredProducts = signal<Product[]>(
    this.productsService.getCachedSync({ featured: true, limit: 8 })?.data || []
  );
  categories = signal<Category[]>(
    this.categoriesService.getCachedSync()?.data || []
  );
  packages = signal<Package[]>([]);
  activePackages = computed(() => this.packages().filter((p) => !p.isDeleted && p.isActive !== false));
  totalProductsCount = signal<number>(50);

  get customInquiryUrl(): string {
    return this.whatsappService.buildCustomInquiryLink(
      'طلب تصنيع / استيراد أداة حسية مخصصة للمركز',
      this.langService.currentLang()
    );
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'الرئيسية — متجر ودق لتجهيز غرف وأدوات التكامل الحسي',
      description: 'متجر ودق: المورد المتخصص لأدوات التكامل الحسي والعلاج الوظيفي وتجهيز غرف سنوزلين ومراكز الأطفال التخصصية في مصر والشرق الأوسط.',
      path: `/${this.langService.currentLang()}`,
      arSlug: '',
      enSlug: '',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'MedicalBusiness',
        name: 'متجر ودق للتكامل الحسي',
        description: 'متجر تجهيزات وأدوات التكامل الحسي والعلاج الوظيفي للمتخصصين والمراكز',
        url: 'https://wadaqstore.com',
        priceRange: '$$',
      },
    });

    this.loadData();
  }

  loadData(): void {
    const isBrowser = isPlatformBrowser(this.platformId);
    const hasInitialData = this.featuredProducts().length > 0 && this.categories().length > 0;

    // If on client and initial SSR data is already loaded, defer revalidation until browser is idle
    if (isBrowser && hasInitialData) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => this.fetchData());
      } else {
        setTimeout(() => this.fetchData(), 2000);
      }
      return;
    }

    this.fetchData();
  }

  private fetchData(): void {
    this.productsService.getProducts({ featured: true, limit: 8 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.featuredProducts.set(res.data);
          if (res.pagination) {
            this.totalProductsCount.set(res.pagination.total);
          }
        }
      },
    });

    this.categoriesService.getCategories().subscribe({
      next: (res) => {
        if (res.success) this.categories.set(res.data);
      },
    });

    this.packagesService.getPackages().subscribe({
      next: (res) => {
        if (res.success) this.packages.set(res.data);
      },
    });
  }

  get heroImageUrl(): string {
    const img =
      this.settingsService.settings()?.hero?.image ||
      'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=75';
    if (img.includes('images.unsplash.com')) {
      return img.replace(/w=\d+/, 'w=600').replace(/q=\d+/, 'q=75');
    }
    return img;
  }
}
