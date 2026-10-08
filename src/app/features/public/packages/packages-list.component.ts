import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { PackagesService } from '../../../core/services/packages.service';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { Package } from '../../../core/models/models';
import { PackageCardComponent } from '../../../shared/components/package-card/package-card.component';

@Component({
  selector: 'app-packages-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoDirective, PackageCardComponent],
  templateUrl: './packages-list.component.html',
  styleUrl: './packages-list.component.css',
})
export class PackagesListComponent implements OnInit {
  private packagesService = inject(PackagesService);
  langService = inject(LanguageService);
  private seo = inject(SeoService);

  packages = signal<Package[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.seo.update({
      title: 'باقات تجهيز غرف وعيادات التكامل الحسي وسنوزلين',
      description: 'باقات متكاملة لتجهيز عيادات العلاج الوظيفي وغرف سنوزلين متعددة الحواس للمراكز والمستشفيات مع الإشراف والتركيب المعتمد.',
      path: `/${this.langService.currentLang()}/packages`,
      arSlug: 'packages',
      enSlug: 'packages',
    });

    this.packagesService.getPackages().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.packages.set(res.data.filter((p: Package) => !p.isDeleted && p.isActive !== false));
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
