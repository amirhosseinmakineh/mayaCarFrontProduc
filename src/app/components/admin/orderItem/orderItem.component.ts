import {
  Component,
  Input,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ToastrService } from 'ngx-toastr';

import { AdminService }
from '../../../services/admin/admin.service';

import { OrderItem }
from '../../../models/orderItem/orderItem';

import { ThousandSeparatorPipe }
from '../../../../../pipes/ThousandSeparatorPipe.pipe';

@Component({
  selector: 'app-orderItem',
  standalone: true,
  templateUrl: './orderItem.component.html',
  styleUrls: ['./orderItem.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ThousandSeparatorPipe
  ]
})
export class OrderItemComponent
implements OnInit {

  // =========================
  // INPUT
  // =========================

  @Input()
  orderId: number = 0;

  // =========================
  // INJECT
  // =========================

  private readonly service =
    inject(AdminService);

  private readonly toastr =
    inject(ToastrService);

  private readonly router =
    inject(Router);

  // =========================
  // SIGNALS
  // =========================

  orderItems =
    signal<OrderItem[]>([]);

  isAdmin =
    signal(false);

  // =========================
  // USER
  // =========================

  private userId = '';

  // =========================
  // LIFE CYCLE
  // =========================

  ngOnInit(): void {

    this.initializeUser();

    this.loadOrderItems();

  }

  // =========================
  // INITIALIZE USER
  // =========================

  private initializeUser(): void {

    const token =
      localStorage.getItem('token');

    if (!token) {

      this.router.navigate(['/login']);

      return;
    }

    try {

      const payload =
        this.decodeToken(token);

      this.userId =
        payload?.Id || '';

      this.isAdmin.set(
        payload?.role !== 'Customer'
      );

    } catch {

      this.toastr.error(
        'توکن نامعتبر است',
        'خطا'
      );

      this.router.navigate(['/login']);

    }
  }

  // =========================
  // LOAD ORDER ITEMS
  // =========================

  loadOrderItems(): void {

    if (!this.orderId) {
      return;
    }

    this.service
      .getOrderItems(this.orderId)
      .subscribe({

        next: res => {

          this.orderItems.set(
            res.data || []
          );

        },

        error: err => {

          console.error(err);

          this.toastr.error(
            'خطا در دریافت اطلاعات'
          );

        }

      });
  }

  // =========================
  // CONFIRM ORDER ITEM
  // =========================

  onConfirmOrderItem(
    orderItemId: number
  ): void {

    this.service
      .confirmOrderItem(orderItemId)
      .subscribe({

        next: res => {

          this.toastr.success(
            res.message
          );

          this.loadOrderItems();

        },

        error: err => {

          console.error(err);

          this.toastr.error(
            'خطا در تایید آیتم'
          );

        }

      });
  }

  // =========================
  // TRACK BY
  // =========================

  trackByOrderItem(
    index: number,
    item: OrderItem
  ): number {

    return item.orderItemId;

  }

  // =========================
  // TOKEN DECODE
  // =========================

  private decodeToken(
    token: string
  ): any {

    const base64 =
      token
        .split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    return JSON.parse(
      atob(base64)
    );
  }

}
