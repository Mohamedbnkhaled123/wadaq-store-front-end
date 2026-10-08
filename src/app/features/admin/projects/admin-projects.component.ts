import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectsService } from '../../../core/services/projects.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Project } from '../../../core/models/models';

@Component({
  selector: 'app-admin-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-projects.component.html',
  styleUrl: './admin-projects.component.css'
})
export class AdminProjectsComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  public settingsService = inject(SettingsService);
  private confirmDialog = inject(ConfirmDialogService);

  projects = signal<Project[]>([]);
  isModalOpen = signal<boolean>(false);
  editingProj = signal<Project | null>(null);
  imageUrlInput = '';

  formData: any = this.getEmptyFormData();

  ngOnInit(): void {
    this.loadProjects();
    this.settingsService.getSettings().subscribe();
  }

  loadProjects(): void {
    this.projectsService.getProjects(true).subscribe({
      next: (res) => {
        if (res.success) this.projects.set(res.data);
      },
    });
  }

  openAddModal(): void {
    this.editingProj.set(null);
    this.formData = this.getEmptyFormData();
    this.imageUrlInput = '';
    this.isModalOpen.set(true);
  }

  openEditModal(p: Project): void {
    this.editingProj.set(p);
    this.formData = {
      title: { ...p.title },
      clientName: p.clientName ? { ...p.clientName } : { ar: '', en: '' },
      location: p.location ? { ...p.location } : { ar: '', en: '' },
      description: { ...p.description },
      isActive: p.isActive,
    };
    this.imageUrlInput = p.images?.[0]?.url || '';
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveProject(): void {
    const payload = {
      ...this.formData,
      images: this.imageUrlInput
        ? [{ url: this.imageUrlInput, publicId: '', alt: { ar: this.formData.title.ar, en: this.formData.title.en } }]
        : [],
    };

    const current = this.editingProj();
    if (current) {
      this.projectsService.updateProject(current._id, payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadProjects();
        },
      });
    } else {
      this.projectsService.createProject(payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadProjects();
        },
      });
    }
  }

  async toggleActive(p: Project): Promise<void> {
    const isDeactivating = p.isActive;
    const confirmed = await this.confirmDialog.confirm({
      title: isDeactivating ? 'تأكيد إيقاف تنشيط المشروع' : 'تأكيد تنشيط المشروع',
      message: isDeactivating
        ? `هل أنت متأكد من إيقاف تنشيط المشروع "${p.title.ar}"؟ سيتم إخفاؤه من معرض الأعمال أمام العملاء.`
        : `هل ترغب في إعادة تنشيط المشروع "${p.title.ar}" وإظهاره في معرض الأعمال؟`,
      confirmText: isDeactivating ? 'نعم، إيقاف التنشيط' : 'تنشيط المشروع',
      cancelText: 'تراجع',
      type: isDeactivating ? 'warning' : 'primary',
      confirmIcon: isDeactivating ? 'pause' : 'play',
    });
    if (!confirmed) return;

    this.projectsService.toggleProject(p._id, p.isActive).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          p.isActive = res.data.isActive;
        }
      },
    });
  }

  async deleteProject(p: Project): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'تأكيد حذف المشروع',
      message: `هل أنت متأكد من حذف المشروع "${p.title.ar}" نهائياً من معرض الأعمال؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'نعم، حذف المشروع',
      cancelText: 'إلغاء التراجع',
      type: 'danger',
      confirmIcon: 'trash',
    });
    if (!confirmed) return;

    this.projectsService.deleteProject(p._id).subscribe({
      next: () => this.loadProjects(),
    });
  }

  async toggleSectionActive(): Promise<void> {
    const current = this.settingsService.showProjectsSection();
    const confirmed = await this.confirmDialog.confirm({
      title: current ? 'تأكيد إخفاء قسم معرض الأعمال' : 'تأكيد إظهار قسم معرض الأعمال',
      message: current
        ? 'هل أنت متأكد من إيقاف تنشيط وإخفاء قسم معرض الأعمال / التجهيزات بالكامل من الصفحة الرئيسية؟ لن يظهر القسم لزوار المتجر.'
        : 'هل ترغب في تنشيط وإظهار قسم معرض الأعمال والتجهيزات في الصفحة الرئيسية للمتجر؟',
      confirmText: current ? 'نعم، إخفاء القسم' : 'تنشيط وإظهار القسم',
      cancelText: 'تراجع',
      type: current ? 'warning' : 'primary',
      confirmIcon: current ? 'pause' : 'play',
    });
    if (!confirmed) return;

    this.settingsService.setProjectsSectionActive(!current).subscribe();
  }

  private getEmptyFormData() {
    return {
      title: { ar: '', en: '' },
      clientName: { ar: '', en: '' },
      location: { ar: '', en: '' },
      description: { ar: '', en: '' },
      isActive: true,
    };
  }
}
