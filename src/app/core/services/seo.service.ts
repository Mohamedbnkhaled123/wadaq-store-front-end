import { inject, Injectable, DOCUMENT } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

export interface SeoConfig {
  title: string;
  description: string;
  image?: string;
  path?: string;
  type?: 'website' | 'article' | 'product';
  schema?: Record<string, any>;
  arSlug?: string;
  enSlug?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  update(config: SeoConfig): void {
    const fullTitle = `${config.title} | متجر ودق للتكامل الحسي`;
    this.title.setTitle(fullTitle);

    this.meta.updateTag({ name: 'description', content: config.description });

    // OpenGraph
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:type', content: config.type || 'website' });

    const imageUrl = config.image || `${environment.siteUrl}/images/logo.png`;
    this.meta.updateTag({ property: 'og:image', content: imageUrl });

    const currentUrl = config.path
      ? `${environment.siteUrl}${config.path}`
      : environment.siteUrl;
    this.meta.updateTag({ property: 'og:url', content: currentUrl });

    // Canonical link
    this.updateCanonical(currentUrl);

    // Hreflang links
    if (config.arSlug && config.enSlug) {
      this.updateHreflang(config.arSlug, config.enSlug);
    }

    // JSON-LD structured data
    if (config.schema) {
      this.setJsonLd(config.schema);
    }
  }

  private updateCanonical(url: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private updateHreflang(arPath: string, enPath: string): void {
    // Remove existing hreflang tags if any
    const existing = this.document.querySelectorAll('link[rel="alternate"][hreflang]');
    existing.forEach((el) => el.remove());

    const arLink = this.document.createElement('link');
    arLink.setAttribute('rel', 'alternate');
    arLink.setAttribute('hreflang', 'ar');
    arLink.setAttribute('href', `${environment.siteUrl}/ar/${arPath}`);
    this.document.head.appendChild(arLink);

    const enLink = this.document.createElement('link');
    enLink.setAttribute('rel', 'alternate');
    enLink.setAttribute('hreflang', 'en');
    enLink.setAttribute('href', `${environment.siteUrl}/en/${enPath}`);
    this.document.head.appendChild(enLink);

    const defLink = this.document.createElement('link');
    defLink.setAttribute('rel', 'alternate');
    defLink.setAttribute('hreflang', 'x-default');
    defLink.setAttribute('href', `${environment.siteUrl}/ar/${arPath}`);
    this.document.head.appendChild(defLink);
  }

  public setJsonLd(schema: Record<string, any>): void {
    let script = this.document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }
}
