import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ThousandSeparatorPipe } from '../../../../pipes/ThousandSeparatorPipe.pipe';
import { Car } from '../../models/car/car';
import { CarFilter } from '../../models/car/carFilter';
import { Company } from '../../models/company/companyName';
import { CarModel } from '../../models/carModel/carmodel';
import { CarService } from '../../services/car/car.service';

@Component({
  selector: 'app-car-list',
  templateUrl: './carList.component.html',
  styleUrls: ['./carList.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink, ThousandSeparatorPipe]
})
export class CarListComponent implements OnInit {
  private readonly carService = inject(CarService);
  private readonly router = inject(Router);

  cars = signal<Car[]>([]);
  companyList = signal<Company[]>([]);
  modelList = signal<CarModel[]>([]);
  isLoading = signal(false);
  isNewCarsPage = false;
  isFilterOpen = false;

  carFilter = signal<CarFilter>({
    minPrice: undefined,
    maxPrice: undefined,
    company: '',
    modelId: undefined,
    pageSize: 12,
    pageNumber: 0
  });

  ngOnInit(): void {
    this.isNewCarsPage = this.router.url.startsWith('/newCars');
    this.loadCompanies();
    this.loadModels();
    this.applyFilter();
  }

  loadCompanies(): void {
    this.carService.getAllCompanies().subscribe({
      next: (res) => this.companyList.set(res?.data || res || []),
      error: () => this.companyList.set([])
    });
  }

  loadModels(): void {
    this.carService.getAllModels().subscribe({
      next: (res) => this.modelList.set(res?.data || res || []),
      error: () => this.modelList.set([])
    });
  }

  applyFilter(): void {
    this.isLoading.set(true);
    const request = this.isNewCarsPage
      ? this.carService.getNewCarsWithFilter(this.carFilter())
      : this.carService.getAllCarsWithFilter(this.carFilter());

    request.subscribe({
      next: (res) => {
        this.cars.set(res?.data || res || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.cars.set([]);
        this.isLoading.set(false);
      }
    });
  }

  resetFilter(): void {
    this.carFilter.set({
      minPrice: undefined,
      maxPrice: undefined,
      company: '',
      modelId: undefined,
      pageSize: 12,
      pageNumber: 0
    });
    this.applyFilter();
  }

  updateModel(value: string | number): void {
    this.carFilter.update(filter => ({
      ...filter,
      modelId: value === '' ? undefined : Number(value)
    }));
  }

  updateCompany(value: string): void {
    this.carFilter.update(filter => ({ ...filter, company: value }));
  }

  updateMinPrice(value: string | number): void {
    this.carFilter.update(filter => ({
      ...filter,
      minPrice: value === '' ? undefined : Number(value)
    }));
  }

  updateMaxPrice(value: string | number): void {
    this.carFilter.update(filter => ({
      ...filter,
      maxPrice: value === '' ? undefined : Number(value)
    }));
  }

  getCompany(car: Car): string {
    return car.companyName || car.company || 'برند ثبت نشده';
  }

  getModel(car: Car): string {
    return car.carModeName || car.name;
  }

  getMarketPrice(car: Car): number {
    return car.marketPrice ?? car.price ?? 0;
  }

  getFactoryPrice(car: Car): number {
    return car.factoryPrice ?? 0;
  }

  getImageUrl(car: Car): string {
    const image = car.imageName || car.details?.imageUrl || '';
    if (!image) return 'assets/images/car-placeholder.svg';
    return image.startsWith('http') ? image : `https://api.mayakhodro.com${image.startsWith('/') ? image : `/${image}`}`;
  }

  trackByCompany(index: number, item: Company): number {
    return item.id;
  }

  trackByCar(index: number, item: Car): number {
    return item.id;
  }

  hasActiveFilter(): boolean {
    const filter = this.carFilter();
    return Boolean(filter.company || filter.modelId != null || filter.minPrice != null || filter.maxPrice != null);
  }

  trackByModel(index: number, item: CarModel): number {
    return item.id;
  }
}
