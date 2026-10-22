import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../services/auth/auth-service';

describe('Header authentication controls', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.removeItem('token');
    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
      ],
    });
    fixture = TestBed.createComponent(HeaderComponent);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.removeItem('token');
  });

  it('renders login and register links for an expired session', () => {
    auth.setToken(
      `header.${btoa(JSON.stringify({ exp: 1, role: 'Admin' }))}.signature`,
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[routerLink="/login"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[routerLink="/register"]'),
    ).not.toBeNull();
  });

  it('renders account and logout for a valid login', () => {
    auth.setToken(
      `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 600, role: 'Admin' }))}.signature`,
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('a[href="/adminDashboard"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('خروج');
    expect(
      fixture.nativeElement.querySelector('[routerLink="/login"]'),
    ).toBeNull();
  });
});
