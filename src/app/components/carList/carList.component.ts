import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

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
export class CarListComponent implements OnInit, OnDestroy {
  private readonly carService = inject(CarService);

  cars = signal<Car[]>([]);
  companyList = signal<Company[]>([]);
  isLoading = signal(false);
  error = signal('');
  private request?: Subscription;
  private requestVersion = 0;
  readonly pageSize = 12;
  hasNextPage = signal(false);
  isFilterOpen = false;

  carFilter = signal<CarFilter>({
    minPrice: undefined,
    maxPrice: undefined,
    company: '',
    pageSize: 12,
    pageNumber: 0
  });

  ngOnInit(): void {
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
    this.request?.unsubscribe();
    const version = ++this.requestVersion;
    this.error.set('');
    this.isLoading.set(true);
    this.request = this.carService.getAllCarsWithFilter(this.carFilter()).subscribe({
      next: (res) => {
        if (version !== this.requestVersion) return;
        const rows: Car[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.cars.set(rows);
        this.hasNextPage.set(rows.length === this.pageSize);
        this.isLoading.set(false);
      },
      error: () => {
        if (version !== this.requestVersion) return;
        this.error.set('دریافت خودروها ناموفق بود. دوباره تلاش کنید.');
        this.cars.set([]);
        this.hasNextPage.set(false);
        this.isLoading.set(false);
      }
    });
  }

  changePage(delta: number): void {
    const next = this.carFilter().pageNumber! + delta;
    if (next < 0 || (delta > 0 && !this.hasNextPage())) return;
    this.carFilter.update(f => ({ ...f, pageNumber: next }));
    this.applyFilter();
  }

  submitFilters(): void {
    this.carFilter.update(f => ({ ...f, pageNumber: 0 }));
    this.applyFilter();
  }

  ngOnDestroy(): void { this.request?.unsubscribe(); }

  resetFilter(): void {
    this.carFilter.set({
      minPrice: undefined,
      maxPrice: undefined,
      company: '',
      pageSize: 12,
      pageNumber: 0
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
    return image.startsWith('http') ? image : `https://api.mayakhodro.com${image.startsWith('/') ? image : `/${image}`}`;
  }

  trackByCompany(index: number, item: Company): number {
    return item.id;
  }

  trackByCar(index: number, item: Car): string {
    return `${item.id}:${item.startDate ?? ''}`;
  }

  hasActiveFilter(): boolean {
    const filter = this.carFilter();
    return Boolean(filter.company || filter.minPrice != null || filter.maxPrice != null);
  }
}
