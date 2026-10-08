import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ProductsService } from '../../../core/services/products.service';
import { CartService } from '../../../core/services/cart.service';
import { CartFlyAnimationService } from '../../../core/services/cart-fly-animation.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';
import { Product } from '../../../core/models/models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { LocalizePipe } from '../../../shared/pipes/localize.pipe';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslocoDirective,
    ProductCardComponent,
    LocalizePipe,
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productsService = inject(ProductsService);
  private cartService = inject(CartService);
  private cartFlyService = inject(CartFlyAnimationService);
  private whatsappService = inject(WhatsappService);
  langService = inject(LanguageService);
  authService = inject(AuthService);
  private seo = inject(SeoService);

  private initialSlug = this.route.snapshot.paramMap.get('slug') || '';
  product = signal<Product | null>(
    this.initialSlug ? this.productsService.getInMemoryProduct(this.initialSlug) || null : null
  );
  relatedProducts = signal<Product[]>([]);
  isLoading = signal<boolean>(!this.product());
  selectedImage = signal<string>(this.product()?.images?.[0]?.url || '');
  isMainImageLoaded = signal<boolean>(false);
  quantity = signal<number>(1);
  justAdded = signal<boolean>(false);

  onMainImageLoad(): void {
    this.isMainImageLoaded.set(true);
  }

  selectImage(url: string): void {
    if (this.selectedImage() !== url) {
      this.isMainImageLoaded.set(false);
      this.selectedImage.set(url);
    }
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) {
        this.loadProduct(slug);
      }
    });
  }

  loadProduct(slug: string): void {
    // 1. Instant Synchronous Cache Check
    const cached = this.productsService.getInMemoryProduct(slug);
    if (cached) {
      this.product.set(cached);
      this.isLoading.set(false);
      if (cached.images && cached.images.length > 0) {
        this.selectedImage.set(cached.images[0].url);
      }
      this.applySeo(cached);
    } else if (!this.product()) {
      this.isLoading.set(true);
    }

    // 2. Network/Service Fetch (Stale-While-Revalidate)
    this.productsService.getProductBySlug(slug).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const p = res.data;
          this.product.set(p);
          if (!this.selectedImage() && p.images && p.images.length > 0) {
            this.selectedImage.set(p.images[0].url);
          }
          this.applySeo(p);

          // Fetch related products
          this.productsService.getRelatedProducts(slug).subscribe({
            next: (relRes) => {
              if (relRes.success) this.relatedProducts.set(relRes.data);
            },
          });
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private applySeo(p: Product): void {
    const currentLang = this.langService.currentLang();
    const title = p.name[currentLang] || p.name.ar;
    const desc = p.shortDescription[currentLang] || p.shortDescription.ar;
    const imgUrl = p.images[0]?.url;

    this.seo.update({
      title,
      description: desc,
      image: imgUrl,
      path: `/${currentLang}/products/${encodeURIComponent(p.slug[currentLang] || p.slug.ar)}`,
      arSlug: `products/${p.slug.ar}`,
      enSlug: `products/${p.slug.en}`,
      type: 'product',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: title,
        description: desc,
        image: p.images.map((img) => img.url),
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: 'EGP',
          availability: p.inStock && !p.isDeleted && p.isActive !== false
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        },
      },
    });
  }

  increaseQty(): void {
    this.quantity.update((q) => q + 1);
  }

  decreaseQty(): void {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  addToCart(event?: MouseEvent): void {
    const p = this.product();
    if (p) {
      const res = this.cartService.addItem(p, this.quantity(), false);
      if (res.success) {
        this.justAdded.set(true);
        setTimeout(() => this.justAdded.set(false), 1400);

        const targetEl = (event?.currentTarget as HTMLElement) || null;
        const imgUrl = this.selectedImage() || p.images?.[0]?.url || '';
        this.cartFlyService.animateFly(targetEl, imgUrl);
      }
    }
  }

  getSingleProductBuyUrl(): string {
    const p = this.product();
    if (!p) return '';
    return this.whatsappService.buildSingleProductLink(p, this.quantity(), this.langService.currentLang());
  }

  getInquiryUrl(): string {
    const p = this.product();
    if (!p) return '';
    const name = p.name[this.langService.currentLang()] || p.name.ar;
    return this.whatsappService.buildCustomInquiryLink(
      `الاستفسار عن موعد توفر أو ترشيح بديل لمنتج: "${name}"`,
      this.langService.currentLang()
    );
  }
}
