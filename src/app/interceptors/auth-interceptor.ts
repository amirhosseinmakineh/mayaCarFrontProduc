import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth/auth-service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const baseUrl = environment.apiUrl.replace(/\/$/, '');
  const isApiRequest =
    request.url === baseUrl || request.url.startsWith(`${baseUrl}/`);
  const token = isApiRequest ? auth.getToken() : null;
  const authenticatedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        isApiRequest &&
        error.status === 401 &&
        token &&
        auth.clearRejectedToken(token)
      ) {
        void router.navigate(['/login'], {
          queryParams: { returnUrl: router.url, reason: 'session-expired' },
        });
      }

      return throwError(() => error);
    }),
  );
};
