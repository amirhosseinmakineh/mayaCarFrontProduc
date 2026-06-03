import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { Car } from "../../models/car/car";
import { CreateCar } from "../../models/car/createCar";
import { UpdateCar } from "../../models/car/updateCar";
import { CarModel } from "../../models/carModel/carmodel";
import { Category } from "../../models/category/category";
import { Company } from "../../models/company/companyName";
import { Role } from "../../models/role/role";
import { Tip } from "../../models/tip/tip";
import { CreateUser } from "../../models/user/createUser";
import { UpdateUser } from "../../models/user/updateUser";
import { User } from "../../models/user/user";
import { CreateCarModel } from "../../models/carModel/createCarModel";
import { EditCarModel } from "../../models/carModel/editCarModel";
import { CreateCategory } from "../../models/category/createCategory";
import { EditCategory } from "../../models/category/editCategory";
import { CreateCompany } from "../../models/company/createCompany";
import { EditCompany } from "../../models/company/editCompany";
import { CreateTip } from "../../models/tip/createTip";
import { EditTip } from "../../models/tip/editTip";
import { Result } from "../../models/result";
import { CreateOrder, Order } from '../../models/order/order';
import { OrderItem } from "../../models/orderItem/orderItem";

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly baseUrl = 'https://mayakhoddrobackend-mayacar.runflare.run/api';
  //private readonly baseUrl = 'http://localhost:8080/api';
  private client = inject(HttpClient);

  constructor() { }

  getUsers(): Observable<User[]> {
    return this.client.get<User[]>(`${this.baseUrl}/User/GetUsers`);
  }

  createUser(dto: CreateUser): Observable<void> {
    return this.client.post<void>(`${this.baseUrl}/user/createUser`, dto);
  }

  updateUser(dto: UpdateUser): Observable<void> {
    return this.client.post<void>(`${this.baseUrl}/user/UpdateUser`, dto);
  }

  deleteUser(id: string): Observable<void> {
    return this.client.get<void>(`${this.baseUrl}/user/DeleteUser/${id}`);
  }

  getAllRoles(): Observable<Role[]> {
    return this.client.get<Role[]>(`${this.baseUrl}/role`);
  }

  getCars(): Observable<Car[]> {
    return this.client.get<Car[]>(`${this.baseUrl}/car`);
  }

  // ✔ باز کردن امضا برای قبول کردن FormData
  createCar(dto: CreateCar | FormData): Observable<void> {
    return this.client.post<void>(`${this.baseUrl}/car`, dto);
  }

  // ✔ باز کردن امضا برای قبول کردن FormData
  updateCar(dto: UpdateCar | FormData): Observable<void> {
    return this.client.patch<void>(`${this.baseUrl}/car`, dto);
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



getCategories(): Observable<Result<Category[]>> {
  return this.client.get<Result<Category[]>>(`${this.baseUrl}/Category`);
}

createCategory(dto: CreateCategory): Observable<Result<void>> {
  return this.client.post<Result<void>>(`${this.baseUrl}/Category/CreateCategory`, dto);
}

updateCategory(dto: EditCategory): Observable<Result<void>> {
  return this.client.post<Result<void>>(`${this.baseUrl}/Category/UpdateCategory`, dto);
}

deleteCategory(id: number): Observable<Result<void>> {
  return this.client.get<Result<void>>(`${this.baseUrl}/Category/DeleteCategory/${id}`);
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
