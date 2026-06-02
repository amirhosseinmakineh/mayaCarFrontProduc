import { Component, OnInit, inject } from '@angular/core';
import { LoginDto } from '../../models/user/loginDto';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth/auth-service';
import { Router, RouterLink } from '@angular/router';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [FormsModule],
  standalone : true
})
export class LoginComponent implements OnInit {
private toastr = inject(ToastrService);
private api = inject(AuthService);
private router = inject(Router);
  constructor() { }
  dto : LoginDto = {
    mobileNumber : "",
    password : ""
  }
  ngOnInit() {}
  private onValidateModel = (dto: LoginDto): boolean => {
    const phoneRegex = /^09[0-9]{9}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!dto.mobileNumber || dto.mobileNumber.trim() === '') {
      this.toastr.error('شماره تلفن نمی‌تواند خالی باشد', 'خطای اعتبارسنجی');
      return false;
    }
    if (!dto.password || dto.password.trim() === '') {
      this.toastr.error('رمز عبور نمی‌تواند خالی باشد', 'خطای اعتبارسنجی');
      return false;
    }
    if (!passwordRegex.test(dto.password)) {
      this.toastr.error('رمز عبور باید حداقل ۸ کاراکتر، شامل حروف بزرگ، حروف کوچک، عدد و یکی از کاراکترهای ویژه (@$!%*?&) باشد', 'خطای اعتبارسنجی');
      return false;
    }
    return true;
  };
public onLogin() {
debugger;
  if (!this.onValidateModel(this.dto))
    return;

  this.api.loginUser(this.dto).subscribe({

    next: (response: any) => {
      debugger;
      const token = response?.data?.token;

      if (!token) {
        this.toastr.error("کاربر یافت نشد");
        return;
      }

      this.api.setToken(token);

 const base64 = token.split('.')[1]
  .replace(/-/g, '+')
  .replace(/_/g, '/');

const payload = JSON.parse(atob(base64));

      const role =
        payload.role;

      this.toastr.success("ورود با موفقیت انجام شد");
      debugger;
      if (role === "Admin") {
        this.router.navigate(['/adminDashboard']);
      }
      else if(role === "Customer"){
        this.router.navigate(["/userPannel"]);
      }
      else {
        this.router.navigate(['/userPannel']);
      }
    },

    error: (err) => {
      this.toastr.error(err.error);
    }
  });
}

  onGoToRegister(){
      this.router.navigate(['/register']);
  }

}
