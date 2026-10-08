import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PackagesService } from '../../../core/services/packages.service';
import { ProductsService } from '../../../core/services/products.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Package, Product } from '../../../core/models/models';

@Component({
  selector: 'app-admin-packages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-packages.component.html',
  styleUrl: './admin-packages.component.css'
})
export class AdminPackagesComponent implements OnInit {
  private packagesService = inject(PackagesService);
  private productsService = inject(ProductsService);
  public settingsService = inject(SettingsService);
  private confirmDialog = inject(ConfirmDialogService);

  packages = signal<Package[]>([]);
  availableProducts = signal<Product[]>([]);
  isModalOpen = signal<boolean>(false);
  editingPkg = signal<Package | null>(null);

  formData: any = this.getEmptyFormData();

  ngOnInit(): void {
    this.loadPackages();
    this.settingsService.getSettings().subscribe();
    this.productsService.getProducts({ all: true, limit: 100 }).subscribe({
      next: (res) => {
        if (res.success) this.availableProducts.set(res.data);
      },
    });
  }

  loadPackages(): void {
    this.packagesService.getPackages(true).subscribe({
      next: (res) => {
        if (res.success) this.packages.set(res.data);
      },
    });
  }

  openAddModal(): void {
    this.editingPkg.set(null);
    this.formData = this.getEmptyFormData();
    this.isModalOpen.set(true);
  }

  openEditModal(p: Package): void {
    this.editingPkg.set(p);
    this.formData = {
      name: { ...p.name },
      shortDescription: { ...p.shortDescription },
      description: { ...p.description },
      price: p.price,
      tier: p.tier,
      roomSize: p.roomSize ? { ...p.roomSize } : { ar: '', en: '' },
      items: [...p.items],
      isActive: p.isActive,
    };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  savePackage(): void {
    const current = this.editingPkg();
    if (current) {
      this.packagesService.updatePackage(current._id, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadPackages();
        },
      });
    } else {
      this.packagesService.createPackage(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadPackages();
        },
      });
    }
  }

  async toggleActive(p: Package): Promise<void> {
    const isDeactivating = p.isActive;
    const confirmed = await this.confirmDialog.confirm({
      title: isDeactivating ? 'تأكيد إيقاف تنشيط الباقة' : 'تأكيد تنشيط الباقة',
      message: isDeactivating
        ? `هل أنت متأكد من إيقاف تنشيط باقة "${p.name.ar}"؟ سيتم إخفاؤها فوراً من المتجر والعملاء.`
        : `هل ترغب في إعادة تنشيط باقة "${p.name.ar}" وإتاحتها للعملاء في المتجر؟`,
      confirmText: isDeactivating ? 'نعم، إيقاف التنشيط' : 'تنشيط الباقة',
      cancelText: 'تراجع',
      type: isDeactivating ? 'warning' : 'primary',
      confirmIcon: isDeactivating ? 'pause' : 'play',
    });
    if (!confirmed) return;

    this.packagesService.togglePackage(p._id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          p.isActive = res.data.isActive;
        }
      },
    });
  }

  async deletePackage(p: Package): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'تأكيد حذف باقة التجهيز',
      message: `هل أنت متأكد من حذف باقة "${p.name.ar}" نهائياً من المتجر؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'نعم، حذف الباقة',
      cancelText: 'إلغاء التراجع',
      type: 'danger',
      confirmIcon: 'trash',
    });
    if (!confirmed) return;

    this.packagesService.deletePackage(p._id).subscribe({
      next: () => this.loadPackages(),
    });
  }

  async toggleSectionActive(): Promise<void> {
    const current = this.settingsService.showPackagesSection();
    const confirmed = await this.confirmDialog.confirm({
      title: current ? 'تأكيد إخفاء قسم باقات التجهيز' : 'تأكيد إظهار قسم باقات التجهيز',
      message: current
        ? 'هل أنت متأكد من إيقاف تنشيط وإخفاء قسم باقات تجهيز الغرف بالكامل من الصفحة الرئيسية؟ لن يظهر القسم لزوار المتجر.'
        : 'هل ترغب في تنشيط وإظهار قسم باقات تجهيز الغرف في الصفحة الرئيسية للمتجر؟',
      confirmText: current ? 'نعم، إخفاء القسم' : 'تنشيط وإظهار القسم',
      cancelText: 'تراجع',
      type: current ? 'warning' : 'primary',
      confirmIcon: current ? 'pause' : 'play',
    });
    if (!confirmed) return;

    this.settingsService.setPackagesSectionActive(!current).subscribe();
  }

  private getEmptyFormData() {
    return {
      name: { ar: '', en: '' },
      shortDescription: { ar: '', en: '' },
      description: { ar: '', en: '' },
      price: 0,
      tier: 'standard',
      roomSize: { ar: '', en: '' },
      items: [],
      isActive: true,
    };
  }
}
