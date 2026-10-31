import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ZeroVehiclesComponent } from './zero-vehicles.component';
import { ZeroImport } from '../../../services/zero-vehicles.service';
import { environment } from '../../../../environments/environment';

describe('Independent zero vehicle admin', () => {
  const base = `${environment.apiUrl}/admin/zero-vehicles`;
  const run: ZeroImport = { id: 1, channel: 'zero_channel', status: 'Queued', messageLimit: 50, before: null, nextBefore: null, pagesFetched: 0, stopReason: '', createdAt: '2026-10-31T10:00:00Z', completedAt: null, scanned: 0, accepted: 0, rejected: 0, duplicates: 0, stored: 0, priceGroups: 0, rejectionCounts: '{}', error: null };
  beforeEach(() => TestBed.configureTestingModule({ imports: [ZeroVehiclesComponent], providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), { provide: PLATFORM_ID, useValue: 'server' }] }));
  it('polls a queued import and renders persisted result counts', fakeAsync(() => {
    const fixture = TestBed.createComponent(ZeroVehiclesComponent);
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); component.channel = '@zero_channel'; component.messageLimit = 50; component.start();
    const post = http.expectOne(base + '/imports'); expect(post.request.body.messageLimit).toBe(50); post.flush(run);
    http.expectOne(r => r.url === base + '/imports').flush({ items: [run], total: 1, page: 0, pageSize: 10 });
    tick(0);
    http.expectOne(base + '/imports/1').flush({ ...run, status: 'Completed', scanned: 20, accepted: 4, rejected: 15, duplicates: 1, stored: 3, priceGroups: 2, nextBefore: 10 });
    http.expectOne(r => r.url === base + '/listings').flush({ items: [], total: 3, page: 0, pageSize: 10 });
    http.expectOne(r => r.url === base + '/prices').flush({ items: [], total: 2, page: 0, pageSize: 10 });
    http.expectOne(base + '/catalog').flush([]);
    http.expectOne(r => r.url === base + '/imports').flush({ items: [], total: 1, page: 0, pageSize: 10 });
    fixture.detectChanges();
    expect(component.active).toBeFalse(); expect(component.run?.stored).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('دریافت کامل شد');
    expect(fixture.nativeElement.textContent).toContain('بررسی پیام‌های قدیمی‌تر همین کانال');
    fixture.destroy(); http.verify({ ignoreCancelled: true });
  }));
  it('requests server pages and resets pagination when the model changes', () => {
    const fixture = TestBed.createComponent(ZeroVehiclesComponent);
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    component.filters.modelId = 7; component.listingPage(1);
    const next = http.expectOne(r => r.url === base + '/listings' && r.params.get('page') === '1' && r.params.get('modelId') === '7');
    next.flush({ items: [], total: 12, page: 1, pageSize: 10 });
    component.filters.trimId = 9; component.modelChanged();
    http.expectOne(r => r.url === base + '/listings' && r.params.get('page') === '0' && !r.params.has('trimId')).flush({ items: [], total: 0, page: 0, pageSize: 10 });
    expect(component.filters.trimId).toBeNull();
    fixture.destroy(); http.verify();
  });
});
