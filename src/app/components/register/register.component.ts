import { Component, OnInit, inject } from "@angular/core";
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
  constructor(){}
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

  if (!dto.email || dto.email.trim() === '') {
    this.toastr.error('ایمیل نمی‌تواند خالی باشد', 'خطای اعتبارسنجی');
    return false;
  }
  if (!dto.mobileNumber || dto.mobileNumber.trim() === '') {
    this.toastr.error('شماره تلفن نمی‌تواند خالی باشد', 'خطای اعتبارسنجی');
    return false;
  }
  if (!dto.password || dto.password.trim() === '') {
    this.toastr.error('رمز عبور نمی‌تواند خالی باشد', 'خطای اعتبارسنجی');
    return false;
  }
  if (!dto.rePassword || dto.rePassword.trim() === '') {
    this.toastr.error('تکرار رمز عبور نمی‌تواند خالی باشد', 'خطای اعتبارسنجی');
    return false;
  }

  if (!emailRegex.test(dto.email)) {
    this.toastr.error('فرمت ایمیل صحیح نیست (مثال: name@domain.com)', 'خطای اعتبارسنجی');
    return false;
  }
  if (!phoneRegex.test(dto.mobileNumber)) {
    this.toastr.error('شماره تلفن همراه معتبر نیست. باید با 09 شروع و ۱۱ رقم باشد', 'خطای اعتبارسنجی');
    return false;
  }
  if (!passwordRegex.test(dto.password)) {
    this.toastr.error('رمز عبور باید حداقل ۸ کاراکتر، شامل حروف بزرگ، حروف کوچک، عدد و یکی از کاراکترهای ویژه (@$!%*?&) باشد', 'خطای اعتبارسنجی');
    return false;
  }
  if (dto.password !== dto.rePassword) {
    this.toastr.error('رمز عبور و تکرار آن مطابقت ندارند', 'خطای اعتبارسنجی');
    return false;
  }

  return true;
};
public registerUser(): void {
debugger;
  if (!this.onValidateModel(this.dto)) {
    return;
  }

  this.api.registerUser(this.dto).subscribe({
    next: (response) => {
      this.toastr.success('ثبت‌نام با موفقیت انجام شد', 'موفقیت');
      this.router.navigate(["/login"])
    },
    error: (err) => {
      let errorMessage = 'خطایی در ثبت‌نام رخ داده است';
      if (err.error && typeof err.error === 'string') {
        errorMessage = err.error;
      }
      this.toastr.error(errorMessage, 'خطا');
    }
  });
}
onGoToLogin(){
      this.router.navigate(['/login']);
}

}
