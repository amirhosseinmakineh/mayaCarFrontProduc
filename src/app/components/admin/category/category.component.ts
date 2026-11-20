import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToastrService } from 'ngx-toastr';

import { AdminService } from '../../../services/admin/admin.service';

import { Category } from '../../../models/category/category';
import { CreateCategory } from '../../../models/category/createCategory';
import { EditCategory } from '../../../models/category/editCategory';
import { Result } from '../../../models/result';

type ModalType = 'create' | 'edit' | 'delete' | null;

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css']
})
export class CategoryComponent implements OnInit {

  // =========================
  // INJECT
  // =========================

  private service = inject(AdminService);
  private toastr = inject(ToastrService);

  // =========================
  // STATE
  // =========================

  search = signal('');
  page = signal(0);
  readonly pageSize = 15;
  filtered = computed(() => this.categories().filter(item => item.name.toLocaleLowerCase().includes(this.search().trim().toLocaleLowerCase())));
  visible = computed(() => this.filtered().slice(this.page() * this.pageSize, (this.page() + 1) * this.pageSize));
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered().length / this.pageSize)); }
  changePage(delta: number): void { this.page.set(Math.min(this.totalPages - 1, Math.max(0, this.page() + delta))); }

  categories = signal<Category[]>([]);
  selectedCategory = signal<Category | null>(null);

  activeModal = signal<ModalType>(null);

  createDto = signal<CreateCategory>(this.emptyCreateDto());
  editDto = signal<EditCategory>(this.emptyEditDto());

  // =========================
  // LIFE CYCLE
  // =========================

  ngOnInit(): void {
    this.loadCategories();
  }

  // =========================
  // LOAD
  // =========================

  loadCategories(): void {

    this.service.getCategories().subscribe({
      next: (res: Result<Category[]>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.categories.set(res.data);
      },

      error: () => {
        this.toastr.error('خطا در دریافت اطلاعات');
      }
    });

  }

  // =========================
  // CREATE
  // =========================

  create(): void {

    this.service.createCategory(this.createDto()).subscribe({
      next: (res: Result<void>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadCategories();
      },

      error: () => {
        this.toastr.error('خطا در ثبت دسته بندی');
      }
    });

  }

  // =========================
  // EDIT
  // =========================

  openEdit(category: Category): void {

    this.selectedCategory.set(category);

    this.editDto.set({
      id: category.id,
      name: category.name
    });

    this.activeModal.set('edit');

  }

  update(): void {

    this.service.updateCategory(this.editDto()).subscribe({
      next: (res: Result<void>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadCategories();
      },

      error: () => {
        this.toastr.error('خطا در ویرایش دسته بندی');
      }
    });

  }

  // =========================
  // DELETE
  // =========================

  openDelete(category: Category): void {

    this.selectedCategory.set(category);

    this.activeModal.set('delete');

  }

  deleteCategory(): void {

    const selected = this.selectedCategory();

    if (!selected) {
      return;
    }

    this.service.deleteCategory(selected.id).subscribe({
      next: (res: Result<void>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadCategories();
      },

      error: () => {
        this.toastr.error('خطا در حذف دسته بندی');
      }
    });

  }

  // =========================
  // MODALS
  // =========================

  openCreate(): void {

    this.createDto.set(this.emptyCreateDto());

    this.activeModal.set('create');

  }

  closeModal(): void {

    this.activeModal.set(null);

    this.selectedCategory.set(null);

  }

  // =========================
  // HELPERS
  // =========================

  trackByCategory(index: number, item: Category): number {
    return item.id;
  }

  private emptyCreateDto(): CreateCategory {

    return {
      name: ''
    };

  }

  private emptyEditDto(): EditCategory {

    return {
      id: 0,
      name: ''
    };

  }

}
