import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialogComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
  host: { ngSkipHydration: 'true' }
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Desktop sidebar collapse state */
  isSidebarCollapsed = signal<boolean>(false);

  /** Mobile navigation collapse state */
  isNavCollapsed = signal<boolean>(true);

  constructor() {
    if (this.isBrowser) {
      const saved = localStorage.getItem('wadaq_admin_sidebar_collapsed');
      if (saved !== null) {
        this.isSidebarCollapsed.set(saved === 'true');
      }
    }
  }

  toggleSidebar() {
    this.isSidebarCollapsed.update(v => {
      const next = !v;
      if (this.isBrowser) {
        localStorage.setItem('wadaq_admin_sidebar_collapsed', String(next));
      }
      return next;
    });
  }

  toggleNav() {
    this.isNavCollapsed.update(v => !v);
  }

  closeNav() {
    this.isNavCollapsed.set(true);
  }
}
