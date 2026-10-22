import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLinkWithHref } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth/auth-service';

@Component({
  selector: 'app-adminDashboard',
  templateUrl: './adminDashboard.component.html',
  styleUrls: ['./adminDashboard.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, RouterOutlet, RouterLinkWithHref],
})
export class AdminDashboardComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private auth = inject(AuthService);

  isSidebarOpen: boolean = false;
  activeSection:
    | 'users'
    | 'cars'
    | 'usedCars'
    | 'category'
    | 'company'
    | 'model'
    | 'tip'
    | 'order'
    | 'telegramChannels' = 'users';
  pageTitle: string = 'مدیریت کاربران';

  constructor() {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.auth.getToken()) {
      this.auth.logout();
      this.toastr.error('نشست ورود معتبر نیست؛ دوباره وارد شوید.');
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    if (!this.auth.hasRole('Admin')) {
      this.toastr.error('شما دسترسی ورود به پنل ادمین را ندارید', 'عدم دسترسی');
      void this.router.navigate(['/login']);
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  goToSection(
    section:
      | 'users'
      | 'cars'
      | 'usedCars'
      | 'category'
      | 'company'
      | 'model'
      | 'tip'
      | 'order'
      | 'telegramChannels',
  ) {
    this.activeSection = section;
    switch (section) {
      case 'users':
        this.pageTitle = 'مدیریت کاربران';
        this.router.navigate(['/adminDashboard/userManagment']);
        break;

      case 'cars':
        this.pageTitle = 'مدیریت ماشین‌ها';
        this.router.navigate(['/adminDashboard/carManagement']);
        break;

      case 'usedCars':
        this.pageTitle = 'مدیریت ماشین‌های دست‌دوم';
        this.router.navigate(['/adminDashboard/usedCarManagement']);
        break;

      case 'category':
        this.pageTitle = 'مدیریت دسته‌بندی';
        this.router.navigate(['/adminDashboard/category']);
        break;

      case 'company':
        this.pageTitle = 'مدیریت شرکت‌ها';
        this.router.navigate(['/adminDashboard/company']);
        break;

      case 'model':
        this.pageTitle = 'مدیریت مدل‌ها';
        this.router.navigate(['/adminDashboard/model']);
        break;

      case 'tip':
        this.pageTitle = 'مدیریت تیپ‌ها';
        this.router.navigate(['/adminDashboard/tip']);
        break;
      case 'order':
        ((this.pageTitle = 'مدیریت فاکتور ها'),
          this.router.navigate(['/adminDashboard/order']));
        break;
    }
  }
  goToTelegramChannels(): void {
    this.activeSection = 'telegramChannels';
    this.pageTitle = 'مدیریت کانال‌های تلگرام';
    this.router.navigate(['/adminDashboard/telegramChannels']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
