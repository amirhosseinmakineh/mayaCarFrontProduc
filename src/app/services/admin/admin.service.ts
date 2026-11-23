import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { Car } from "../../models/car/car";
import { CreateCar } from "../../models/car/createCar";
import { UpdateCar } from "../../models/car/updateCar";
import { CarModel } from "../../models/carModel/carmodel";
import { Company } from "../../models/company/companyName";
import { Role } from "../../models/role/role";
import { Tip } from "../../models/tip/tip";
import { CreateUser } from "../../models/user/createUser";
import { UpdateUser } from "../../models/user/updateUser";
import { User } from "../../models/user/user";
import { CreateCarModel } from "../../models/carModel/createCarModel";
import { EditCarModel } from "../../models/carModel/editCarModel";
import { CreateCompany } from "../../models/company/createCompany";
import { EditCompany } from "../../models/company/editCompany";
import { CreateTip } from "../../models/tip/createTip";
import { EditTip } from "../../models/tip/editTip";
import { Result } from "../../models/result";
import { CreateOrder, Order } from '../../models/order/order';
import { OrderItem } from "../../models/orderItem/orderItem";

export interface AdminUsersPage {
  items: User[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface CatalogModelImage {
  id: number;
  name: string;
  imageName: string | null;
}

export interface AdminCarPage {
  items: Array<{
    id: number; name: string; imageName: string; description: string;
    carModelId: number | null; tipId: number | null; companyId: number | null;
    company: string; model: string; tip: string; startDate: string;
    marketPrice: number; factoryPrice: number;
  }>;
  filteredCount: number; pageNumber: number; pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  //private readonly baseUrl = 'https://api.mayakhodro.com/api';
  private readonly baseUrl = environment.apiUrl;
  private client = inject(HttpClient);

  constructor() { }

  getUsers(pageNumber = 0, pageSize = 15, search = ''): Observable<AdminUsersPage> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (search.trim()) params = params.set('search', search.trim());
    return this.client.get<AdminUsersPage>(`${this.baseUrl}/User/GetUsers`, { params });
  }

  createUser(dto: CreateUser): Observable<Result<unknown>> {
    return this.client.post<Result<unknown>>(`${this.baseUrl}/user/createUser`, dto);
  }

  updateUser(dto: UpdateUser): Observable<Result<unknown>> {
    return this.client.post<Result<unknown>>(`${this.baseUrl}/user/UpdateUser`, dto);
  }

  deleteUser(id: string): Observable<Result<unknown>> {
    return this.client.get<Result<unknown>>(`${this.baseUrl}/user/DeleteUser/${id}`);
  }

  getAllRoles(): Observable<Role[]> {
    return this.client.get<Role[]>(`${this.baseUrl}/role`);
  }

  getCars(search = '', pageNumber = 0, pageSize = 20): Observable<AdminCarPage> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (search.trim()) params = params.set('search', search.trim());
    return this.client.get<AdminCarPage>(`${this.baseUrl}/admin/catalog`, { params });
  }

  // ✔ باز کردن امضا برای قبول کردن FormData
  createCar(dto: CreateCar | FormData): Observable<Result<unknown>> {
    return this.client.post<Result<unknown>>(`${this.baseUrl}/car`, dto);
  }

  // ✔ باز کردن امضا برای قبول کردن FormData
  updateCar(dto: UpdateCar | FormData, requestId?: string): Observable<Result<unknown>> {
    const includesImage = dto instanceof FormData && dto.get('Image') instanceof Blob;
    const baseUrl = includesImage ? environment.catalogImageUploadApiUrl : this.baseUrl;
    const headers = requestId ? { 'X-Request-Id': requestId } : undefined;
    return this.client.patch<Result<unknown>>(`${baseUrl}/car`, dto, { headers });
  }

  getCatalogModelImages(): Observable<CatalogModelImage[]> {
    return this.client.get<CatalogModelImage[]>(`${this.baseUrl}/admin/catalog/model-images`);
  }

  uploadCatalogModelImage(modelId: number, file: File): Observable<{ imageName: string; updatedCars: number }> {
    const data = new FormData();
    data.append('image', file);
    return this.client.put<{ imageName: string; updatedCars: number }>(
      `${this.baseUrl}/admin/catalog/model-images/${modelId}`, data);
  }

  updateVehicleImage(id: number, file: File): Observable<{ imageName: string }> {
    const data = new FormData();
    data.append('image', file);
    return this.client.put<{ imageName: string }>(`${this.baseUrl}/car/${id}/image`, data);
  }

  deleteCar(id: number): Observable<void> {
    return this.client.delete<void>(`${this.baseUrl}/car/${id}`);
  }

getCarModels(): Observable<Result<CarModel[]>> {
  return this.client.get<Result<CarModel[]>>(`${this.baseUrl}/Model`);
}

createModel(dto: CreateCarModel): Observable<Result<void>> {
  return this.client.post<Result<void>>(`${this.baseUrl}/Model/CreateModel`, dto);
}

updateModel(dto: EditCarModel): Observable<Result<void>> {
  return this.client.post<Result<void>>(`${this.baseUrl}/Model/UpdateModel`, dto);
}

deleteModel(id: number): Observable<Result<void>> {
  return this.client.get<Result<void>>(`${this.baseUrl}/Model/DeleteModel/${id}`);
}









getCompanyies(): Observable<Result<Company[]>> {
  return this.client.get<Result<Company[]>>(`${this.baseUrl}/Company`);
}

createCompaany(dto: CreateCompany): Observable<Result<void>> {
  return this.client.post<Result<void>>(`${this.baseUrl}/Company/CreateCompany`, dto);
}

updateCompany(dto: EditCompany): Observable<Result<void>> {
  return this.client.post<Result<void>>(`${this.baseUrl}/Company/UpdateCompany`, dto);
}

deleteCompany(id: number): Observable<Result<void>> {
  return this.client.get<Result<void>>(`${this.baseUrl}/Company/DeleteCompany/${id}`);
}

getTipes(): Observable<Result<Tip[]>> {
  return this.client.get<Result<Tip[]>>(`${this.baseUrl}/Tip`);
}

createTip(dto: CreateTip): Observable<Result<void>> {
  return this.client.post<Result<void>>(`${this.baseUrl}/Tip/CreateTip`, dto);
}

updateTip(dto: EditTip): Observable<Result<void>> {
  return this.client.post<Result<void>>(`${this.baseUrl}/Tip/UpdateTip`, dto);
}

deleteTip(id: number): Observable<Result<void>> {
  return this.client.get<Result<void>>(`${this.baseUrl}/Tip/DeleteTip/${id}`);
}
createOrder(dto: CreateOrder): Observable<Result<string>> {
  return this.client.post<Result<string>>(`${this.baseUrl}/Order`, dto);
}
deleteOrder(id: number): Observable<Result<string>> {
  return this.client.delete<Result<string>>(`${this.baseUrl}/Order/${id}`);
}
getOrders() : Observable<Result<Order[]>>{
  return this.client.get<Result<Order[]>>(`${this.baseUrl}/Order`);
}
getOrderItems(orderId: number): Observable<Result<OrderItem[]>> {
  const params = new HttpParams().set('orderId', orderId);
  return this.client.get<Result<OrderItem[]>>(`${this.baseUrl}/OrderItem`, { params });
}
confirmOrderItem(orderItemId : number) : Observable<Result<string>>{
  const params = new HttpParams().set('orderItemId', orderItemId);
  return this.client.get<Result<string>>(`${this.baseUrl}/OrderItem/ConfirmOrderItem`,{params})
}
}
import { environment } from '../../../environments/environment';
