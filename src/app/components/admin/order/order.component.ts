import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToastrService } from 'ngx-toastr';

import { AdminService } from '../../../services/admin/admin.service';

import { User } from '../../../models/user/user';
import { Car } from '../../../models/car/car';

import {
  CreateOrder,
  Order
} from '../../../models/order/order';

import { CreateOrderItem }
from '../../../models/orderItem/createOrderItem';

import { Result }
from '../../../models/result';

import { NumberFormatDirective }
from '../../../../directives/number-format.directive';

import { OrderItemComponent }
from '../orderItem/orderItem.component';

import {
  NgPersianDatepickerModule
} from 'ng-persian-datepicker';

@Component({
  selector: 'app-order',
  standalone: true,
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    NumberFormatDirective,
    OrderItemComponent,
    NgPersianDatepickerModule
  ]
})
export class OrderComponent implements OnInit {

  // =========================
  // INJECT
  // =========================

  private readonly service =
    inject(AdminService);

  private readonly toastr =
    inject(ToastrService);

  // =========================
  // SIGNALS
  // =========================

  orders = signal<Order[]>([]);
  users = signal<User[]>([]);
  cars = signal<Car[]>([]);

  // =========================
  // MODALS
  // =========================

  isCreateOrderModal = signal(false);
  isOrderItemModal = signal(false);

  // =========================
  // SELECTED
  // =========================

  selectedUserId = signal<string>('');
  selectedCarId = signal<number>(0);

  selectedOrderId = signal<number>(0);

  // =========================
  // DATE
  // =========================

  persianDate = signal<string>('');

  // =========================
  // DTO
  // =========================

  createDto = signal<CreateOrder>(
    this.createEmptyOrder()
  );

  // =========================
  // INSTALLMENT
  // =========================

  installmentPrice = computed(() => {

    const orderItem =
      this.createDto().orderItem;

    if (!orderItem) {
      return 0;
    }

    const total =
      Number(orderItem.carPrice || 0);

    const prePayment =
      Number(orderItem.prePayment || 0);

    const time =
      Number(orderItem.time || 1);

    if (time <= 0) {
      return 0;
    }

    const result =
      (total - prePayment) / time;

    return result > 0
      ? Math.floor(result)
      : 0;
  });

  // =========================
  // LIFE CYCLE
  // =========================

  ngOnInit(): void {

    this.loadOrders();

  }

  // =========================
  // LOAD DATA
  // =========================

  loadOrders(): void {
debugger;
    this.service.getOrders().subscribe({

      next: (res: Result<Order[]>) => {

        this.orders.set(res.data || []);

      },

      error: () => {

        this.toastr.error(
          'خطا در دریافت فاکتورها'
        );

      }

    });
  }

  loadUsers(): void {

    this.service.getUsers().subscribe({

      next: res => {

        this.users.set(res || []);

      },

      error: () => {

        this.toastr.error(
          'خطا در دریافت کاربران'
        );

      }

    });
  }

  loadCars(): void {

    this.service.getCars().subscribe({

      next: res => {

        this.cars.set(res || []);

      },

      error: () => {

        this.toastr.error(
          'خطا در دریافت ماشین‌ها'
        );

      }

    });
  }

  // =========================
  // CREATE
  // =========================

  createOrder(): void {

    const dto = this.createDto();

    dto.userId =
      this.selectedUserId();

    dto.carId =
      Number(this.selectedCarId());

    dto.orderItem.price =
      this.installmentPrice();

    this.service.createOrder(dto)
      .subscribe({

        next: res => {

          if (!res.isSuccess) {

            this.toastr.error(
              res.message
            );

            return;
          }

          this.toastr.success(
            res.message
          );

          this.closeCreateOrderModal();

          this.loadOrders();

        },

        error: () => {

          this.toastr.error(
            'خطای سرور'
          );

        }

      });
  }

  // =========================
  // DATE
  // =========================

  onDateSelect(event: any): void {

    if (!event) {
      return;
    }

    this.persianDate.set(
      event.shamsi || ''
    );

    if (!event.gregorian) {
      return;
    }

    const date =
      new Date(event.gregorian);

    const year =
      date.getFullYear();

    const month =
      String(date.getMonth() + 1)
      .padStart(2, '0');

    const day =
      String(date.getDate())
      .padStart(2, '0');

    this.createDto.update(dto => ({
      ...dto,
      createOrderDate:
        `${year}-${month}-${day}`
    }));
  }

  // =========================
  // MODALS
  // =========================

  openCreateOrderModal(): void {

    this.resetCreateForm();

    this.loadUsers();

    this.loadCars();

    this.isCreateOrderModal.set(true);
  }

  closeCreateOrderModal(): void {

    this.isCreateOrderModal.set(false);

  }

  openOrderItemModal(
    orderId: number
  ): void {

    this.selectedOrderId.set(orderId);

    this.isOrderItemModal.set(true);

  }

  closeOrderItemModal(): void {

    this.isOrderItemModal.set(false);

  }

  // =========================
  // HELPERS
  // =========================

  trackByOrder(
    index: number,
    item: Order
  ): number {

    return item.id;

  }

  private resetCreateForm(): void {

    this.selectedUserId.set('');

    this.selectedCarId.set(0);

    this.persianDate.set('');

    this.createDto.set(
      this.createEmptyOrder()
    );
  }

  private createEmptyOrder():
  CreateOrder {

    return {

      userId: '',
      roleId: 0,

      carId: 0,

      carName: '',
      roleName: '',
      userName: '',

      createOrderDate: '',

      orderItem:
        this.createEmptyOrderItem()

    };
  }

  private createEmptyOrderItem():
  CreateOrderItem {

    return {

      carPrice: 0,

      prePayment: 0,

      time: 1,

      price: 0,

      isConfirm: false

    };
  }

}
