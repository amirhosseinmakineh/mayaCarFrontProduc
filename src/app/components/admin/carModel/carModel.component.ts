import { Component, OnInit, inject, signal, computed } from '@angular/core';
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

  search = signal('');
  page = signal(0);
  readonly pageSize = 15;
  filtered = computed(() => this.carModels().filter(item => item.name.toLocaleLowerCase().includes(this.search().trim().toLocaleLowerCase())));
  visible = computed(() => this.filtered().slice(this.page() * this.pageSize, (this.page() + 1) * this.pageSize));
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered().length / this.pageSize)); }
  changePage(delta: number): void { this.page.set(Math.min(this.totalPages - 1, Math.max(0, this.page() + delta))); }

  carModels = signal<CarModel[]>([]);
  loading = signal(false);
  saving = signal(false);
  get firstVisible(): number { return this.filtered().length ? this.page() * this.pageSize + 1 : 0; }
  get lastVisible(): number { return Math.min((this.page() + 1) * this.pageSize, this.filtered().length); }
  get pageNumbers(): number[] { const start = Math.max(0, Math.min(this.page() - 2, this.totalPages - 5)); return Array.from({length: Math.min(5, this.totalPages)}, (_, i) => start + i); }
  goToPage(page: number): void { if (page >= 0 && page < this.totalPages) this.page.set(page); }
  private validName(name: string): boolean { if (name.trim()) return true; this.toastr.warning('نام مدل نمی‌تواند خالی باشد'); return false; }


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

    this.loading.set(true);
    this.service.getCarModels().subscribe({
      next: (res: Result<CarModel[]>) => {
        this.loading.set(false);

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.carModels.set(res.data ?? []);
        this.page.set(Math.min(this.page(), this.totalPages - 1));
      },
      error: () => {
        this.loading.set(false);
        this.toastr.error('خطا در دریافت مدل‌ها');
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
    this.service.createModel(payload).subscribe({
      next: (res: Result<void>) => {
        this.saving.set(false);

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadModels();
      },
      error: () => {
        this.saving.set(false);
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
    if (this.saving() || !this.validName(this.editDto().name)) return;
    this.saving.set(true);
    const payload = { ...this.editDto(), name: this.editDto().name.trim() };
    this.service.updateModel(payload).subscribe({
      next: (res: Result<void>) => {
        this.saving.set(false);

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadModels();
      },
      error: () => {
        this.saving.set(false);
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
    if (this.saving()) return;
    const model = this.selectedModel();

    if (!model) {
      return;
    }

    this.saving.set(true);
    this.service.deleteModel(model.id).subscribe({
      next: (res: Result<void>) => {
        this.saving.set(false);

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadModels();
      },
      error: () => {
        this.saving.set(false);
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
    if (this.saving()) return;
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
