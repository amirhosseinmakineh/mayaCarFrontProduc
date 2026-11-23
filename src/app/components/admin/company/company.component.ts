import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToastrService } from 'ngx-toastr';

import { AdminService } from '../../../services/admin/admin.service';

import { Result } from '../../../models/result';

import { Company } from '../../../models/company/companyName';
import { CreateCompany } from '../../../models/company/createCompany';
import { EditCompany } from '../../../models/company/editCompany';

type ModalType = 'create' | 'edit' | 'delete' | null;

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.css']
})
export class CompanyComponent implements OnInit {

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
  filtered = computed(() => this.companies().filter(item => item.name.toLocaleLowerCase().includes(this.search().trim().toLocaleLowerCase())));
  visible = computed(() => this.filtered().slice(this.page() * this.pageSize, (this.page() + 1) * this.pageSize));
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered().length / this.pageSize)); }
  changePage(delta: number): void { this.page.set(Math.min(this.totalPages - 1, Math.max(0, this.page() + delta))); }

  companies = signal<Company[]>([]);
  loading = signal(false);
  saving = signal(false);
  get firstVisible(): number { return this.filtered().length ? this.page() * this.pageSize + 1 : 0; }
  get lastVisible(): number { return Math.min((this.page() + 1) * this.pageSize, this.filtered().length); }
  get pageNumbers(): number[] { const start = Math.max(0, Math.min(this.page() - 2, this.totalPages - 5)); return Array.from({length: Math.min(5, this.totalPages)}, (_, i) => start + i); }
  goToPage(page: number): void { if (page >= 0 && page < this.totalPages) this.page.set(page); }
  private validName(name: string): boolean { if (name.trim()) return true; this.toastr.warning('نام شرکت نمی‌تواند خالی باشد'); return false; }


  selectedCompany = signal<Company | null>(null);

  activeModal = signal<ModalType>(null);

  createDto = signal<CreateCompany>(this.emptyCreateDto());

  editDto = signal<EditCompany>(this.emptyEditDto());

  // =========================
  // LIFE CYCLE
  // =========================

  ngOnInit(): void {
    this.loadCompanies();
  }

  // =========================
  // LOAD
  // =========================

  loadCompanies(): void {

    this.loading.set(true);
    this.service.getCompanyies().subscribe({
      next: (res: Result<Company[]>) => {
        this.loading.set(false);

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.companies.set(res.data ?? []);
        this.page.set(Math.min(this.page(), this.totalPages - 1));

      },

      error: () => {
        this.loading.set(false);
        this.toastr.error('خطا در دریافت شرکت ها');
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
    this.service.createCompaany(payload).subscribe({
      next: (res: Result<void>) => {
        this.saving.set(false);

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadCompanies();

      },

      error: () => {
        this.saving.set(false);
        this.toastr.error('خطا در ثبت شرکت');
      }
    });

  }

  // =========================
  // EDIT
  // =========================

  openEdit(company: Company): void {

    this.selectedCompany.set(company);

    this.editDto.set({
      id: company.id,
      name: company.name
    });

    this.activeModal.set('edit');

  }

  update(): void {
    if (this.saving() || !this.validName(this.editDto().name)) return;
    this.saving.set(true);
    const payload = { ...this.editDto(), name: this.editDto().name.trim() };
    this.service.updateCompany(payload).subscribe({
      next: (res: Result<void>) => {
        this.saving.set(false);

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadCompanies();

      },

      error: () => {
        this.saving.set(false);
        this.toastr.error('خطا در ویرایش شرکت');
      }
    });

  }

  // =========================
  // DELETE
  // =========================

  openDelete(company: Company): void {

    this.selectedCompany.set(company);

    this.activeModal.set('delete');

  }

  deleteCompany(): void {
    if (this.saving()) return;
    const selected = this.selectedCompany();

    if (!selected) {
      return;
    }

    this.saving.set(true);
    this.service.deleteCompany(selected.id).subscribe({
      next: (res: Result<void>) => {
        this.saving.set(false);

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadCompanies();

      },

      error: () => {
        this.saving.set(false);
        this.toastr.error('خطا در حذف شرکت');
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
    if (this.saving()) return;
    this.activeModal.set(null);

    this.selectedCompany.set(null);

  }

  // =========================
  // HELPERS
  // =========================

  trackByCompany(index: number, item: Company): number {
    return item.id;
  }

  private emptyCreateDto(): CreateCompany {

    return {
      name: ''
    };

  }

  private emptyEditDto(): EditCompany {

    return {
      id: 0,
      name: ''
    };

  }

}
