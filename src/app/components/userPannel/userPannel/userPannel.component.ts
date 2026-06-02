import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth-service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Order } from '../../../models/order/order';
import { AdminService } from '../../../services/admin/admin.service';
import { Result } from '../../../models/result';
import { OrderItem } from '../../../models/orderItem/orderItem';
import { OrderItemComponent } from "../../admin/orderItem/orderItem.component";
import { UserPannelService } from '../../../services/userPannel/userPannel.service';

@Component({
  selector: 'app-userPannel',
  templateUrl: './userPannel.component.html',
  styleUrls: ['./userPannel.component.css'],
  standalone:true,
  imports: [FormsModule, CommonModule, OrderItemComponent]
})
export class UserPannelComponent implements OnInit {

  constructor() { }
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly adminService = inject(AdminService);
  private readonly userPannelService = inject(UserPannelService)
    orders = signal<Order[]>([]);
    private orderId : number = 0;
    private orderItems  = signal<OrderItem[]>([]);
    isOrderItem = signal(false);
    selectedOrderId = signal<number>(0);
    private  userId : string = '';

  ngOnInit() {
    this.checkScreen();
      const token = localStorage.getItem('token');

  if (!token) {
    this.router.navigate(['/login']);
    return;
  }

  try {
const base64 = token.split('.')[1]
  .replace(/-/g, '+')
  .replace(/_/g, '/');
debugger;
const payload = JSON.parse(atob(base64));
const userId = JSON.parse(atob(base64));
this.userId = payload.Id;
    if (payload.role !== 'Customer') {

      this.toastr.error(
        'شما دسترسی ورود به پنل کاربر را ندارید',
        'عدم دسترسی'
      );

      this.router.navigate(['/login']);
      return;
    }

  } catch (error) {

    this.toastr.error(
      'توکن نامعتبر است',
      'خطا'
    );

    this.router.navigate(['/login']);
  }
    this.onLoadOrders(this.userId);
  }
  isSidebarOpen = false;
  isMobile = false;
    @HostListener('window:resize')
  onResize() {
    this.checkScreen();
  }

  checkScreen() {
    this.isMobile = window.innerWidth <= 768;

    if (!this.isMobile) {
      this.isSidebarOpen = true;
    } else {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
   closeSidebar() {
    if (this.isMobile) {
      this.isSidebarOpen = false;
    }
    }
      onLoadOrders(userId : string){
        this.userPannelService.getOrders(userId).subscribe({
          next : (res : Result<Order[]>)=>{
            debugger;
            this.orders.set(res.data);
          }
        })

      }
    logout(){
  this.authService.logout();
  this.router.navigate(["/"])
}
onGetOrderItems() {
  debugger;
  this.adminService.getOrderItems(this.orderId).subscribe({
    next: (res) => {
      this.orderItems.set(res.data);
    },
    error: (err) => {
      console.error(err);
    }
  });
}
  onOpenOrderItemModal(orderId : number){
    debugger;
  this.selectedOrderId.set(orderId);
  this.isOrderItem.set(true);
  }
    onCloseOrderItemModal(){
    this.isOrderItem.set(false);
  }
}
