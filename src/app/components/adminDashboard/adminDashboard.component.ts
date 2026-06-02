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
  private  auth = inject(AuthService)

  isSidebarOpen: boolean = false;
  activeSection: 'users' | 'cars'| 'category' | 'company' | 'model' | 'tip' | 'order' = 'users';
  pageTitle: string = 'مدیریت کاربران';

  constructor() {}

ngOnInit(): void {
debugger;
  const token = localStorage.getItem('token');

  if (!token) {
    this.router.navigate(['/login']);
    return;
  }

  try {
const base64 = token.split('.')[1]
  .replace(/-/g, '+')
  .replace(/_/g, '/');

const payload = JSON.parse(atob(base64));


    if (payload.role !== 'Admin') {

      this.toastr.error(
        'شما دسترسی ورود به پنل ادمین را ندارید',
        'عدم دسترسی'
      );

      this.router.navigate(['/login']);
      return;
    }

    console.log('Admin Access Granted');

  } catch (error) {

    this.toastr.error(
      'توکن نامعتبر است',
      'خطا'
    );

    this.router.navigate(['/login']);
  }
}


  toggleSidebar() {
    debugger;
    this.isSidebarOpen = !this.isSidebarOpen;
  }

 goToSection(section: 'users'| 'cars'|'category' | 'company' | 'model' | 'tip' | 'order') {

  this.activeSection = section;
  debugger;
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
