import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CarService } from './car.service';

describe('CarService public catalog transport', () => {
  const directUrl = 'https://api.mayakhodro.com/api/car/references';
  const proxyUrl = environment.apiUrl + '/car/references';
  const originalApiUrl = environment.publicCatalogApiUrl;
  let service: CarService;
  let http: HttpTestingController;

  beforeEach(() => {
    environment.publicCatalogApiUrl = 'https://api.mayakhodro.com/api';
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CarService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.publicCatalogApiUrl = originalApiUrl;
    http.verify();
  });

  it('loads public references directly and preserves pagination and filters', () => {
    service.getAllCarsWithFilter({ company: 'سایپا', pageSize: 10, pageNumber: 2 }).subscribe();
    const direct = http.expectOne(request => request.url === directUrl);
    expect(direct.request.params.get('company')).toBe('سایپا');
    expect(direct.request.params.get('pageNumber')).toBe('2');
    expect(direct.request.params.get('pageSize')).toBe('10');
    direct.flush({ items: [] });
    http.expectNone(request => request.url === proxyUrl);
  });

  it('uses the proxy if the direct request cannot connect', () => {
    service.getAllCarsWithFilter({ pageNumber: 1 }).subscribe();
    http.expectOne(request => request.url === directUrl).error(new ProgressEvent('error'));
    const proxy = http.expectOne(request => request.url === proxyUrl);
    expect(proxy.request.params.get('pageNumber')).toBe('1');
    proxy.flush({ items: [] });
  });

  it('cancels a stalled direct request before falling back', fakeAsync(() => {
    service.getAllCarsWithFilter({ pageNumber: 0 }).subscribe();
    const direct = http.expectOne(request => request.url === directUrl);
    tick(6_000);
    expect(direct.cancelled).toBeTrue();
    http.expectOne(request => request.url === proxyUrl).flush({ items: [] });
  }));
});
