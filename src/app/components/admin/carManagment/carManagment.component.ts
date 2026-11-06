import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
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

import { Category }
from '../../../models/category/category';

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

  // ======================
  // CONSTANTS
  // ======================

  //imageBaseUrl ='http://localhost:8080';
   imageBaseUrl = 'https://mayakhoddrobackend-mayacar.runflare.run/';

  // ======================
  // SIGNALS
  // ======================

  cars = signal<Car[]>([]);
  carModels = signal<CarModel[]>([]);
  categories = signal<Category[]>([]);
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
    this.loadCategories();
    this.loadCompanies();
    this.loadTips();

  }

  private createEmptyDto(): CreateCar {

    return {

      carModelName: 0,
      categoryName: 0,
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

  loadCategories(): void {

    this.adminService.getCategories()
      .subscribe({

        next: res => {

          if (res.isSuccess) {
            this.categories.set(res.data);
          }

        },

        error: err => {
          console.error(
            'Load categories error',
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
        Number(car.carModeName) || 0,

      categoryName:
        Number(car.categoryName) || 0,

      tipName:
        Number(car.tipName) || 0,

      companyName:
        Number(car.company) || 0,

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

  saveCar(): void {

    const formData =
      this.buildFormData();

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
      'CategoryId',
      dto.categoryName.toString()
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

          this.afterSave();

        },

        error: err => {

          console.error(
            'Create car error',
            err
          );

        }

      });
  }

  private updateCar(
    formData: FormData
  ): void {

    const car =
      this.selectedCar();

    if (!car) {
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

          console.error(
            'Update car error',
            err
          );

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

          console.error(
            'Delete car error',
            err
          );

        }

      });
  }

}
