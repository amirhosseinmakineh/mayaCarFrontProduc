import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Car } from '../../models/car/car';
import { CarFilter } from '../../models/car/carFilter';
import { Company } from '../../models/company/companyName';
import { CarModel } from '../../models/carModel/carmodel';
import { Result } from '../../models/result';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CarService {

  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;
  constructor() { }

  getAllCarsWithFilter(filter: CarFilter): Observable<any> {

    return this.getCars('car', filter);
  }

  getNewCarsWithFilter(filter: CarFilter): Observable<any> {
    return this.getCars('car/new', filter);
  }

  private getCars(path: string, filter: CarFilter): Observable<any> {

    let params = new HttpParams();

    if (filter.minPrice != null)
      params = params.set('minPrice', filter.minPrice.toString());

    if (filter.maxPrice != null)
      params = params.set('maxPrice', filter.maxPrice.toString());

    if (filter.company)
      params = params.set('company', filter.company);

    if (filter.modelId != null)
      params = params.set('modelId', filter.modelId.toString());

    if (filter.pageSize != null)
      params = params.set('pageSize', filter.pageSize.toString());

    if (filter.pageNumber != null)
      params = params.set('pageNumber', filter.pageNumber.toString());

    return this.http.get<Car[]>(`${this.baseUrl}/${path}`, { params });
  }

  getAllCompanies(): Observable<any> {
    return this.http.get(this.baseUrl + '/Company');
  }

  getAllModels(): Observable<any> {
    return this.http.get<CarModel[]>(this.baseUrl + '/Model');
  }

  getCarDetail(carId: number): Observable<Result<Car>> {
    return this.http.get<Result<Car>>(`${this.baseUrl}/car/GetCarDetail/${carId}`);
  }


}
