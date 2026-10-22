import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth-service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  menuOpen = false;
  showHeader = this.isPublicRoute(this.router.url);

  get isLogin(): boolean {
    return this.authService.getToken() !== null;
  }

  get fullName(): string {
    const claims = this.authService.getClaims();
    return `${claims?.firstName ?? ''} ${claims?.lastName ?? ''}`.trim();
  }

  get accountUrl(): string {
    return this.authService.hasRole('Admin')
      ? '/adminDashboard'
      : '/userPannel';
  }

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.showHeader = this.isPublicRoute(event.urlAfterRedirects);
        this.menuOpen = false;
        this.changeDetector.markForCheck();
      });
  }

  logout(): void {
    this.authService.logout();
    this.menuOpen = false;
    void this.router.navigate(['/']);
  }

  private isPublicRoute(url: string): boolean {
    return (
      !url.includes('userPannel') &&
      !url.includes('adminDashboard') &&
      !url.includes('admin/dashboard')
    );
  }
}
