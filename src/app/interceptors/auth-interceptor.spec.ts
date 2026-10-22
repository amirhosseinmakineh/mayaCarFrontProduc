import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  HttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth/auth-service';
import { environment } from '../../environments/environment';
import { authInterceptor } from './auth-interceptor';

describe('authInterceptor HTTP behavior', () => {
  let auth: AuthService;
  let http: HttpClient;
  let requests: HttpTestingController;
  let token: string;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    localStorage.removeItem('token');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    token = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 600, role: 'Admin' }))}.signature`;
    auth.setToken(token);
  });

  afterEach(() => {
    requests.verify();
    localStorage.removeItem('token');
  });

  it('attaches Bearer to the protected Telegram endpoint', () => {
    const url = `${environment.apiUrl}/admin/telegram-channels/capabilities`;
    http.get(url).subscribe();
    const request = requests.expectOne(url);
    expect(request.request.headers.get('Authorization')).toBe(
      `Bearer ${token}`,
    );
    request.flush({});
  });

  it('clears a rejected session and requests login on 401', () => {
    const url = `${environment.apiUrl}/admin/telegram-channels/capabilities`;
    http.get(url).subscribe({ error: () => undefined });
    requests
      .expectOne(url)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.getToken()).toBeNull();
    expect(navigate).toHaveBeenCalled();
  });

  it('preserves the session on 403 and never sends its token to another origin', () => {
    const url = `${environment.apiUrl}/admin/telegram-channels`;
    http.get(url).subscribe({ error: () => undefined });
    requests.expectOne(url).flush({}, { status: 403, statusText: 'Forbidden' });
    expect(auth.getToken()).toBe(token);
    expect(navigate).not.toHaveBeenCalled();
    http.get('https://external.example/data').subscribe();
    const request = requests.expectOne('https://external.example/data');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });

  it('does not clear a newer login when an old request returns 401', () => {
    const url = `${environment.apiUrl}/admin/telegram-channels`;
    http.get(url).subscribe({ error: () => undefined });
    const request = requests.expectOne(url);
    const newer = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 1200, role: 'Admin' }))}.signature`;
    auth.setToken(newer);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.getToken()).toBe(newer);
    expect(navigate).not.toHaveBeenCalled();
  });
});
