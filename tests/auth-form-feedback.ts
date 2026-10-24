import '@angular/compiler';
import assert from 'node:assert/strict';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, throwError } from 'rxjs';
import { LoginComponent } from '../src/app/components/login/login.component';
import { RegisterComponent } from '../src/app/components/register/register.component';
import { AuthService } from '../src/app/services/auth/auth-service';
import { authErrorMessage, normalizeMobile } from '../src/app/services/auth/auth-form';

let navigation: unknown[] = [];
let calls = 0;
let result: any = of({ isSuccess: false, message: 'شماره یا رمز اشتباه است' });
const api = {
  loginUser: () => { calls++; return result; },
  registerUser: () => { calls++; return result; },
  setToken: () => {}, getToken: () => 'test-token', hasRole: () => false,
};
const injector = createEnvironmentInjector([
  { provide: AuthService, useValue: api },
  { provide: ToastrService, useValue: { success: () => {} } },
  { provide: Router, useValue: { navigate: (url: unknown) => navigation.push(url) } },
  { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
], null as any);
const login = runInInjectionContext(injector, () => new LoginComponent());
login.onLogin();
assert.ok(login.errorMessage()); assert.equal(calls, 0);
login.dto = { mobileNumber: '۰۹۱۲۳۴۵۶۷۸۹', password: 'legacy' };
login.onLogin();
assert.equal(calls, 1); assert.equal(login.dto.mobileNumber, '09123456789');
assert.equal(login.errorMessage(), 'شماره یا رمز اشتباه است');
assert.equal(navigation.length, 0);
const pending = new Subject(); result = pending;
login.onLogin(); login.onLogin();
assert.equal(calls, 2); assert.equal(login.isSubmitting(), true);
pending.error({ status: 0 });
assert.equal(login.isSubmitting(), false); assert.match(login.errorMessage(), /اتصال/);
result = of({ isSuccess: true, data: { token: 'test-token' } });
login.onLogin(); assert.deepEqual(navigation.pop(), ['/userPannel']);
const register = runInInjectionContext(injector, () => new RegisterComponent());
register.dto = { name: 'Test', family: 'Probe', mobileNumber: '09123456789', password: 'Example!123', rePassword: 'Example!123' };
result = of({ isSuccess: false, message: 'شماره تکراری' });
register.registerUser(); assert.equal(register.errorMessage(), 'شماره تکراری'); assert.equal(navigation.length, 0);
result = throwError(() => ({ error: { errors: { Name: ['نام الزامی است'] } } }));
register.registerUser(); assert.equal(register.errorMessage(), 'نام الزامی است'); assert.equal(register.isSubmitting(), false);
result = of({ isSuccess: true });
register.registerUser(); assert.deepEqual(navigation.pop(), ['/login']);
assert.match(authErrorMessage({ name: 'TimeoutError' }), /طول کشید/);
assert.equal(normalizeMobile('٠٩١٢٣٤٥٦٧٨٩'), '09123456789');
injector.destroy();
console.log('PASS: validation, legacy login, Persian digits, API failure, duplicate registration, pending guard, network errors, timeout, successful navigation');
