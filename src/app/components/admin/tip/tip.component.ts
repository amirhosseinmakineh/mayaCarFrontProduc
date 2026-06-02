import {
  Component,
  OnInit,
  inject,
  signal
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

  tips =
    signal<Tip[]>([]);

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

    this.service.getTipes()
      .subscribe({

        next: (
          res: Result<Tip[]>
        ) => {

          if (!res.isSuccess) {

            this.toastr.error(
              res.message
            );

            return;
          }

          this.tips.set(
            res.data || []
          );

        },

        error: () => {

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

    this.service
      .createTip(
        this.createDto()
      )
      .subscribe({

        next: (
          res: Result<void>
        ) => {

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

    this.service
      .updateTip(
        this.editDto()
      )
      .subscribe({

        next: (
          res: Result<void>
        ) => {

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

    const selected =
      this.selectedTip();

    if (!selected) {
      return;
    }

    this.service
      .deleteTip(selected.id)
      .subscribe({

        next: (
          res: Result<void>
        ) => {

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

    this.isCreateModal.set(false);

  }

  closeEditModal(): void {

    this.isEditModal.set(false);

  }

  closeDeleteModal(): void {

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
