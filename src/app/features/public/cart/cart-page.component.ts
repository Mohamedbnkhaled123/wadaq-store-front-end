import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { TranslocoDirective } from '@jsverse/transloco';

import { CartService } from '../../../core/services/cart.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { LanguageService } from '../../../core/services/language.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { LocalizePipe } from '../../../shared/pipes/localize.pipe';

import { Product, CartItem } from '../../../core/models/models';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    TranslocoDirective,
    LocalizePipe,
  ],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.css',
})
export class CartPageComponent implements OnInit {
  cartService = inject(CartService);
  whatsappService = inject(WhatsappService);
  langService = inject(LanguageService);
  settingsService = inject(SettingsService);
  authService = inject(AuthService);
  confirmDialog = inject(ConfirmDialogService);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  customerNote = signal<string>('');

  ngOnInit(): void {
    const isAr = this.langService.currentLang() === 'ar';
    const pageTitle = isAr
      ? 'سلة المشتريات — متجر ودق للتكامل الحسي'
      : 'Shopping Cart — Wadaq Sensory Store';
    this.titleService.setTitle(pageTitle);

    this.metaService.updateTag({
      name: 'description',
      content: isAr
        ? 'راجع أدوات التكامل الحسي المختارة وأكد طلب الشراء مباشرة عبر واتساب مع الدعم الفني لمتجر ودق.'
        : 'Review your selected sensory integration tools and complete your direct WhatsApp order.',
    });
  }

  async onQuantityChange(item: CartItem, newQty: number): Promise<void> {
    if (newQty <= 0) {
      await this.onRemoveItem(item);
      return;
    }
    this.cartService.updateQuantity(item.product._id, newQty);
  }

  async onRemoveItem(item: CartItem): Promise<void> {
    const isAr = this.langService.currentLang() === 'ar';
    const lang = this.langService.currentLang();
    const productName = item.product.name[lang] || item.product.name.ar;

    const confirmed = await this.confirmDialog.confirm({
      title: isAr ? 'حذف المنتج من السلة' : 'Remove Item from Cart',
      message: isAr
        ? `هل تريد بالتأكيد إزالة "${productName}" من سلة المشتريات؟`
        : `Are you sure you want to remove "${productName}" from your cart?`,
      confirmText: isAr ? 'نعم، إزالة' : 'Yes, Remove',
      cancelText: isAr ? 'إلغاء' : 'Cancel',
      type: 'danger',
      confirmIcon: 'trash',
    });

    if (confirmed) {
      this.cartService.removeItem(item.product._id);
    }
  }

  async onClearCart(): Promise<void> {
    const isAr = this.langService.currentLang() === 'ar';
    const confirmed = await this.confirmDialog.confirm({
      title: isAr ? 'تفريغ سلة المشتريات بالكامل' : 'Clear Entire Cart',
      message: isAr
        ? 'هل أنت متأكد من رغبتك في تفريغ سلة المشتريات؟ سيتم حذف جميع الأدوات الحسية المحددة حالياً.'
        : 'Are you sure you want to clear your shopping cart? All currently selected sensory tools will be removed.',
      confirmText: isAr ? 'تفريغ السلة' : 'Clear Cart',
      cancelText: isAr ? 'تراجع' : 'Keep Items',
      type: 'danger',
      confirmIcon: 'trash',
    });

    if (confirmed) {
      this.cartService.clearCart();
    }
  }

  getCheckoutUrl(): string {
    return this.whatsappService.buildCartLink(
      this.cartService.items(),
      this.langService.currentLang(),
      this.customerNote()
    );
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('images/logo.png')) {
      target.src = 'images/logo.png';
    }
  }
}
