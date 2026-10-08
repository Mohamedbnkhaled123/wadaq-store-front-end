import { inject, Injectable, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product, CartItem } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  public items = signal<CartItem[]>([]);
  public isOpen = signal<boolean>(false);

  public totalCount = computed(() =>
    this.items().reduce((total, item) => total + item.quantity, 0)
  );

  public totalPrice = computed(() =>
    this.items().reduce((total, item) => total + item.product.price * item.quantity, 0)
  );

  constructor() {
    this.loadCart();
  }

  private loadCart(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const saved = localStorage.getItem('wadaq_cart');
      if (saved) {
        this.items.set(JSON.parse(saved));
      }
    } catch {
      this.items.set([]);
    }
  }

  private saveCart(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      localStorage.setItem('wadaq_cart', JSON.stringify(this.items()));
    } catch {
      // Storage quota or browser privacy mode
    }
  }

  /**
   * Adds product to cart.
   * Returns false if blocked (e.g. user is Admin or product is unavailable).
   */
  public addItem(product: Product, quantity = 1, openDrawer = false): { success: boolean; reason?: string } {
    if (this.authService.isAdmin()) {
      return {
        success: false,
        reason: 'admin_restricted',
      };
    }

    if (product.isDeleted || product.isActive === false || product.inStock === false) {
      return {
        success: false,
        reason: 'product_unavailable',
      };
    }

    const currentItems = [...this.items()];
    const index = currentItems.findIndex((item) => item.product._id === product._id);

    if (index > -1) {
      currentItems[index] = {
        ...currentItems[index],
        quantity: currentItems[index].quantity + quantity,
      };
    } else {
      currentItems.push({ product, quantity });
    }

    this.items.set(currentItems);
    this.saveCart();
    if (openDrawer) {
      this.isOpen.set(true);
    }

    return { success: true };
  }

  public updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    const updated = this.items().map((item) =>
      item.product._id === productId ? { ...item, quantity } : item
    );
    this.items.set(updated);
    this.saveCart();
  }

  public removeItem(productId: string): void {
    const updated = this.items().filter((item) => item.product._id !== productId);
    this.items.set(updated);
    this.saveCart();
  }

  public clearCart(): void {
    this.items.set([]);
    this.saveCart();
  }

  public openCart(): void {
    this.isOpen.set(true);
  }

  public closeCart(): void {
    this.isOpen.set(false);
  }

  public toggleCart(): void {
    this.isOpen.update((v) => !v);
  }
}
