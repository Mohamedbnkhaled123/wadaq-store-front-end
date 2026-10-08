import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  isFirstTimeSetup = signal<boolean>(false);
  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  ngOnInit(): void {
    if (this.auth.isAdmin()) {
      this.router.navigate(['/admin/products']);
      return;
    }

    this.checkSetupStatus();
  }

  checkSetupStatus(): void {
    this.auth.getSetupStatus().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.isFirstTimeSetup.set(!res.data.isInitialized);
        }
      },
      error: () => {
        this.isFirstTimeSetup.set(false);
      },
    });
  }

  onSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.isFirstTimeSetup()) {
      this.handleSetup();
    } else {
      this.handleLogin();
    }
  }

  private handleSetup(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage.set('كلمة المرور يجب أن لا تقل عن 8 أحرف وأرقام');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
      return;
    }

    this.isLoading.set(true);
    this.auth.setupAdmin({
      name: this.name.trim() || 'Admin',
      email: this.email.trim().toLowerCase(),
      password: this.password,
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.successMessage.set('تم إنشاء الحساب بنجاح! جاري تحويلك للوحة التحكم...');
          setTimeout(() => {
            this.router.navigate(['/admin/products']);
          }, 800);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'حدث خطأ أثناء إنشاء حساب المسؤول.');
      },
    });
  }

  private handleLogin(): void {
    if (!this.email || !this.password) return;

    this.isLoading.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.router.navigate(['/admin/products']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        } else if (err.status === 429) {
          this.errorMessage.set('تم تجاوز عدد محاولات الدخول المسموح بها، يرجى المحاولة بعد قليل.');
        } else {
          this.errorMessage.set('تعذر تسجيل الدخول حالياً، يرجى التحقق من الاتصال والمحاولة لاحقاً.');
        }
      },
    });
  }
}
