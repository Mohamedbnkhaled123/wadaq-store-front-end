import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { Product, Category } from '../../../core/models/models';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.css'
})
export class AdminOverviewComponent implements OnInit {
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private api = inject(ApiService);

  // Synchronous cache retrieval for instant 0ms stats without flicker on refresh
  private initialCachedProds: Product[] =
    this.productsService.getCachedSync({ all: true, limit: 100 })?.data ||
    this.productsService.cachedProducts() ||
    [];

  totalProducts = signal<number>(this.initialCachedProds.length);
  activeProducts = signal<number>(this.initialCachedProds.filter((p) => p.isActive && !p.isDeleted).length);
  inactiveProducts = signal<number>(this.initialCachedProds.filter((p) => !p.isActive && !p.isDeleted).length);
  deletedProducts = signal<number>(this.initialCachedProds.filter((p) => p.isDeleted).length);
  packagesCount = signal<number>(3);

  categories = signal<Category[]>(this.categoriesService.getCachedSync(true)?.data || []);
  recentProducts = signal<Product[]>(this.initialCachedProds.slice(0, 8));
  categoryStats = signal<Array<{ nameAr: string; nameEn: string; slug: string; count: number; percentage: number }>>([]);

  ngOnInit(): void {
    if (this.initialCachedProds.length > 0) {
      this.computeCategoryStats(this.initialCachedProds);
    }
    this.loadDashboardData();
  }

  private computeCategoryStats(prods: Product[]): void {
    const catMap: Record<string, { nameAr: string; nameEn: string; slug: string; count: number }> = {
      visual: { nameAr: 'المعالجة البصرية', nameEn: 'Visual Processing', slug: 'visual', count: 0 },
      proprioceptive: { nameAr: 'الحس العميق', nameEn: 'Proprioceptive Processing', slug: 'proprioceptive', count: 0 },
      vestibular: { nameAr: 'المعالجة الدهليزية', nameEn: 'Vestibular Processing', slug: 'vestibular', count: 0 },
      tactile: { nameAr: 'المعالجة التلامسية', nameEn: 'Tactile Processing', slug: 'tactile', count: 0 },
    };

    prods.forEach((p) => {
      const catSlug = (p.category as any)?.slug?.en || '';
      const sysAr = p.sensorySystem?.ar || '';
      if (catSlug.includes('visual') || sysAr.includes('بصرية')) catMap['visual'].count++;
      else if (catSlug.includes('proprioceptive') || sysAr.includes('العميق')) catMap['proprioceptive'].count++;
      else if (catSlug.includes('vestibular') || sysAr.includes('دهليزية')) catMap['vestibular'].count++;
      else if (catSlug.includes('tactile') || sysAr.includes('تلامسية') || sysAr.includes('لمس')) catMap['tactile'].count++;
    });

    const total = prods.length || 1;
    const statsList = Object.values(catMap).map((item) => ({
      ...item,
      percentage: Math.round((item.count / total) * 100),
    }));

    this.categoryStats.set(statsList);
  }

  loadDashboardData(): void {
    // 1. Load Categories
    this.categoriesService.getCategories(true).subscribe({
      next: (res) => {
        if (res.success && res.data) this.categories.set(res.data);
      },
    });

    // 2. Load Products and calculate real stats
    this.productsService.getProducts({ all: true, limit: 100 }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const prods = res.data;
          this.totalProducts.set(prods.length);
          this.activeProducts.set(prods.filter((p) => p.isActive && !p.isDeleted).length);
          this.inactiveProducts.set(prods.filter((p) => !p.isActive && !p.isDeleted).length);
          this.deletedProducts.set(prods.filter((p) => p.isDeleted).length);

          // Top 8 recent products
          this.recentProducts.set(prods.slice(0, 8));
          this.computeCategoryStats(prods);
        }
      },
    });

    // 3. Load packages count
    this.api.get<any[]>('/packages', { all: true }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.packagesCount.set(res.data.length);
        }
      },
    });
  }

  getCategoryName(p: Product): string {
    if (p.sensorySystem?.ar) return p.sensorySystem.ar;
    if (p.category && typeof p.category === 'object' && 'name' in p.category) {
      return (p.category as any).name?.ar || 'حسي';
    }
    return 'حسي';
  }
}
