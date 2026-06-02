import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { Car }
from '../../models/car/car';

import { CarFilter }
from '../../models/car/carFilter';

import { Company }
from '../../models/company/companyName';

import { CarService }
from '../../services/car/car.service';

import { FormsModule }
from '@angular/forms';

import { CommonModule }
from '@angular/common';

import {
  RouterLink,
  Router
}
from '@angular/router';

import { ThousandSeparatorPipe }
from '../../../../pipes/ThousandSeparatorPipe.pipe';

@Component({
  selector: 'app-car-list',
  templateUrl: './carList.component.html',
  styleUrls: ['./carList.component.css'],
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    RouterLink,
    ThousandSeparatorPipe
  ]
})
export class CarListComponent
implements OnInit {

  private readonly carService =
    inject(CarService);

  private readonly router =
    inject(Router);

  // ================= Signals =================

  cars =
    signal<Car[]>([]);

  companyList =
    signal<Company[]>([]);

  isLoading =
    signal(false);

  // ================= Filter =================

  carFilter =
    signal<CarFilter>({
      minPrice: undefined,
      maxPrice: undefined,
      company: '',
      pageSize: 10,
      pageNumber: 1
    });

  isFilterOpen = false;

  // ================= Image =================

  //imageBaseUrl = 'http://localhost:8080';

  imageBaseUrl =
    'https://mayakhoddrobackend-mayacar.runflare.run/';

  ngOnInit(): void {

    this.loadCompanies();

    this.applyFilter();

  }

  // ================= Companies =================

  loadCompanies(): void {

    this.carService
      .getAllCompanies()
      .subscribe({

        next: (res) => {

          this.companyList
            .set(res.data || []);

        },

        error: (err) => {

          console.error(err);

          this.companyList
            .set([]);

        }

      });

  }

  // ================= Cars =================

  applyFilter(): void {

    this.isLoading
      .set(true);

    this.carService
      .getAllCarsWithFilter(
        this.carFilter()
      )
      .subscribe({

        next: (res) => {

          this.cars
            .set(res || []);

          this.isLoading
            .set(false);

        },

        error: (err) => {

          console.error(err);

          this.cars
            .set([]);

          this.isLoading
            .set(false);

        }

      });

  }

  // ================= Updates =================

  updateCompany(
    value: string
  ): void {

    this.carFilter.update(f => ({
      ...f,
      company: value
    }));

  }

  updateMinPrice(
    value: string
  ): void {

    this.carFilter.update(f => ({
      ...f,
      minPrice: value
        ? +value
        : undefined
    }));

  }

  updateMaxPrice(
    value: string
  ): void {

    this.carFilter.update(f => ({
      ...f,
      maxPrice: value
        ? +value
        : undefined
    }));

  }

  // ================= TrackBy =================

  trackByCompany(
    index: number,
    item: Company
  ) {

    return item.id;

  }

  trackByCar(
    index: number,
    item: Car
  ) {

    return item.id;

  }

  // ================= Accessor =================

  companies() {

    return this.companyList();

  }

}
