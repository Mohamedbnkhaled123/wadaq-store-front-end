import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { WhatsappFloatComponent } from '../../../shared/components/whatsapp-float/whatsapp-float.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    WhatsappFloatComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.css',
})
export class PublicLayoutComponent implements OnInit {
  private settingsService = inject(SettingsService);

  ngOnInit(): void {
    this.settingsService.getSettings().subscribe({
      error: () => {
        // Silently handle fallback
      },
    });
  }
}
