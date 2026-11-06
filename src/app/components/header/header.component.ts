import { Component, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone:true,
  imports: [CommonModule, FormsModule, RouterLink]
})
export class HeaderComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  menuOpen = false;
  public finalPrice: number = 0;
  public isLogin: boolean = false;
  public fullName: string = '';

  // این متغیر برای مخفی کردن هدر در داشبوردهاست
  public showHeader: boolean = true;

constructor() {
  this.router.events.pipe(
    filter(event => event instanceof NavigationEnd)
  ).subscribe((event: any) => {
    // مخفی/نمایش هدر
    this.showHeader = !event.url.includes('userPannel') &&
                      !event.url.includes('adminDashboard');
    // مهم: بستن منو موقع تغییر روت
    this.menuOpen = false;
  });
}
  ngOnInit() {
    this.getUserInfo();
  }

  onGetToRegister() {
    this.router.navigate(['/register']);
  }

  onGetToLogin() {
    this.router.navigate(['/login']);
  }

  getUserInfo() {
    const token = this.authService.getToken();
    if (!token) {
      this.isLogin = false;
      return;
    }

    this.isLogin = true;

    try {
      const base64 = token.split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload = JSON.parse(jsonPayload);
      this.fullName = `${payload.firstName} ${payload.lastName}`;
    } catch (e) {
      this.isLogin = false;
    }
  }

  logout() {
    this.authService.logout();
    this.isLogin = false;
    this.fullName = '';
    this.router.navigate(['/']);
  }
}
