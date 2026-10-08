import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Product, Category } from '../../../core/models/models';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-products.component.html',
  styleUrl: './admin-products.component.css'
})
export class AdminProductsComponent implements OnInit {
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private router = inject(Router);
  private confirmDialog = inject(ConfirmDialogService);

  // Synchronous cache retrieval so tick 0 immediately contains products and categories (0ms flicker)
  private initialCachedProds: Product[] =
    this.productsService.getCachedSync({ all: true, limit: 100 })?.data ||
    this.productsService.cachedProducts() ||
    [];
  private initialCachedCats: Category[] =
    this.categoriesService.getCachedSync(true)?.data || [];

  allProducts = signal<Product[]>(this.initialCachedProds);
  filteredProducts = signal<Product[]>(this.initialCachedProds);
  categories = signal<Category[]>(this.initialCachedCats);

  isLoading = signal<boolean>(this.initialCachedProds.length === 0);
  currentStatus = signal<string>('all');
  selectedCategory = signal<string>('');
  searchQ = '';

  totalCount = signal<number>(this.initialCachedProds.length);
  activeCount = signal<number>(this.initialCachedProds.filter((p) => p.isActive && !p.isDeleted).length);
  inactiveCount = signal<number>(this.initialCachedProds.filter((p) => !p.isActive && !p.isDeleted).length);
  deletedCount = signal<number>(this.initialCachedProds.filter((p) => p.isDeleted).length);

  ngOnInit(): void {
    // If not loaded synchronously, check cache again
    if (this.categories().length === 0) {
      const cachedCats = this.categoriesService.getCachedSync(true);
      if (cachedCats?.data?.length) {
        this.categories.set(cachedCats.data);
      }
    }

    if (this.allProducts().length === 0) {
      const cached = this.productsService.getCachedSync({ all: true, limit: 100 });
      if (cached?.data?.length) {
        this.populateProducts(cached.data);
        this.isLoading.set(false);
      } else if (this.productsService.cachedProducts().length > 0) {
        this.populateProducts(this.productsService.cachedProducts());
        this.isLoading.set(false);
      } else {
        this.isLoading.set(true);
      }
    } else {
      this.applyLocalFilters();
    }

    this.loadCategories();
    this.loadProducts();
  }

  onEditProduct(p: Product, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const id = p._id || (p as any).id;
    if (id) {
      this.router.navigate(['/admin/products', id, 'edit']);
    }
  }

  private populateProducts(list: Product[]): void {
    this.allProducts.set(list);
    this.totalCount.set(list.length);
    this.activeCount.set(list.filter((p) => p.isActive && !p.isDeleted).length);
    this.inactiveCount.set(list.filter((p) => !p.isActive && !p.isDeleted).length);
    this.deletedCount.set(list.filter((p) => p.isDeleted).length);
    this.applyLocalFilters();
  }

  loadCategories(): void {
    this.categoriesService.getCategories(true).subscribe({
      next: (res) => {
        if (res.success) this.categories.set(res.data);
      },
    });
  }

  loadProducts(): void {
    if (this.allProducts().length === 0) {
      this.isLoading.set(true);
    }
    this.productsService
      .getProducts({
        all: true,
        limit: 100,
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.populateProducts(res.data);
          }
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  applyLocalFilters(): void {
    let list = this.allProducts();

    // 1. Status Filter
    const st = this.currentStatus();
    if (st === 'active') {
      list = list.filter((p) => p.isActive && !p.isDeleted);
    } else if (st === 'inactive') {
      list = list.filter((p) => !p.isActive && !p.isDeleted);
    } else if (st === 'deleted') {
      list = list.filter((p) => p.isDeleted);
    }

    // 2. Category Filter
    const cat = this.selectedCategory();
    if (cat) {
      list = list.filter((p) => {
        const catId = (p.category as any)?._id || p.category;
        return catId === cat;
      });
    }

    // 3. Search Query
    const q = this.searchQ.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.ar?.toLowerCase().includes(q) ||
          p.name.en?.toLowerCase().includes(q) ||
          p.sensorySystem?.ar?.toLowerCase().includes(q) ||
          p.shortDescription?.ar?.toLowerCase().includes(q)
      );
    }

    this.filteredProducts.set(list);
  }

  setStatusFilter(status: string): void {
    this.currentStatus.set(status);
    this.applyLocalFilters();
  }

  onCategoryFilterChange(catId: string): void {
    this.selectedCategory.set(catId);
    this.applyLocalFilters();
  }

  onSearchInput(): void {
    this.applyLocalFilters();
  }

  resetFilters(): void {
    this.currentStatus.set('all');
    this.selectedCategory.set('');
    this.searchQ = '';
    this.applyLocalFilters();
  }

  getCategorySlug(p: Product): string {
    return (p.category as any)?.slug?.en || 'general';
  }

  getCategoryName(p: Product): string {
    if (p.sensorySystem?.ar) return p.sensorySystem.ar;
    if (p.category && typeof p.category === 'object' && 'name' in p.category) {
      return (p.category as any).name?.ar || 'عام';
    }
    return 'عام';
  }

  async toggleActive(p: Product): Promise<void> {
    const isDeactivating = p.isActive;
    const confirmed = await this.confirmDialog.confirm({
      title: isDeactivating ? 'تأكيد إيقاف تنشيط المنتج' : 'تأكيد تنشيط المنتج',
      message: isDeactivating
        ? `هل أنت متأكد من إيقاف تنشيط المنتج "${p.name.ar}"؟ سيتم إخفاؤه من متجر العملاء ولن يتمكن أحد من شرائه حتى تعيد تنشيطه.`
        : `هل ترغب في إعادة تنشيط المنتج "${p.name.ar}" وإتاحته للشراء في المتجر؟`,
      confirmText: isDeactivating ? 'نعم، إيقاف التنشيط' : 'تنشيط المنتج',
      cancelText: 'تراجع',
      type: isDeactivating ? 'warning' : 'primary',
      confirmIcon: isDeactivating ? 'pause' : 'play',
    });
    if (!confirmed) return;

    this.productsService.toggleProduct(p._id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          p.isActive = res.data.isActive;
          this.loadProducts();
        }
      },
    });
  }

  async deleteProduct(p: Product): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'تأكيد حذف المنتج مؤقتاً',
      message: `هل أنت متأكد من حذف المنتج "${p.name.ar}" مؤقتاً؟ سيتم نقله إلى سلة المحذوفات وإخفاؤه من المتجر.`,
      confirmText: 'نعم، حذف المنتج',
      cancelText: 'إلغاء',
      type: 'danger',
      confirmIcon: 'trash',
    });
    if (!confirmed) return;

    this.productsService.deleteProduct(p._id).subscribe({
      next: () => this.loadProducts(),
    });
  }

  async restoreProduct(p: Product): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'استعادة المنتج المحذوف',
      message: `هل ترغب في استعادة المنتج "${p.name.ar}" وإعادته لقائمة المنتجات المتاحة؟`,
      confirmText: 'استعادة المنتج',
      cancelText: 'تراجع',
      type: 'primary',
      confirmIcon: 'play',
    });
    if (!confirmed) return;

    this.productsService.restoreProduct(p._id).subscribe({
      next: () => this.loadProducts(),
    });
  }
}
