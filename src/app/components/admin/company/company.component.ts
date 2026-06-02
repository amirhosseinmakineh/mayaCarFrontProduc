import { Component, OnInit, inject, signal } from '@angular/core';
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

  companies = signal<Company[]>([]);

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

    this.service.getCompanyies().subscribe({
      next: (res: Result<Company[]>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.companies.set(res.data);

      },

      error: () => {
        this.toastr.error('خطا در دریافت شرکت ها');
      }
    });

  }

  // =========================
  // CREATE
  // =========================

  create(): void {

    this.service.createCompaany(this.createDto()).subscribe({
      next: (res: Result<void>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadCompanies();

      },

      error: () => {
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

    this.service.updateCompany(this.editDto()).subscribe({
      next: (res: Result<void>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadCompanies();

      },

      error: () => {
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

    const selected = this.selectedCompany();

    if (!selected) {
      return;
    }

    this.service.deleteCompany(selected.id).subscribe({
      next: (res: Result<void>) => {

        if (!res.isSuccess) {
          this.toastr.error(res.message);
          return;
        }

        this.toastr.success(res.message);

        this.closeModal();

        this.loadCompanies();

      },

      error: () => {
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
