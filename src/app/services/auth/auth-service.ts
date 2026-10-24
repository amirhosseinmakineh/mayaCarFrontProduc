import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginDto } from '../../models/user/loginDto';
import { RegisterDto } from '../../models/user/registerDto';

export interface AuthResponse<T> {
  isSuccess: boolean;
  message?: string;
  data?: T;
}

interface SessionClaims {
  exp: number;
  nbf?: number;
  role?: string | string[];
  firstName?: string;
  lastName?: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?:
    string | string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment.apiUrl;
  private readonly tokenKey = 'token';
  private readonly http = inject(HttpClient);
  private readonly tokenState = signal(this.readStoredToken());

  registerUser(dto: RegisterDto): Observable<AuthResponse<unknown>> {
    return this.http.post<AuthResponse<unknown>>(`${this.baseUrl}/user`, {
      ...dto, emaail: dto.email,
    }).pipe(timeout(20000));
  }

  loginUser(dto: LoginDto): Observable<AuthResponse<{ token?: string }>> {
    return this.http.post<AuthResponse<{ token?: string }>>(`${this.baseUrl}/user/login`, dto).pipe(timeout(20000));
  }

  setToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
    }

    this.tokenState.set(token);
  }

  getToken(): string | null {
    const token = this.tokenState();
    return token && this.parseClaims(token) ? token : null;
  }

  getClaims(): SessionClaims | null {
    const token = this.tokenState();
    return token ? this.parseClaims(token) : null;
  }

  hasRole(role: string): boolean {
    const claims = this.getClaims();
    const roles =
      claims?.role ??
      claims?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    return Array.isArray(roles) ? roles.includes(role) : roles === role;
  }

  clearRejectedToken(token: string): boolean {
    if (this.tokenState() !== token) {
      return false;
    }

    this.logout();
    return true;
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
    }

    this.tokenState.set(null);
  }

  private readStoredToken(): string | null {
    return typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem(this.tokenKey);
  }

  private parseClaims(token: string): SessionClaims | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(base64), (character) =>
        character.charCodeAt(0),
      );
      const claims = JSON.parse(
        new TextDecoder().decode(bytes),
      ) as SessionClaims;
      const now = Date.now() / 1000;
      if (!Number.isFinite(claims.exp) || claims.exp <= now) {
        return null;
      }

      if (
        claims.nbf !== undefined &&
        (!Number.isFinite(claims.nbf) || claims.nbf > now)
      ) {
        return null;
      }

      // The API remains responsible for signature, issuer, audience and role validation.
      return claims;
    } catch {
      return null;
    }
  }
}
