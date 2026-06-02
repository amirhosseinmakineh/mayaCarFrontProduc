import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Order } from '../../models/order/order';
import { OrderItem } from '../../models/orderItem/orderItem';
import { Result } from '../../models/result';

@Injectable({
  providedIn: 'root'
})
export class UserPannelService {
  private readonly baseUrl = 'https://mayakhoddrobackend-mayacar.runflare.run/api';
  //private readonly baseUrl = 'http://localhost:8080/api';
  private client = inject(HttpClient);
constructor() { }
getOrders(userId : string) : Observable<Result<Order[]>>{
  const params = new HttpParams().set('userId', userId);
  return this.client.get<Result<Order[]>>(`${this.baseUrl}/Order/GetUserOrders`,{params});
}
getOrderItems(orderId: number): Observable<Result<OrderItem[]>> {
  const params = new HttpParams().set('orderId', orderId);
  return this.client.get<Result<OrderItem[]>>(`${this.baseUrl}/OrderItem`, { params });
}
}
