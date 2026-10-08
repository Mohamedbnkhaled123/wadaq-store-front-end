import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { Product, Category } from '../../../core/models/models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { LocalizePipe } from '../../../shared/pipes/localize.pipe';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoDirective,
    ProductCardComponent,
    LocalizePipe,
  ],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.css',
})
export class ProductsListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private whatsappService = inject(WhatsappService);
  langService = inject(LanguageService);
  private seo = inject(SeoService);

  private snapParams = this.route.snapshot.queryParams;
  
  // Committed filter parameters
  searchQuery = signal<string>(this.snapParams['q'] || '');
  selectedCategory = signal<string>(this.snapParams['category'] || '');
  currentSort = signal<string>(this.snapParams['sort'] || 'newest');

  // Pagination parameters (15 products per page)
  readonly pageSize = 15;
  currentPage = signal<number>(Math.max(1, parseInt(this.snapParams['page'] || '1', 10)));
  totalPages = signal<number>(1);
  totalProducts = signal<number>(0);

  // Input draft value (does not trigger products list filtering until Search is clicked or Enter is pressed)
  searchInputValue = signal<string>(this.snapParams['q'] || '');

  // Autocomplete Suggestions State
  showSuggestions = signal<boolean>(false);
  suggestions = signal<{ products: Product[]; categories: Category[] }>({
    products: [],
    categories: [],
  });

  categories = signal<Category[]>(
    this.categoriesService.getCachedSync()?.data || []
  );

  products = signal<Product[]>(
    this.productsService.getCachedSync({
      category: this.snapParams['category'] || undefined,
      q: this.snapParams['q'] || undefined,
      sort: this.snapParams['sort'] || 'newest',
      page: Math.max(1, parseInt(this.snapParams['page'] || '1', 10)),
      limit: 15,
    })?.data || []
  );

  isLoading = signal<boolean>(this.products().length === 0);

  ngOnInit(): void {
    this.seo.update({
      title: 'أدوات التكامل الحسي والعلاج الوظيفي',
      description: 'استكشف قائمة كاملة من أحدث أدوات التكامل الحسي، أنظمة التعليق، بطانيات الضغط العميق، ومعدات غرف سنوزلين للأطباء والأخصائيين.',
      path: `/${this.langService.currentLang()}/products`,
      arSlug: 'products',
      enSlug: 'products',
    });

    this.categoriesService.getCategories().subscribe({
      next: (res) => {
        if (res.success) this.categories.set(res.data);
      },
    });

    // Subscribe to query parameters - this is our single source of truth for active filters
    this.route.queryParams.subscribe((params) => {
      const cat = params['category'] || '';
      const q = params['q'] || '';
      const sort = params['sort'] || 'newest';
      const page = Math.max(1, parseInt(params['page'] as string, 10) || 1);

      this.selectedCategory.set(cat);
      this.searchQuery.set(q);
      this.searchInputValue.set(q);
      this.currentSort.set(sort);
      this.currentPage.set(page);
      this.loadProducts();
    });
  }

  loadProducts(): void {
    const query = {
      category: this.selectedCategory() || undefined,
      q: this.searchQuery() || undefined,
      sort: this.currentSort(),
      page: this.currentPage(),
      limit: this.pageSize,
    };

    // 1. Instant Synchronous Cache Check / In-Memory Filter
    const cached = this.productsService.getCachedSync(query);
    if (cached && cached.data) {
      this.products.set(cached.data);
      if (cached.pagination) {
        this.totalPages.set(cached.pagination.totalPages || 1);
        this.totalProducts.set(cached.pagination.total || cached.data.length);
      }
      this.isLoading.set(false);
    } else {
      this.isLoading.set(true);
    }

    // 2. Fetch fresh data from backend (Stale-While-Revalidate)
    this.productsService.getProducts(query).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.products.set(res.data);
          if (res.pagination) {
            this.totalPages.set(res.pagination.totalPages || 1);
            this.totalProducts.set(res.pagination.total || res.data.length);
          }
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  /**
   * Called while the user is typing in the search box.
   * Updates searchInputValue and dynamically generates suggestions without filtering the main product grid.
   */
  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchInputValue.set(val);
    this.updateSuggestions(val);
  }

  onSearchFocus(): void {
    if (this.searchInputValue().trim().length >= 2) {
      this.updateSuggestions(this.searchInputValue());
    }
  }

  private updateSuggestions(term: string): void {
    const q = term.trim().toLowerCase();
    if (!q || q.length < 2) {
      this.suggestions.set({ products: [], categories: [] });
      this.showSuggestions.set(false);
      return;
    }

    // 1. Match Categories
    const allCats = this.categories();
    const matchedCats = allCats
      .filter((cat) => {
        const nameAr = cat.name?.ar?.toLowerCase() || '';
        const nameEn = cat.name?.en?.toLowerCase() || '';
        return nameAr.includes(q) || nameEn.includes(q);
      })
      .slice(0, 3);

    // 2. Match Products from master cached items or current products list
    const catalog =
      this.productsService.cachedProducts().length > 0
        ? this.productsService.cachedProducts()
        : this.products();

    const matchedProducts = catalog
      .filter((p) => {
        const nameAr = p.name?.ar?.toLowerCase() || '';
        const nameEn = p.name?.en?.toLowerCase() || '';
        const shortAr = p.shortDescription?.ar?.toLowerCase() || '';
        const shortEn = p.shortDescription?.en?.toLowerCase() || '';
        const descAr = p.description?.ar?.toLowerCase() || '';
        const descEn = p.description?.en?.toLowerCase() || '';
        const sensoryAr = p.sensorySystem?.ar?.toLowerCase() || '';
        const catNameAr = (p.category as any)?.name?.ar?.toLowerCase() || '';
        const catNameEn = (p.category as any)?.name?.en?.toLowerCase() || '';

        return (
          nameAr.includes(q) ||
          nameEn.includes(q) ||
          shortAr.includes(q) ||
          shortEn.includes(q) ||
          descAr.includes(q) ||
          descEn.includes(q) ||
          sensoryAr.includes(q) ||
          catNameAr.includes(q) ||
          catNameEn.includes(q)
        );
      })
      .slice(0, 5);

    this.suggestions.set({
      products: matchedProducts,
      categories: matchedCats,
    });
    this.showSuggestions.set(true);
  }

  /**
   * Commits the search and filters the main products grid.
   */
  applySearch(): void {
    const term = this.searchInputValue().trim();
    this.showSuggestions.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: term || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  clearSearch(): void {
    this.searchInputValue.set('');
    this.showSuggestions.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  selectCategorySuggestion(cat: Category): void {
    const slug = cat.slug[this.langService.currentLang()] || cat.slug.ar || cat.slug.en || cat._id;
    this.showSuggestions.set(false);
    this.searchInputValue.set('');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: slug, q: null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  navigateToProduct(prod: Product): void {
    this.showSuggestions.set(false);
    const slug = prod.slug?.[this.langService.currentLang()] || prod.slug?.ar || prod.slug?.en || prod._id;
    this.router.navigate([`/${this.langService.currentLang()}/products`, slug]);
  }

  onSortChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: val === 'newest' ? null : val, page: null },
      queryParamsHandling: 'merge',
    });
  }

  selectCategory(slug: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: slug || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    }).then(() => {
      if (typeof window !== 'undefined') {
        const el = document.querySelector('.toolbar') || document.querySelector('.page-header');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }

  getVisiblePages(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  onCategoryClick(cat: Category): void {
    const currentLang = this.langService.currentLang();
    const slug = cat.slug[currentLang] || cat.slug.ar || cat.slug.en || cat._id;
    // Toggle: if clicked again, reset to all categories
    if (this.isCategoryActive(cat)) {
      this.selectCategory('');
    } else {
      this.selectCategory(slug);
    }
  }

  isCategoryActive(cat: Category): boolean {
    const current = this.selectedCategory();
    if (!current) return false;
    let decoded = current;
    try {
      decoded = decodeURIComponent(current);
    } catch {}
    return (
      current === cat.slug?.ar ||
      current === cat.slug?.en ||
      decoded === cat.slug?.ar ||
      decoded === cat.slug?.en ||
      current === cat._id
    );
  }

  resetAllFilters(): void {
    this.searchInputValue.set('');
    this.showSuggestions.set(false);
    this.router.navigate([`/${this.langService.currentLang()}/products`]);
  }

  getSelectedCategoryName(): string {
    const slug = this.selectedCategory();
    if (!slug) return '';
    let decoded = slug;
    try {
      decoded = decodeURIComponent(slug);
    } catch {}
    const cat = this.categories().find(
      (c) =>
        c.slug.ar === slug ||
        c.slug.en === slug ||
        c.slug.ar === decoded ||
        c.slug.en === decoded ||
        c._id === slug
    );
    return cat ? (cat.name[this.langService.currentLang()] || cat.name.ar) : decoded;
  }

  getCategoryName(cat: any): string {
    if (!cat) return '';
    if (typeof cat === 'object' && cat.name) {
      return cat.name[this.langService.currentLang()] || cat.name.ar || '';
    }
    const found = this.categories().find((c) => c._id === cat);
    return found ? (found.name[this.langService.currentLang()] || found.name.ar) : '';
  }

  getCustomInquiryUrl(): string {
    const q = this.searchQuery();
    const catName = this.getSelectedCategoryName();
    let note = '';

    if (q) {
      note = `مرحباً وداق، أبحث عن منتج: "${q}" وغير متوفر في المتجر، هل يمكن توفيره لي؟`;
    } else if (catName) {
      note = `مرحباً وداق، أستفسر عن المنتجات المتوفرة في قسم: "${catName}"`;
    } else {
      note = 'مرحباً وداق، أبحث عن أداة حسية خاصة غير متوفرة في المتجر، هل يمكن توفيرها؟';
    }

    return this.whatsappService.buildCustomInquiryLink(note, this.langService.currentLang());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-container')) {
      this.showSuggestions.set(false);
    }
  }
}
