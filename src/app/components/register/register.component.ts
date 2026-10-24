import { Component, OnInit, inject, signal } from "@angular/core";
import { authErrorMessage, normalizeMobile } from '../../services/auth/auth-form';
import { finalize } from 'rxjs';
import { FormsModule } from "@angular/forms";
import { RegisterDto } from "../../models/user/registerDto";
import { AuthService } from "../../services/auth/auth-service";
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports : [FormsModule,CommonModule],
  standalone : true
})
export class RegisterComponent implements OnInit {
  private toastr = inject(ToastrService);
  private api = inject(AuthService);
  private readonly router = inject(Router)
  readonly errorMessage = signal('');
  readonly isSubmitting = signal(false);
  constructor(){}
  private showError(message: string): void { this.errorMessage.set(message); }
  dto : RegisterDto = {
    name : '',
    family : '',
    mobileNumber : '',
    password : '',
    rePassword : ''
  };
  ngOnInit() {}

private onValidateModel = (dto: RegisterDto): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const phoneRegex = /^09[0-9]{9}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!dto.name.trim() || !dto.family.trim()) {
    this.showError('نام و نام خانوادگی را وارد کنید');
    return false;
  }
  if (!dto.mobileNumber || dto.mobileNumber.trim() === '') {
    this.showError('شماره تلفن نمی‌تواند خالی باشد');
    return false;
  }
  if (!dto.password || dto.password.trim() === '') {
    this.showError('رمز عبور نمی‌تواند خالی باشد');
    return false;
  }
  if (!dto.rePassword || dto.rePassword.trim() === '') {
    this.showError('تکرار رمز عبور نمی‌تواند خالی باشد');
    return false;
  }

  if (dto.email && !emailRegex.test(dto.email)) {
    this.showError('فرمت ایمیل صحیح نیست (مثال: name@domain.com)');
    return false;
  }
  if (!phoneRegex.test(dto.mobileNumber)) {
    this.showError('شماره تلفن همراه معتبر نیست. باید با 09 شروع و ۱۱ رقم باشد');
    return false;
  }
  if (!passwordRegex.test(dto.password)) {
    this.showError('رمز عبور باید حداقل ۸ کاراکتر، شامل حروف بزرگ، حروف کوچک، عدد و یکی از کاراکترهای ویژه (@$!%*?&) باشد');
    return false;
  }
  if (dto.password !== dto.rePassword) {
    this.showError('رمز عبور و تکرار آن مطابقت ندارند');
    return false;
  }

  return true;
};
public registerUser(): void {
  if (this.isSubmitting()) return;
  this.errorMessage.set('');
  this.dto.mobileNumber = normalizeMobile(this.dto.mobileNumber);
  this.dto.name = this.dto.name.trim();
  this.dto.family = this.dto.family.trim();
  this.dto.email = this.dto.email?.trim();
  if (!this.onValidateModel(this.dto)) {
    return;
  }

  this.isSubmitting.set(true);
  this.api.registerUser(this.dto).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
    next: (response) => {
      if (!response.isSuccess) {
        this.showError(response.message || 'ثبت‌نام انجام نشد');
        return;
      }
      this.toastr.success('ثبت‌نام با موفقیت انجام شد', 'موفقیت');
      this.router.navigate(["/login"])
    },
    error: (err) => {
      this.showError(authErrorMessage(err));
    }
  });
}
onGoToLogin(){
      this.router.navigate(['/login']);
}

}
