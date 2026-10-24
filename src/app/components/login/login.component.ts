import { Component, OnInit, inject, signal } from '@angular/core';
import { authErrorMessage, normalizeMobile } from '../../services/auth/auth-form';
import { finalize } from 'rxjs';
import { LoginDto } from '../../models/user/loginDto';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth/auth-service';
import { ActivatedRoute, Router } from '@angular/router';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [FormsModule],
  standalone: true,
})
export class LoginComponent implements OnInit {
  private toastr = inject(ToastrService);
  private api = inject(AuthService);
  private router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly errorMessage = signal('');
  readonly isSubmitting = signal(false);
  constructor() {}
  private showError(message: string): void { this.errorMessage.set(message); }
  dto: LoginDto = {
    mobileNumber: '',
    password: '',
  };
  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('reason') === 'session-expired') {
      this.showError('اعتبار ورود شما تأیید نشد؛ دوباره وارد شوید.');
    }
  }
  private onValidateModel = (dto: LoginDto): boolean => {
    const phoneRegex = /^09[0-9]{9}$/;

    if (!dto.mobileNumber || dto.mobileNumber.trim() === '') {
      this.showError('شماره تلفن نمی‌تواند خالی باشد');
      return false;
    }
    if (!dto.password || dto.password.trim() === '') {
      this.showError('رمز عبور نمی‌تواند خالی باشد');
      return false;
    }
    if (!phoneRegex.test(dto.mobileNumber)) {
      this.showError('شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد');
      return false;
    }

    return true;
  };
  public onLogin(): void {
    if (this.isSubmitting()) return;
    this.errorMessage.set('');
    this.dto.mobileNumber = normalizeMobile(this.dto.mobileNumber);
    if (!this.onValidateModel(this.dto)) {
      return;
    }

    this.isSubmitting.set(true);
    this.api.loginUser(this.dto).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (response) => {
        if (!response.isSuccess) {
          this.showError(response.message || 'شماره موبایل یا رمز عبور اشتباه است');
          return;
        }
        const token = response?.data?.token;

        if (!token) {
          this.showError('کاربر یافت نشد');
          return;
        }

        this.api.setToken(token);

        if (!this.api.getToken()) {
          this.api.logout();
          this.showError(
            'توکن دریافتی معتبر نیست؛ تنظیمات ورود سرور را بررسی کنید.',
          );
          return;
        }

        const role = this.api.hasRole('Admin') ? 'Admin' : 'Customer';
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (
          returnUrl?.startsWith('/') &&
          !returnUrl.startsWith('//') &&
          !returnUrl.includes('\\')
        ) {
          void this.router.navigateByUrl(returnUrl);
          return;
        }

        this.toastr.success('ورود با موفقیت انجام شد');

        if (role === 'Admin') {
          this.router.navigate(['/adminDashboard']);
        } else {
          this.router.navigate(['/userPannel']);
        }
      },

      error: (err) => {
        this.showError(authErrorMessage(err));
      },
    });
  }

  onGoToRegister() {
    this.router.navigate(['/register']);
  }
}
