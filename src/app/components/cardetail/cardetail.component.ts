import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CarService } from '../../services/car/car.service';
import { Car } from '../../models/car/car';
import { ThousandSeparatorPipe } from '../../../../pipes/ThousandSeparatorPipe.pipe';

@Component({
  selector: 'app-cardetail',
  templateUrl: './cardetail.component.html',
  styleUrls: ['./cardetail.component.css'],
  standalone: true,
  imports: [CommonModule, ThousandSeparatorPipe, RouterLink]
})
export class CardetailComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly service = inject(CarService);
  private readonly route = inject(ActivatedRoute);

  car: Car | null = null;
  isLoading = true;
  imageBaseUrl = 'https://mayakhoddrobackend-mayacar.runflare.run/';

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const carId = Number(params.get('carId'));
      if (!carId || Number.isNaN(carId)) { this.isLoading = false; return; }
      this.getCarDetail(carId);
    });
  }

  getCarDetail(carId: number): void {
    this.isLoading = true;
    this.service.getCarDetail(carId).subscribe({
      next: (res: any) => {
        this.car = res?.data ?? res;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.car = null; this.isLoading = false; }
    });
  }

  getMarketPrice(car: Car): number { return Number(car.marketPrice ?? car.price ?? 0); }
  getFactoryPrice(car: Car): number { return Number(car.factoryPrice ?? 0); }
  getPriceGap(car: Car): number { return Math.max(0, this.getMarketPrice(car) - this.getFactoryPrice(car)); }
  getPriceGapPercent(car: Car): number {
    const factory = this.getFactoryPrice(car);
    return factory > 0 ? Math.round((this.getPriceGap(car) / factory) * 100) : 0;
  }
  getImageUrl(car: Car): string {
    const image = (car.imageName || '').trim();
    if (!image) return '/assets/images/car-placeholder.svg';
    if (/^(https?:|data:|blob:)/i.test(image)) return image;
    return `${this.imageBaseUrl.replace(/\/$/, '')}/${image.replace(/^\//, '')}`;
  }
  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/assets/images/car-placeholder.svg')) image.src = '/assets/images/car-placeholder.svg';
  }
}