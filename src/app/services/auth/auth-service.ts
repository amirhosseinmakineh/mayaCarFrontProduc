import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { LoginDto } from "../../models/user/loginDto";
import { RegisterDto } from "../../models/user/registerDto";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = 'https://mayakhoddrobackend-mayacar.runflare.run/api';
  //private readonly baseUrl = 'http://localhost:8080/api';
  private TOKEN_KEY = 'token';
  private http = inject(HttpClient);

  public registerUser(dto: RegisterDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/user`, dto);
  }
  public loginUser(dto : LoginDto){
    return this.http.post(`${this.baseUrl}/user/login`,dto);
  }

setToken(token: string): void {

  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('token', token);
  }
}

getToken(): string | null {

  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('token');
  }

  return null;
}
logout(): void {

  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('token');
  }
}
}




