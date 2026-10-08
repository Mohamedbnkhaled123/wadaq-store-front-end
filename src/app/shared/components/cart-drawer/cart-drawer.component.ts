import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { CartService } from '../../../core/services/cart.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { LocalizePipe } from '../../pipes/localize.pipe';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoDirective, LocalizePipe],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.css',
})
export class CartDrawerComponent {
  cartService = inject(CartService);
  whatsappService = inject(WhatsappService);
  langService = inject(LanguageService);
  authService = inject(AuthService);

  getCheckoutUrl(): string {
    return this.whatsappService.buildCartLink(
      this.cartService.items(),
      this.langService.currentLang()
    );
  }
}
