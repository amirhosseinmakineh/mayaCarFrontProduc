import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule }
from '@angular/common';

import { FormsModule }
from '@angular/forms';

import { ToastrService }
from 'ngx-toastr';

import { AdminService }
from '../../../services/admin/admin.service';

import { Result }
from '../../../models/result';

import { Tip }
from '../../../models/tip/tip';

import { CreateTip }
from '../../../models/tip/createTip';

import { EditTip }
from '../../../models/tip/editTip';

@Component({
  selector: 'app-tip',
  standalone: true,
  templateUrl: './tip.component.html',
  styleUrls: ['./tip.component.css'],
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class TipComponent
implements OnInit {

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

  search = signal('');
  page = signal(0);
  readonly pageSize = 15;
  filtered = computed(() => this.tips().filter(item => item.name.toLocaleLowerCase().includes(this.search().trim().toLocaleLowerCase())));
  visible = computed(() => this.filtered().slice(this.page() * this.pageSize, (this.page() + 1) * this.pageSize));
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered().length / this.pageSize)); }
  changePage(delta: number): void { this.page.set(Math.min(this.totalPages - 1, Math.max(0, this.page() + delta))); }

  tips = signal<Tip[]>([]);
  loading = signal(false);
  saving = signal(false);
  get firstVisible(): number { return this.filtered().length ? this.page() * this.pageSize + 1 : 0; }
  get lastVisible(): number { return Math.min((this.page() + 1) * this.pageSize, this.filtered().length); }
  get pageNumbers(): number[] { const start = Math.max(0, Math.min(this.page() - 2, this.totalPages - 5)); return Array.from({length: Math.min(5, this.totalPages)}, (_, i) => start + i); }
  goToPage(page: number): void { if (page >= 0 && page < this.totalPages) this.page.set(page); }
  private validName(name: string): boolean { if (name.trim()) return true; this.toastr.warning('نام تیپ نمی‌تواند خالی باشد'); return false; }


  selectedTip =
    signal<Tip | null>(null);

  // =========================
  // MODALS
  // =========================

  isCreateModal =
    signal(false);

  isEditModal =
    signal(false);

  isDeleteModal =
    signal(false);

  // =========================
  // DTO
  // =========================

  createDto =
    signal<CreateTip>(
      this.createEmptyDto()
    );

  editDto =
    signal<EditTip>(
      this.createEmptyEditDto()
    );

  // =========================
  // LIFE CYCLE
  // =========================

  ngOnInit(): void {

    this.loadTips();

  }

  // =========================
  // LOAD
  // =========================

  loadTips(): void {

    this.loading.set(true);
    this.service.getTipes()
      .subscribe({

        next: (
          res: Result<Tip[]>
        ) => {
          this.loading.set(false);

          if (!res.isSuccess) {

            this.toastr.error(
              res.message
            );

            return;
          }

          this.tips.set(res.data || []);
          this.page.set(Math.min(this.page(), this.totalPages - 1));

        },

        error: () => {
          this.loading.set(false);
          this.toastr.error(
            'خطا در دریافت تیپ‌ها'
          );

        }

      });
  }

  // =========================
  // CREATE
  // =========================

  create(): void {
    if (this.saving() || !this.validName(this.createDto().name)) return;
    this.saving.set(true);
    const payload = { ...this.createDto(), name: this.createDto().name.trim() };
    this.service
      .createTip(payload)
      .subscribe({

        next: (
          res: Result<void>
        ) => {
          this.saving.set(false);

          if (!res.isSuccess) {

            this.toastr.error(
              res.message
            );

            return;
          }

          this.toastr.success(
            res.message
          );

          this.closeCreateModal();

          this.loadTips();

        },

        error: () => {
          this.saving.set(false);
          this.toastr.error(
            'خطا در ثبت تیپ'
          );

        }

      });
  }

  // =========================
  // OPEN EDIT
  // =========================

  openEdit(
    tip: Tip
  ): void {

    this.selectedTip.set(tip);

    this.editDto.set({

      id: tip.id,

      name: tip.name

    });

    this.isEditModal.set(true);

  }

  // =========================
  // UPDATE
  // =========================

  update(): void {
    if (this.saving() || !this.validName(this.editDto().name)) return;
    this.saving.set(true);
    const payload = { ...this.editDto(), name: this.editDto().name.trim() };
    this.service
      .updateTip(payload)
      .subscribe({

        next: (
          res: Result<void>
        ) => {
          this.saving.set(false);

          if (!res.isSuccess) {

            this.toastr.error(
              res.message
            );

            return;
          }

          this.toastr.success(
            res.message
          );

          this.closeEditModal();

          this.loadTips();

        },

        error: () => {
          this.saving.set(false);
          this.toastr.error(
            'خطا در ویرایش تیپ'
          );

        }

      });
  }

  // =========================
  // OPEN DELETE
  // =========================

  openDelete(
    tip: Tip
  ): void {

    this.selectedTip.set(tip);

    this.isDeleteModal.set(true);

  }

  // =========================
  // DELETE
  // =========================

  deleteTip(): void {
    if (this.saving()) return;
    const selected =
      this.selectedTip();

    if (!selected) {
      return;
    }

    this.saving.set(true);
    this.service
      .deleteTip(selected.id)
      .subscribe({

        next: (
          res: Result<void>
        ) => {
          this.saving.set(false);

          if (!res.isSuccess) {

            this.toastr.error(
              res.message
            );

            return;
          }

          this.toastr.success(
            res.message
          );

          this.closeDeleteModal();

          this.loadTips();

        },

        error: () => {
          this.saving.set(false);
          this.toastr.error(
            'خطا در حذف تیپ'
          );

        }

      });
  }

  // =========================
  // MODALS
  // =========================

  openCreateModal(): void {

    this.createDto.set(
      this.createEmptyDto()
    );

    this.isCreateModal.set(true);

  }

  closeCreateModal(): void {
    if (this.saving()) return;

    this.isCreateModal.set(false);

  }

  closeEditModal(): void {
    if (this.saving()) return;

    this.isEditModal.set(false);

  }

  closeDeleteModal(): void {
    if (this.saving()) return;

    this.isDeleteModal.set(false);

  }

  // =========================
  // TRACK BY
  // =========================

  trackByTip(
    index: number,
    item: Tip
  ): number {

    return item.id;

  }

  // =========================
  // HELPERS
  // =========================

  private createEmptyDto():
  CreateTip {

    return {

      name: ''

    };
  }

  private createEmptyEditDto():
  EditTip {

    return {

      id: 0,

      name: ''

    };
  }

}
