import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class CartFlyAnimationService {
  private platformId = inject(PLATFORM_ID);

  /**
   * Triggers the Fly-to-Cart micro-animation by delegating trajectory and styling
   * entirely to CSS classes and keyframes (@keyframes flyToCartParabolic in styles.css).
   */
  public animateFly(originElement?: HTMLElement | null, imageUrl?: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = (document.getElementById('header-cart-btn') ||
      document.querySelector('.cart-btn')) as HTMLElement | null;

    if (!originElement || !target) {
      return;
    }

    const startRect = originElement.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const startX = startRect.left + startRect.width / 2 - 26;
    const startY = startRect.top + startRect.height / 2 - 26;
    const deltaX = targetRect.left + targetRect.width / 2 - (startRect.left + startRect.width / 2);
    const deltaY = targetRect.top + targetRect.height / 2 - (startRect.top + startRect.height / 2);

    const particle = document.createElement('div');
    particle.className = 'fly-to-cart-particle';
    particle.style.setProperty('--start-x', `${startX}px`);
    particle.style.setProperty('--start-y', `${startY}px`);
    particle.style.setProperty('--target-x', `${deltaX}px`);
    particle.style.setProperty('--target-y', `${deltaY}px`);

    const img = document.createElement('img');
    img.className = 'fly-particle-img';
    img.src = imageUrl || '/images/placeholder-product.svg';
    img.alt = '';
    particle.appendChild(img);

    particle.addEventListener('animationend', () => {
      particle.remove();

      // Trigger cart button pulse/bounce
      target.classList.remove('cart-bump-animate');
      void target.offsetWidth;
      target.classList.add('cart-bump-animate');

      setTimeout(() => {
        target.classList.remove('cart-bump-animate');
      }, 500);
    });

    document.body.appendChild(particle);
  }
}
