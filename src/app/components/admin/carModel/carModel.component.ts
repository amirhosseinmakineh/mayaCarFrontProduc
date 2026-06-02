import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToastrService } from 'ngx-toastr';

import { AdminService } from '../../../services/admin/admin.service';

import { CarModel } from '../../../models/carModel/carmodel';
import { CreateCarModel } from '../../../models/carModel/createCarModel';
import { EditCarModel } from '../../../models/carModel/editCarModel';
import { Result } from '../../../models/result';

type ModalType = 'create' | 'edit' | 'delete' | null;

@Component({
  selector: 'app-carModel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './carModel.component.html',
  styleUrls: ['./carModel.component.css']
})
export class CarModelComponent implements OnInit {

  // =========================
  // INJECT
  // =========================

  private service = inject(AdminService);
  private toastr = inject(ToastrService);

  // =========================
  // STATE
  // =========================

  carModels = signal<CarModel[]>([]);

  selectedModel = signal<CarModel | null>(null);

  activeModal = signal<ModalType>(null);

  createDto = signal<CreateCarModel>(this.getEmptyCreateDto());

  editDto = signal<EditCarModel>(this.getEmptyEditDto());

  // =========================
  // LIFECYCLE
  // =========================

  ngOnInit(): void {
    this.loadModels();
  }

  // =========================
  // LOAD
  // =========================

  loadModels(): void {

    this.service.getCarModels().subscribe({
      next: (res: Result<CarModel[]>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.carModels.set(res.data);
      },
      error: () => {
        this.toastr.error('خطا در دریافت مدل‌ها');
      }
    });

  }

  // =========================
  // CREATE
  // =========================

  create(): void {

    this.service.createModel(this.createDto()).subscribe({
      next: (res: Result<void>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadModels();
      },
      error: () => {
        this.toastr.error('خطا در ثبت مدل');
      }
    });

  }

  // =========================
  // EDIT
  // =========================

  openEdit(model: CarModel): void {

    this.selectedModel.set(model);

    this.editDto.set({
      id: model.id,
      name: model.name
    });

    this.activeModal.set('edit');
  }

  update(): void {

    this.service.updateModel(this.editDto()).subscribe({
      next: (res: Result<void>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadModels();
      },
      error: () => {
        this.toastr.error('خطا در بروزرسانی مدل');
      }
    });

  }

  // =========================
  // DELETE
  // =========================

  openDelete(model: CarModel): void {

    this.selectedModel.set(model);

    this.activeModal.set('delete');
  }

  deleteCarModel(): void {

    const model = this.selectedModel();

    if (!model) {
      return;
    }

    this.service.deleteModel(model.id).subscribe({
      next: (res: Result<void>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadModels();
      },
      error: () => {
        this.toastr.error('خطا در حذف مدل');
      }
    });

  }

  // =========================
  // MODAL
  // =========================

  openCreate(): void {

    this.createDto.set(this.getEmptyCreateDto());

    this.activeModal.set('create');
  }

  closeModal(): void {

    this.activeModal.set(null);

    this.selectedModel.set(null);
  }

  // =========================
  // HELPERS
  // =========================

  private getEmptyCreateDto(): CreateCarModel {

    return {
      name: ''
    };

  }

  private getEmptyEditDto(): EditCarModel {

    return {
      id: 0,
      name: ''
    };

  }

}
