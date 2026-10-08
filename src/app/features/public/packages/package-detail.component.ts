import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { PackagesService } from '../../../core/services/packages.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { Package } from '../../../core/models/models';
import { LocalizePipe } from '../../../shared/pipes/localize.pipe';

@Component({
  selector: 'app-package-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoDirective, LocalizePipe],
  templateUrl: './package-detail.component.html',
  styleUrl: './package-detail.component.css',
})
export class PackageDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private packagesService = inject(PackagesService);
  private whatsappService = inject(WhatsappService);
  langService = inject(LanguageService);
  private seo = inject(SeoService);

  pkg = signal<Package | null>(null);
  isLoading = signal<boolean>(true);

  get whatsappUrl(): string {
    const p = this.pkg();
    if (!p) return '';
    return this.whatsappService.buildPackageLink(p, this.langService.currentLang());
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) this.loadPackage(slug);
    });
  }

  loadPackage(slug: string): void {
    this.isLoading.set(true);
    this.packagesService.getPackageBySlug(slug).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const p = res.data;
          this.pkg.set(p);

          const currentLang = this.langService.currentLang();
          const title = p.name[currentLang] || p.name.ar;
          const desc = p.shortDescription[currentLang] || p.shortDescription.ar;

          this.seo.update({
            title,
            description: desc,
            image: p.images[0]?.url,
            path: `/${currentLang}/packages/${encodeURIComponent(p.slug[currentLang] || p.slug.ar)}`,
            arSlug: `packages/${p.slug.ar}`,
            enSlug: `packages/${p.slug.en}`,
          });
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
