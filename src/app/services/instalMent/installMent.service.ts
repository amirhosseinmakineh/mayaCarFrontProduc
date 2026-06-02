import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InstallmentService {

  private readonly baseUrl = 'https://mayakhoddrobackend-mayacar.runflare.run';
  //private readonly baseUrl = 'http://localhost:8080';
  constructor(private http: HttpClient) {}

  calculate(carPrice: number | null, prePayment: number | null, time: number | null): Observable<number> {
    return this.http.post<number>(
      `${this.baseUrl}/WeatherForecast/Calculate`,
      {
          carPrice: carPrice,
          prePayment: prePayment,
          time: time
      }
    );
  }
}
