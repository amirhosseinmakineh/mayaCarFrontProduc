import {
  Component,
  inject,
  OnInit
} from '@angular/core';

import {
  ActivatedRoute
} from '@angular/router';

import {
  CommonModule
} from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  CarService
} from '../../services/car/car.service';

import {
  Car
} from '../../models/car/car';

import {
  ThousandSeparatorPipe
}
from '../../../../pipes/ThousandSeparatorPipe.pipe';
import {
  ChangeDetectorRef
} from '@angular/core';

@Component({
  selector: 'app-cardetail',
  templateUrl: './cardetail.component.html',
  styleUrls: ['./cardetail.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ThousandSeparatorPipe,
    RouterLink
  ]
})
export class CardetailComponent implements OnInit {
private readonly cdr =
  inject(ChangeDetectorRef);
  private readonly service =
    inject(CarService);

  private readonly route =
    inject(ActivatedRoute);

  // ================= DATA =================

  car: Car | null = null;

  isLoading = true;

  // ================= IMAGE =================

  //imageBaseUrl = 'http://localhost:8080';
  imageBaseUrl =
    'https://mayakhoddrobackend-mayacar.runflare.run/';

  // ================= INIT =================

  ngOnInit(): void {
          this.cdr.detectChanges();
    this.route.paramMap.subscribe({

      next: (params) => {

        const id =
          params.get('carId');

        const carId =
          Number(id);

        console.log('CAR ID =>', carId);

        if (!carId || isNaN(carId)) {

          console.error('carId نامعتبر است');

          this.isLoading = false;

          return;

        }

        this.getCarDetail(carId);

      },

      error: (err) => {

        console.error(err);

        this.isLoading = false;

      }

    });

  }

  // ================= GET DETAIL =================

  getCarDetail(carId: number): void {

    this.isLoading = true;

    this.car = null;

    this.service
      .getCarDetail(carId)
      .subscribe({

        next: (res: any) => {
          console.log('API RESPONSE =>', res);

          if (res?.data) {

            this.car = res.data;

          }
          else {

            this.car = res;

          }

          console.log('CAR =>', this.car);
          this.isLoading = false;
          this.cdr.detectChanges();

        },

        error: (err) => {

          console.error('DETAIL ERROR =>', err);

          this.car = null;

          this.isLoading = false;

        },

        complete: () => {

          console.log('REQUEST COMPLETED');

        }

      });

  }

  getMarketPrice(car: Car): number {
    return Number(car.marketPrice ?? car.price ?? 0);
  }

  getFactoryPrice(car: Car): number {
    return Number(car.factoryPrice ?? 0);
  }

  getImageUrl(car: Car): string {
    const image = (car.imageName || '').trim();
    if (!image) return '/assets/images/car-placeholder.svg';
    if (/^(https?:|data:|blob:)/i.test(image)) return image;
    return `${this.imageBaseUrl.replace(/\/$/, '')}/${image.replace(/^\//, '')}`;
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.src.endsWith('/assets/images/car-placeholder.svg')) return;
    image.src = '/assets/images/car-placeholder.svg';
  }

}
