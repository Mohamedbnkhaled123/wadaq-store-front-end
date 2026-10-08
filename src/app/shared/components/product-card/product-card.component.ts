import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Product } from '../../../core/models/models';
import { CartService } from '../../../core/services/cart.service';
import { CartFlyAnimationService } from '../../../core/services/cart-fly-animation.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { LocalizePipe } from '../../pipes/localize.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoDirective, LocalizePipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  cartService = inject(CartService);
  cartFlyService = inject(CartFlyAnimationService);
  whatsappService = inject(WhatsappService);
  langService = inject(LanguageService);
  authService = inject(AuthService);

  justAdded = signal<boolean>(false);
  isImageLoaded = signal<boolean>(false);
  hasImageError = signal<boolean>(false);

  onImageLoad(): void {
    this.isImageLoaded.set(true);
  }

  onImageError(): void {
    this.isImageLoaded.set(true);
    this.hasImageError.set(true);
  }

  addToCart(event?: MouseEvent): void {
    const res = this.cartService.addItem(this.product, 1, false);
    if (res.success) {
      this.justAdded.set(true);
      setTimeout(() => this.justAdded.set(false), 1400);

      const targetEl = (event?.currentTarget as HTMLElement) || null;
      const imgUrl = this.product.images?.[0]?.url || '';
      this.cartFlyService.animateFly(targetEl, imgUrl);
    }
  }

  getBuyNowUrl(): string {
    return this.whatsappService.buildSingleProductLink(this.product, 1, this.langService.currentLang());
  }

  getInquiryUrl(): string {
    const name = this.product.name[this.langService.currentLang()] || this.product.name.ar;
    return this.whatsappService.buildCustomInquiryLink(
      `الاستفسار عن توفر أو بديل لمنتج: ${name}`,
      this.langService.currentLang()
    );
  }
}
