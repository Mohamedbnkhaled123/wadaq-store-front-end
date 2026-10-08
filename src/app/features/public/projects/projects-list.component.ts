import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { ProjectsService } from '../../../core/services/projects.service';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { Project } from '../../../core/models/models';
import { ProjectCardComponent } from '../../../shared/components/project-card/project-card.component';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule, TranslocoDirective, ProjectCardComponent],
  templateUrl: './projects-list.component.html',
  styleUrl: './projects-list.component.css'
})
export class ProjectsListComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  langService = inject(LanguageService);
  private seo = inject(SeoService);

  projects = signal<Project[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.seo.update({
      title: 'معرض تجهيزات غرف ومراكز التكامل الحسي',
      description: 'استعرض نماذج حية لغرف سنوزلين وعيادات التكامل الحسي للأطفال التي تم تصميمها وتجهيزها وتسليمها بنجاح بواسطة فريق ودق المتخصص.',
      path: `/${this.langService.currentLang()}/projects`,
      arSlug: 'projects',
      enSlug: 'projects',
    });

    this.projectsService.getProjects().subscribe({
      next: (res) => {
        if (res.success) this.projects.set(res.data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
