import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Project } from '../../../core/models/models';
import { LanguageService } from '../../../core/services/language.service';
import { LocalizePipe } from '../../pipes/localize.pipe';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoDirective, LocalizePipe],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.css',
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: Project;

  langService = inject(LanguageService);
}
