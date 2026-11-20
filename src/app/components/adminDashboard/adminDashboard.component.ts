import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLinkWithHref } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth/auth-service';

@Component({
  selector: 'app-adminDashboard',
  templateUrl: './adminDashboard.component.html',
  styleUrls: ['./adminDashboard.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, RouterOutlet, RouterLinkWithHref]
})
export class AdminDashboardComponent implements OnInit {

  private router = inject(Router);
  private toastr = inject(ToastrService);
  private auth = inject(AuthService);

  isSidebarOpen: boolean = false;
  activeSection: 'users' | 'cars'| 'category' | 'company' | 'model' | 'tip' | 'order' | 'telegram' | 'telegramMessages' | 'catalog' = 'users';
  pageTitle: string = 'مدیریت کاربران';

  constructor() {}

  ngOnInit(): void {
    if (!this.auth.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.auth.hasRole('Admin')) {
      this.toastr.error(
        'شما دسترسی ورود به پنل ادمین را ندارید',
        'عدم دسترسی'
      );
      this.router.navigate(['/login']);
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

 goToSection(section: 'users'| 'cars'|'category' | 'company' | 'model' | 'tip' | 'order' | 'telegram' | 'telegramMessages' | 'catalog') {

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
  case 'catalog':
    this.pageTitle = 'کاتالوگ خودروهای دیتابیس';
    this.router.navigate(['/adminDashboard/catalog']);
    break;
  case 'telegram':
    this.pageTitle = 'مدیریت اسکن تلگرام';
    this.router.navigate(['/adminDashboard/telegram']);
    break;
  case 'telegramMessages':
    this.pageTitle = 'آرشیو پیام‌های تلگرام';
    this.router.navigate(['/adminDashboard/telegram-messages']);
    break;
  case 'order':
  this.pageTitle = 'مدیریت فاکتور ها',
  this.router.navigate(['/adminDashboard/order']);
  break;
}

}
logout(){
  this.auth.logout();
  this.router.navigate(["/"])
}
}
