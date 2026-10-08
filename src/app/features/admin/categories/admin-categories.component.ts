import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriesService } from '../../../core/services/categories.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Category } from '../../../core/models/models';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-categories.component.html',
  styleUrl: './admin-categories.component.css'
})
export class AdminCategoriesComponent implements OnInit {
  private categoriesService = inject(CategoriesService);
  private confirmDialog = inject(ConfirmDialogService);

  categories = signal<Category[]>([]);
  isModalOpen = signal<boolean>(false);
  editingCat = signal<Category | null>(null);

  formData: any = { name: { ar: '', en: '' }, order: 0 };

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoriesService.getCategories(true).subscribe({
      next: (res) => {
        if (res.success) this.categories.set(res.data);
      },
    });
  }

  openAddModal(): void {
    this.editingCat.set(null);
    this.formData = { name: { ar: '', en: '' }, order: this.categories().length + 1 };
    this.isModalOpen.set(true);
  }

  openEditModal(cat: Category): void {
    this.editingCat.set(cat);
    this.formData = { name: { ...cat.name }, order: cat.order };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveCat(): void {
    const current = this.editingCat();
    if (current) {
      this.categoriesService.updateCategory(current._id, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadCategories();
        },
      });
    } else {
      this.categoriesService.createCategory(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadCategories();
        },
      });
    }
  }

  async deleteCat(cat: Category): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'تأكيد حذف التصنيف',
      message: `هل أنت متأكد من حذف تصنيف "${cat.name.ar}"؟ قد يؤثر ذلك على تصفية المنتجات المرتبطة به.`,
      confirmText: 'نعم، حذف التصنيف',
      cancelText: 'إلغاء التراجع',
      type: 'danger',
      confirmIcon: 'trash',
    });
    if (!confirmed) return;

    this.categoriesService.deleteCategory(cat._id).subscribe({
      next: () => this.loadCategories(),
    });
  }

  async restoreCat(cat: Category): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'استعادة التصنيف',
      message: `هل ترغب في استعادة تصنيف "${cat.name.ar}"؟`,
      confirmText: 'استعادة التصنيف',
      cancelText: 'تراجع',
      type: 'primary',
      confirmIcon: 'play',
    });
    if (!confirmed) return;

    this.categoriesService.restoreCategory(cat._id).subscribe({
      next: () => this.loadCategories(),
    });
  }
}
