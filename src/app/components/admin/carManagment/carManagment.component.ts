import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';

import { AdminService }
from '../../../services/admin/admin.service';

import { Car }
from '../../../models/car/car';

import { CreateCar }
from '../../../models/car/createCar';

import { Tip }
from '../../../models/tip/tip';

import { CarModel }
from '../../../models/carModel/carmodel';


import { Company }
from '../../../models/company/companyName';

import { ThousandSeparatorPipe }
from '../../../../../pipes/ThousandSeparatorPipe.pipe';

type ModalMode =
  | 'create'
  | 'edit'
  | 'delete'
  | null;

@Component({
  selector: 'app-carManagment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ThousandSeparatorPipe
  ],
  templateUrl: './carManagment.component.html',
  styleUrls: ['./carManagment.component.css']
})

export class CarManagmentComponent
implements OnInit {

  // ======================
  // INJECT
  // ======================

  private adminService =
    inject(AdminService);
  private readonly toastr = inject(ToastrService);
  saving = false;

  // ======================
  // CONSTANTS
  // ======================

  imageBaseUrl = 'https://api.mayakhodro.com/';
  getImageUrl(path?: string): string {
    if (!path) return '/assets/images/car-placeholder.svg';
    return /^https?:\/\//i.test(path) ? path : `${this.imageBaseUrl}${path.replace(/^\//, '')}`;
  }
  search = '';
  page = 0;
  readonly pageSize = 20;
  get filteredCars(): Car[] {
    const q = this.search.trim().toLocaleLowerCase();
    return q ? this.cars().filter(c => [c.name,c.carModeName,c.tipName,c.companyName,c.company]
      .some(v => String(v ?? '').toLocaleLowerCase().includes(q))) : this.cars();
  }
  get visibleCars(): Car[] { return this.filteredCars.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredCars.length / this.pageSize)); }
  changePage(delta: number): void { this.page = Math.max(0, Math.min(this.totalPages - 1, this.page + delta)); }
  trackByCar(_index: number, car: Car): number { return car.id; }
  private lookupId(value: string | number | undefined, items: {id:number;name:string}[]): number {
    const match = items.find(i => i.name === String(value) || i.id === Number(value));
    return match?.id ?? 0;
  }

  // ======================
  // SIGNALS
  // ======================

  cars = signal<Car[]>([]);
  carModels = signal<CarModel[]>([]);
  companies = signal<Company[]>([]);
  tips = signal<Tip[]>([]);

  selectedCar =
    signal<Car | null>(null);

  activeModal =
    signal<ModalMode>(null);

  dto =
    signal<CreateCar>(this.createEmptyDto());

  // ======================
  // FILE
  // ======================

  selectedFile: File | null = null;

  imagePreview:
    string | ArrayBuffer | null = null;

  // ======================
  // LIFECYCLE
  // ======================

  ngOnInit(): void {

    this.loadInitialData();

  }

  // ======================
  // INIT
  // ======================

  private loadInitialData(): void {

    this.loadCars();
    this.loadCarModels();
    this.loadCompanies();
    this.loadTips();

  }

  private createEmptyDto(): CreateCar {

    return {

      carModelName: 0,
      tipName: 0,
      companyName: 0,

      name: '',
      startDate: '',
      price: 0,

      imageName: '',
      description: ''

    };
  }

  // ======================
  // LOAD DATA
  // ======================

  loadCars(): void {

    this.adminService.getCars().subscribe({

      next: res => {
        this.cars.set(res);
        this.page = Math.min(this.page, this.totalPages - 1);
      },

      error: err => {
        console.error(
          'Load cars error',
          err
        );
      }

    });
  }

  loadCarModels(): void {

    this.adminService.getCarModels()
      .subscribe({

        next: res => {

          if (res.isSuccess) {
            this.carModels.set(res.data);
          }

        },

        error: err => {
          console.error(
            'Load car models error',
            err
          );
        }

      });
  }


  loadCompanies(): void {

    this.adminService.getCompanyies()
      .subscribe({

        next: res => {

          if (res.isSuccess) {
            this.companies.set(res.data);
          }

        },

        error: err => {
          console.error(
            'Load companies error',
            err
          );
        }

      });
  }

  loadTips(): void {

    this.adminService.getTipes()
      .subscribe({

        next: res => {

          if (res.isSuccess) {
            this.tips.set(res.data);
          }

        },

        error: err => {
          console.error(
            'Load tips error',
            err
          );
        }

      });
  }

  // ======================
  // MODAL
  // ======================

  openCreate(): void {

    this.selectedCar.set(null);

    this.dto.set(
      this.createEmptyDto()
    );

    this.resetFileState();

    this.activeModal.set('create');
  }

  openEdit(car: Car): void {

    this.selectedCar.set(car);

    this.dto.set({

      carModelName:
        this.lookupId(car.carModeName, this.carModels()),


      tipName:
        this.lookupId(car.tipName, this.tips()),

      companyName:
        this.lookupId(car.companyName || car.company, this.companies()),

      name:
        car.name || '',

      startDate:
        car.startDate || '',

      price:
        Number(car.price) || 0,

      imageName:
        car.imageName || '',

      description:
        car.description || ''

    });

    this.resetFileState();

    this.activeModal.set('edit');
  }

  openDelete(car: Car): void {

    this.selectedCar.set(car);

    this.activeModal.set('delete');
  }

  closeModal(): void {

    this.activeModal.set(null);

    this.resetFileState();
  }

  // ======================
  // FILE
  // ======================

  private resetFileState(): void {

    this.selectedFile = null;

    this.imagePreview = null;

  }

  onFileSelected(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (!file) {
      return;
    }

    this.selectedFile = file;

    const reader =
      new FileReader();

    reader.onload = () => {

      this.imagePreview =
        reader.result;

    };

    reader.readAsDataURL(file);
  }

  // ======================
  // SAVE
  // ======================

  saveImage(): void {
    const car = this.selectedCar();
    if (!car || !this.selectedFile || this.saving) return;

    this.saving = true;
    this.adminService.updateVehicleImage(car.id, this.selectedFile).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('عکس خودرو ذخیره شد.');
        this.afterSave();
      },
      error: () => {
        this.saving = false;
        this.toastr.error('ذخیره عکس خودرو ناموفق بود.');
      }
    });
  }

  saveCar(): void {

    if (this.saving) return;
    const dto = this.dto();
    if (!dto.name?.trim() || !dto.carModelName || !dto.tipName || !dto.companyName) {
      this.toastr.error('نام، مدل، تیپ و شرکت الزامی هستند.');
      return;
    }
    const formData = this.buildFormData();
    this.saving = true;

    if (
      this.activeModal() === 'create'
    ) {

      this.createCar(formData);

      return;
    }

    if (
      this.activeModal() === 'edit'
    ) {

      this.updateCar(formData);

    }
  }

  private buildFormData():
  FormData {

    const dto =
      this.dto();

    const formData =
      new FormData();

    formData.append(
      'Name',
      dto.name
    );

    formData.append(
      'CarModelId',
      dto.carModelName.toString()
    );


    formData.append(
      'TipId',
      dto.tipName.toString()
    );

    formData.append(
      'CompanyId',
      dto.companyName.toString()
    );

    formData.append(
      'StartDate',
      dto.startDate
    );

    formData.append(
      'Price',
      dto.price.toString()
    );

    formData.append(
      'Description',
      dto.description
    );

    if (this.selectedFile) {

      formData.append(
        'ImageName',
        this.selectedFile
      );

    }

    return formData;
  }

  private createCar(
    formData: FormData
  ): void {

    this.adminService.createCar(formData)
      .subscribe({

        next: () => {
          this.saving = false;
          this.toastr.success('خودرو ذخیره شد');
          this.afterSave();

        },

        error: err => {

          this.saving = false;
          this.toastr.error('خطا در ایجاد خودرو');

        }

      });
  }

  private updateCar(
    formData: FormData
  ): void {

    const car =
      this.selectedCar();

    if (!car) {
      this.saving = false;
      return;
    }

    formData.append(
      'Id',
      car.id.toString()
    );

    this.adminService.updateCar(formData)
      .subscribe({

        next: () => {

          this.afterSave();

        },

        error: err => {

          this.saving = false;
          this.toastr.error('خطا در ویرایش خودرو');

        }

      });
  }

  private afterSave(): void {

    this.loadCars();

    this.closeModal();

  }

  // ======================
  // DELETE
  // ======================

  deleteCar(): void {

    const car =
      this.selectedCar();

    if (!car) {
      return;
    }

    this.adminService
      .deleteCar(car.id)
      .subscribe({

        next: () => {

          this.loadCars();

          this.closeModal();

        },

        error: err => {

          this.toastr.error('خطا در حذف خودرو');

        }

      });
  }

}
