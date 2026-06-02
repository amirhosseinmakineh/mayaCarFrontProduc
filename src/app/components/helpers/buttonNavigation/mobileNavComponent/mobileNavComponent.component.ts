import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../services/auth/auth-service';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mobileNavComponent.component.html',
  styleUrls: ['./mobileNavComponent.component.css']
})
export class MobileNavComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isLogin: boolean = false;
  fullName: string = '';
  dashboardUrl: string = '/userPanel'; // مسیر پیش‌فرض
  showProfileMenu: boolean = false;

  ngOnInit(): void {
    this.checkLoginStatus();
  }

  checkLoginStatus() {
    const token = this.authService.getToken();

    if (!token) {
      this.isLogin = false;
      return;
    }

    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );

      const payload = JSON.parse(jsonPayload);
      this.isLogin = true;
      this.fullName = `${payload.firstName} ${payload.lastName}`;

      // تشخیص نقش برای تعیین URL داشبورد
      // معمولاً نقش در فیلد role یا فیلد استاندارد مایکروسافت قرار دارد
      const userRole = payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

      if (userRole === 'Admin') {
        this.dashboardUrl = '/adminDashboard'; // مسیر ادمین
      } else {
        this.dashboardUrl = '/userPannel';  // مسیر کاربر عادی
      }

    } catch (e) {
      console.error("Token parsing error", e);
      this.isLogin = false;
    }
  }

  toggleProfile() {
    if (this.isLogin) {
      this.showProfileMenu = !this.showProfileMenu;
    } else {
      this.router.navigate(['/login']);
    }
  }

  logout() {
    this.authService.logout();
    this.isLogin = false;
    this.showProfileMenu = false;
    this.router.navigate(['/']);
  }

  goToInstallMent() {
    this.router.navigate(["/installment"]);
  }
}
