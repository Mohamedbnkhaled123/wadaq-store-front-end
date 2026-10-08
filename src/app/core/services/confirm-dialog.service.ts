import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'primary';
  confirmIcon?: 'trash' | 'pause' | 'play' | 'alert' | 'check';
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  isOpen = signal<boolean>(false);
  options = signal<ConfirmDialogOptions | null>(null);

  private resolver: ((value: boolean) => void) | null = null;

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    this.options.set({
      confirmText: 'تأكيد الإجراء',
      cancelText: 'إلغاء التراجع',
      type: 'warning',
      ...options,
    });
    this.isOpen.set(true);

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  accept(): void {
    this.isOpen.set(false);
    if (this.resolver) {
      this.resolver(true);
      this.resolver = null;
    }
  }

  reject(): void {
    this.isOpen.set(false);
    if (this.resolver) {
      this.resolver(false);
      this.resolver = null;
    }
  }
}
