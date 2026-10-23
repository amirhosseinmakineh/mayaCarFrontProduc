import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ThousandSeparatorPipe } from '../../../../pipes/ThousandSeparatorPipe.pipe';
import { Car } from '../../models/car/car';
import { CarFilter } from '../../models/car/carFilter';
import { Company } from '../../models/company/companyName';
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
  private readonly route = inject(ActivatedRoute);

  isUsed = false;
  pageTitle = 'خودروهای صفر';
  pageDescription = 'خودروی موردنظرتان را پیدا کنید و جزئیات کامل، قیمت کارخانه و بازار را ببینید.';

  cars = signal<Car[]>([]);
  companyList = signal<Company[]>([]);
  isLoading = signal(false);
  isFilterOpen = false;

  carFilter = signal<CarFilter>({
    minPrice: undefined,
    maxPrice: undefined,
    company: '',
    pageSize: 12,
    pageNumber: 0,
    isUsed: false
  });

  ngOnInit(): void {
    this.isUsed = this.route.snapshot.data['isUsed'] === true;
    this.pageTitle = this.isUsed ? 'خودروهای دست‌دوم' : 'خودروهای صفر';
    this.pageDescription = this.isUsed
      ? 'خودروهای دست‌دوم را با مشخصات و قیمت به‌روز بررسی کنید.'
      : 'خودروی موردنظرتان را پیدا کنید و جزئیات کامل، قیمت کارخانه و بازار را ببینید.';
    this.carFilter.update(filter => ({ ...filter, isUsed: this.isUsed }));
    this.loadCompanies();
    this.applyFilter();
  }

  loadCompanies(): void {
    this.carService.getAllCompanies().subscribe({
      next: (res) => this.companyList.set(res?.data || res || []),
      error: () => this.companyList.set([])
    });
  }

  applyFilter(): void {
    this.isLoading.set(true);
    this.carService.getAllCarsWithFilter(this.carFilter()).subscribe({
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
      pageSize: 12,
      pageNumber: 0,
      isUsed: this.isUsed
    });
    this.applyFilter();
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
    return image.startsWith('http') ? image : `${environment.apiUrl.replace(/\/api\/?$/, '')}${image.startsWith('/') ? image : `/${image}`}`;
  }

  trackByCompany(index: number, item: Company): number {
    return item.id;
  }

  trackByCar(index: number, item: Car): number {
    return item.id;
  }

  hasActiveFilter(): boolean {
    const filter = this.carFilter();
    return Boolean(filter.company || filter.minPrice != null || filter.maxPrice != null);
  }
}
