import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, Observable, throwError, timeout, TimeoutError } from 'rxjs';
import { Car } from '../../models/car/car';
import { CarFilter } from '../../models/car/carFilter';
import { Company } from '../../models/company/companyName';
import { Result } from '../../models/result';
import { environment } from '../../../environments/environment';

export interface CarReferencePage {
  items: Car[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  approvedReferenceCount: number;
  missingCatalogMatches: number;
}

@Injectable({
  providedIn: 'root'
})
export class CarService {

  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;
  constructor() { }

  getAllCarsWithFilter(filter: CarFilter): Observable<CarReferencePage> {

    let params = new HttpParams();

    if (filter.minPrice != null)
      params = params.set('minPrice', filter.minPrice.toString());

    if (filter.maxPrice != null)
      params = params.set('maxPrice', filter.maxPrice.toString());

    if (filter.company)
      params = params.set('company', filter.company);

    if (filter.pageSize != null)
      params = params.set('pageSize', filter.pageSize.toString());

    if (filter.pageNumber != null)
      params = params.set('pageNumber', filter.pageNumber.toString());

    const proxyUrl = `${this.baseUrl}/car/references`;
    const directUrl = `${environment.publicCatalogApiUrl}/car/references`;
    const initialRequest = this.http.get<CarReferencePage>(directUrl, { params });
    if (directUrl === proxyUrl) return initialRequest;

    return initialRequest.pipe(
      timeout({ first: 6_000 }),
      catchError((error: unknown) => {
        const unavailable = error instanceof HttpErrorResponse
          && (error.status === 0 || error.status >= 500);
        if (!unavailable && !(error instanceof TimeoutError)) return throwError(() => error);
        return this.http.get<CarReferencePage>(proxyUrl, { params });
      }),
    );
  }
getAllCompanies(): Observable<any> {
  return this.http.get(this.baseUrl + '/Company');
}

getCarDetail(carId: number): Observable<Result<Car>> {
  return this.http.get<Result<Car>>(`${this.baseUrl}/car/GetCarDetail/${carId}`);
}


}
