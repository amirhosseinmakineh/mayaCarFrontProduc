import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AuthService } from './auth-service';
import { environment } from '../../../environments/environment';

function tokenWith(claims: object): string {
  return `header.${btoa(JSON.stringify(claims))}.signature`;
}

describe('AuthService session validity', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.removeItem('token');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.removeItem('token');
    TestBed.inject(HttpTestingController).verify();
  });

  it('rejects expired and malformed tokens', () => {
    service.setToken(tokenWith({ exp: Date.now() / 1000 - 10, role: 'Admin' }));
    expect(service.getToken()).toBeNull();
    expect(service.hasRole('Admin')).toBeFalse();
    service.setToken('not-a-jwt');
    expect(service.getToken()).toBeNull();
  });

  it('accepts valid lifetime and multiple roles', () => {
    const token = tokenWith({
      exp: Date.now() / 1000 + 600,
      role: ['Customer', 'Admin'],
    });
    service.setToken(token);
    expect(service.getToken()).toBe(token);
    expect(service.hasRole('Admin')).toBeTrue();
    service.logout();
    expect(service.getToken()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('rejects future nbf and missing expiry', () => {
    service.setToken(
      tokenWith({ exp: Date.now() / 1000 + 600, nbf: Date.now() / 1000 + 300 }),
    );
    expect(service.getToken()).toBeNull();
    service.setToken(tokenWith({ role: 'Admin' }));
    expect(service.getToken()).toBeNull();
  });

  it('uses the configured API for login', () => {
    service
      .loginUser({ mobileNumber: '09123456789', password: 'example' })
      .subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.apiUrl}/user/login`,
    );
    expect(request.request.method).toBe('POST');
    request.flush({});
  });
});
