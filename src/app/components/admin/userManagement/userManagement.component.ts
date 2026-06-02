import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AdminService } from '../../../services/admin/admin.service';

import { CreateUser } from '../../../models/user/createUser';
import { UpdateUser } from '../../../models/user/updateUser';

import { User } from '../../../models/user/user';
import { Role } from '../../../models/role/role';

import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './userManagement.component.html',
  styleUrls: ['./userManagement.component.css'],
})

export class UserManagementComponent {

  private service = inject(AdminService);
  private toastr = inject(ToastrService);

  // state

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);

  selectedUser = signal<User | null>(null);

  // modals

  isCreateModal = signal(false);
  isEditModal = signal(false);
  isDeleteModal = signal(false);

  // dto

  dto = signal<CreateUser>(this.emptyDto());

  constructor() {

    this.loadUsers();
    this.loadRoles();

  }

  // ---------- LOAD ----------

  loadUsers() {

    this.service.getUsers().subscribe({

      next: res => {

        this.users.set(res);

      },

      error: () => {

        this.toastr.error('خطا در دریافت کاربران');

      }

    });

  }

  loadRoles() {

    this.service.getAllRoles().subscribe({

      next: res => {

        this.roles.set(res);

      }

    });

  }

  // ---------- CREATE ----------

  createUser() {

    const model = this.dto();

    if (!this.validateCreate(model)) return;

    this.service.createUser(model).subscribe({

      next: () => {

        this.toastr.success('کاربر با موفقیت ایجاد شد');

        this.closeCreate();

        this.loadUsers();

      },

      error: () => {

        this.toastr.error('خطا در ایجاد کاربر');

      }

    });

  }

  // ---------- UPDATE ----------

  updateUser() {

    const user = this.selectedUser();

    if (!user) return;

    if (!this.validateUpdate(this.dto())) return;

    const dto: UpdateUser = {

      id: user.id,
      ...this.dto()

    };

    this.service.updateUser(dto).subscribe({

      next: () => {

        this.toastr.success('ویرایش با موفقیت انجام شد');

        this.closeEdit();

        this.loadUsers();

      },

      error: () => {

        this.toastr.error('خطا در ویرایش');

      }

    });

  }

  // ---------- DELETE ----------

  deleteUser() {

    const user = this.selectedUser();

    if (!user) return;

    this.service.deleteUser(user.id).subscribe({

      next: () => {

        this.toastr.success('کاربر حذف شد');

        this.closeDelete();

        this.loadUsers();

      },

      error: () => {

        this.toastr.error('خطا در حذف');

      }

    });

  }

  // ---------- OPEN MODALS ----------

  openCreate() {

    this.dto.set(this.emptyDto());

    this.isCreateModal.set(true);

  }

  openEdit(user: User) {

    this.selectedUser.set(user);

    this.dto.set({

      name: user.name,
      family: user.family,
      email: user.email,
      mobileNumber: user.mobileNumber,
      password: '',
      roleName: user.roleName

    });

    this.isEditModal.set(true);

  }

  openDelete(user: User) {

    this.selectedUser.set(user);

    this.isDeleteModal.set(true);

  }

  // ---------- CLOSE MODALS ----------

  closeCreate() {

    this.isCreateModal.set(false);

  }

  closeEdit() {

    this.isEditModal.set(false);

  }

  closeDelete() {

    this.isDeleteModal.set(false);

  }

  // ---------- VALIDATION ----------

  private validateCreate(model: CreateUser): boolean {

    if (!this.validateCommon(model)) return false;

    if (!model.password) {

      this.toastr.error('رمز عبور الزامی است');

      return false;

    }

    return true;

  }

  private validateUpdate(model: CreateUser): boolean {

    return this.validateCommon(model);

  }

  private validateCommon(model: CreateUser): boolean {

    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const phoneRegex =
      /^09[0-9]{9}$/;

    if (!model.email || !emailRegex.test(model.email)) {

      this.toastr.error('ایمیل معتبر نیست');

      return false;

    }

    if (!model.mobileNumber || !phoneRegex.test(model.mobileNumber)) {

      this.toastr.error('شماره موبایل معتبر نیست');

      return false;

    }

    return true;

  }

  // ---------- HELPERS ----------

  private emptyDto(): CreateUser {

    return {

      name: '',
      family: '',
      email: '',
      mobileNumber: '',
      password: '',
      roleName: ''

    };

  }

}
