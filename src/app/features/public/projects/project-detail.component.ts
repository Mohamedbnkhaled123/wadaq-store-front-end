import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ProjectsService } from '../../../core/services/projects.service';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { Project } from '../../../core/models/models';
import { LocalizePipe } from '../../../shared/pipes/localize.pipe';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoDirective, LocalizePipe],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css'
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private projectsService = inject(ProjectsService);
  langService = inject(LanguageService);
  private seo = inject(SeoService);

  project = signal<Project | null>(null);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) this.loadProject(slug);
    });
  }

  loadProject(slug: string): void {
    this.isLoading.set(true);
    this.projectsService.getProjectBySlug(slug).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const p = res.data;
          this.project.set(p);

          const currentLang = this.langService.currentLang();
          const title = p.title[currentLang] || p.title.ar;
          const desc = p.description[currentLang] || p.description.ar;

          this.seo.update({
            title,
            description: desc,
            image: p.images[0]?.url,
            path: `/${currentLang}/projects/${encodeURIComponent(p.slug[currentLang] || p.slug.ar)}`,
            arSlug: `projects/${p.slug.ar}`,
            enSlug: `projects/${p.slug.en}`,
          });
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
