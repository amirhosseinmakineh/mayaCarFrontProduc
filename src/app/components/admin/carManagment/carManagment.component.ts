import { finalize, timeout } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';

import { AdminService, CatalogModelImage }
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
  savingModelImage = false;
  selectedModelId = 0;
  selectedModelFile: File | null = null;
  modelImages = signal<CatalogModelImage[]>([]);
  private carsRequest?: Subscription;
  private searchTimer?: ReturnType<typeof setTimeout>;
  deleting = false;
  totalCars = 0;
  loadingCars = false;

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
  readonly pageSize = 10;
  get visibleCars(): Car[] { return this.cars(); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalCars / this.pageSize)); }
  changePage(delta: number): void {
    const next = Math.max(0, Math.min(this.totalPages - 1, this.page + delta));
    if (next !== this.page) { this.page = next; this.loadCars(); }
  }
  onSearchChanged(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 0; this.loadCars(); }, 300);
  }
  goToPage(page: number): void {
    const next = Math.max(0, Math.min(this.totalPages - 1, page));
    if (next !== this.page) { this.page = next; this.loadCars(); }
  }
  get pageNumbers(): number[] {
    const start = Math.max(0, Math.min(this.page - 2, this.totalPages - 5));
    return Array.from({ length: Math.min(5, this.totalPages) }, (_, i) => start + i);
  }
  get firstVisible(): number { return this.totalCars ? this.page * this.pageSize + 1 : 0; }
  get lastVisible(): number { return Math.min((this.page + 1) * this.pageSize, this.totalCars); }
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
    this.loadModelImages();
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
    this.carsRequest?.unsubscribe();
    this.loadingCars = true;
    this.carsRequest = this.adminService.getCars(this.search, this.page, this.pageSize)
      .pipe(finalize(() => this.loadingCars = false))
      .subscribe({
        next: res => {
          this.totalCars = res.filteredCount;
          if (this.page >= this.totalPages && this.page > 0) {
            this.page = this.totalPages - 1;
            this.loadCars();
            return;
          }
          this.cars.set(res.items.map(item => ({
            id: item.id,
            name: item.name,
            imageName: item.imageName,
            description: item.description,
            company: item.company,
            companyName: item.company,
            carModeName: item.model,
            tipName: item.tip,
            startDate: item.startDate,
            price: item.marketPrice,
            marketPrice: item.marketPrice,
            factoryPrice: item.factoryPrice
          })));
        },
        error: () => this.toastr.error('دریافت فهرست خودروها ناموفق بود.')
      });
  }

  loadModelImages(): void {
    this.adminService.getCatalogModelImages().subscribe({
      next: models => this.modelImages.set(models),
      error: () => this.toastr.error('دریافت تصاویر مدل‌ها ناموفق بود.')
    });
  }

  onModelFileSelected(event: Event): void {
    this.selectedModelFile = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  saveModelImage(): void {
    if (!this.selectedModelId || !this.selectedModelFile || this.savingModelImage) return;
    this.savingModelImage = true;
    this.adminService.uploadCatalogModelImage(this.selectedModelId, this.selectedModelFile)
      .pipe(finalize(() => this.savingModelImage = false))
      .subscribe({
        next: result => {
          this.toastr.success(`تصویر مدل ذخیره شد؛ ${result.updatedCars} خودروی مرجع به‌روزرسانی شد.`);
          this.selectedModelFile = null;
          this.loadModelImages();
          this.loadCars();
        },
        error: () => this.toastr.error('آپلود تصویر مدل ناموفق بود.')
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
    this.adminService.updateVehicleImage(car.id, this.selectedFile)
      .pipe(timeout(70000), finalize(() => this.saving = false))
      .subscribe({
        next: result => {
          if (!result?.imageName) {
            this.toastr.error('پاسخ سرور فاقد آدرس عکس است.');
            return;
          }
          this.toastr.success('عکس خودرو ذخیره شد.');
          this.afterSave();
        },
        error: err => {
          const message = err?.status === 413 ? 'حجم فایل بیش از حد مجاز است.'
            : err?.status === 401 || err?.status === 403 ? 'دسترسی شما منقضی شده یا مجاز نیست.'
            : err?.name === 'TimeoutError' ? 'زمان پاسخ سرور تمام شد؛ دوباره تلاش کنید.'
            : 'آپلود عکس ناموفق بود. دوباره تلاش کنید.';
          this.toastr.error(message);
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
          this.saving = false;
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
    if (this.deleting) return;

    const car =
      this.selectedCar();

    if (!car) {
      return;
    }

    this.deleting = true;
    this.adminService
      .deleteCar(car.id)
      .pipe(finalize(() => this.deleting = false))
      .subscribe({

        next: () => {
          this.toastr.success('خودرو حذف شد.');
          this.loadCars();

          this.closeModal();

        },

        error: err => {

          this.toastr.error('خطا در حذف خودرو');

        }

      });
  }

}
