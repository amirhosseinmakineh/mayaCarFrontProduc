import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { TelegramChannelsComponent } from './telegram-channels.component';
import { TelegramChannel, TelegramObservation } from '../../../services/telegram-channels.service';

describe('Telegram channel management', () => {
  const baseUrl = `${environment.apiUrl}/admin/telegram-channels`;
  let fixture: ComponentFixture<TelegramChannelsComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TelegramChannelsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(TelegramChannelsComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify({ ignoreCancelled: true });
  });

  const observation = (changes: Partial<TelegramObservation> = {}): TelegramObservation => ({
    id: 1, sourceChannel: 'example', sourceMessageId: '1',
    matchStatus: 'NeedsReview', processingStatus: 'NeedsReview', extractionVersion: 2,
    ...changes,
  });

  it('explains missing prices instead of reporting a support failure', () => {
    const component = fixture.componentInstance;
    expect(component.statusLabel('NeedsReview')).toBe('اطلاعات آگهی کامل نیست');
    expect(component.observationReason(observation({reasonCode: 'PRICE_MISSING'}))).toContain('قیمت روشنی');
    expect(component.priceUnavailableLabel(observation())).toBe('قیمتی استخراج نشده است');
  });

  it('distinguishes missing currency and does not require five comparison channels', () => {
    const component = fixture.componentInstance;
    expect(component.priceUnavailableLabel(observation({price: 850}))).toContain('واحد پول');
    const waiting = observation({reasonCode: 'INSUFFICIENT_INDEPENDENT_CHANNELS', comparedChannelCount: 2});
    expect(component.observationReason(waiting)).toContain('حداقل پنج کانال لازم نیست');
    expect(component.observationReason(observation({processingStatus: 'Published', validPriceSourceCount: 12})))
      .toContain('12 کانال');
    expect(component.statusLabel('Superseded')).toContain('جایگزین');
  });

  it('labels legacy rows as queued for automatic reprocessing', () => {
    expect(fixture.componentInstance.observationReason(observation({extractionVersion: 0})))
      .toContain('پردازش دوباره خودکار');
  });

  it('shows the database capacity error returned by channel deletion', () => {
    const component = fixture.componentInstance;
    component.remove({ id: 42 } as TelegramChannel);
    const request = http.expectOne(`${baseUrl}/42`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ message: 'لاگ تراکنش دیتابیس پر است و حذف کانال ذخیره نشد.' },
      { status: 507, statusText: 'Insufficient Storage' });
    expect(component.error).toContain('لاگ تراکنش دیتابیس پر است');
  });

  it('removes a deleted channel from the list immediately', () => {
    const component = fixture.componentInstance;
    component.loading = true;
    component.channels = [{ id: 42 }, { id: 43 }] as TelegramChannel[];

    component.remove(component.channels[0]);
    http.expectOne(`${baseUrl}/42`).flush(null, { status: 204, statusText: 'No Content' });

    expect(component.channels.map((channel) => channel.id)).toEqual([43]);
    expect(component.success).toContain('حذف شد');
    expect(component.error).toBe('');
  });

  it('treats another deletion of an already removed channel as complete', () => {
    const component = fixture.componentInstance;
    component.loading = true;
    component.channels = [{ id: 42 }] as TelegramChannel[];

    component.remove(component.channels[0]);
    http.expectOne(`${baseUrl}/42`).flush(null, { status: 404, statusText: 'Not Found' });

    expect(component.channels).toEqual([]);
    expect(component.success).toContain('حذف شد');
    expect(component.error).toBe('');
  });

  function completeRefresh(pricingUnavailable = false): void {
    http.expectOne(baseUrl).flush([]);
    http.expectOne(`${baseUrl}/summary`).flush({
      totalChannels: 0,
      active: 0,
      paused: 0,
      errors: 0,
      pending: 0,
      processing: 0,
      messagesCollected: 0,
      listingsExtracted: 0,
    });
    http.expectOne(`${baseUrl}/capabilities`).flush({
      provider: 'web-preview',
      message: 'Public preview',
    });
    http.expectOne(`${baseUrl}/jobs`).flush([]);
    const observations = http.expectOne((request) =>
      request.url.endsWith('/telegram-pricing/observations'),
    );
    if (pricingUnavailable) {
      observations.flush({}, { status: 404, statusText: 'Not Found' });
    } else {
      observations.flush([]);
    }
    http
      .expectOne((request) => request.url.endsWith('/telegram-pricing/prices'))
      .flush([]);
    http
      .expectOne(`${environment.apiUrl}/admin/telegram-pricing/state`)
      .flush(null);
  }

  it('submits textarea through the service with the complete API path', fakeAsync(() => {
    fixture.detectChanges();
    tick(0);
    completeRefresh();
    fixture.detectChanges();
    const textarea: HTMLTextAreaElement =
      fixture.nativeElement.querySelector('textarea');
    textarea.value = '@telegram';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[type="submit"]').click();

    const request = http.expectOne(`${baseUrl}/import`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ input: '@telegram' });
    expect(fixture.componentInstance.submitting).toBeTrue();
    request.flush({
      total: 1,
      created: 1,
      duplicates: 0,
      invalid: 0,
      queued: 1,
      invalidEntries: [],
    });
    completeRefresh();
    fixture.detectChanges();
    expect(fixture.componentInstance.submitting).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('1 کانال اضافه شد');
    fixture.destroy();
  }));

  it('releases loading after failed refresh and permits import', fakeAsync(() => {
    fixture.detectChanges();
    tick(0);
    http.expectOne(baseUrl).flush(
      { message: 'Channel API unavailable' },
      {
        status: 404,
        statusText: 'Not Found',
      },
    );
    expect(fixture.componentInstance.loading).toBeFalse();
    fixture.componentInstance.input = '@telegram';
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    );
    expect(button.disabled).toBeFalse();
    button.click();
    http.expectOne(`${baseUrl}/import`).flush(
      { detail: 'Import failed' },
      {
        status: 500,
        statusText: 'Server Error',
      },
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.submitting).toBeFalse();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('دوباره تلاش کنید');
    fixture.destroy();
  }));

  it('rejects blank input and hydrates the channel table from the API', fakeAsync(() => {
    fixture.detectChanges();
    tick(0);
    completeRefresh();
    fixture.componentInstance.importChannels();
    http.expectNone(`${baseUrl}/import`);
    fixture.componentInstance.refresh();
    http.expectOne(baseUrl).flush([
      {
        id: 1,
        identifier: 'telegram',
        publicUrl: 'https://t.me/telegram',
        status: 'Active',
        enabled: true,
        messagesCollected: 12,
        listingsExtracted: 2,
      },
    ]);
    http.expectOne(`${baseUrl}/summary`).flush({});
    http.expectOne(`${baseUrl}/capabilities`).flush({});
    http.expectOne(`${baseUrl}/jobs`).flush([]);
    http
      .expectOne((request) =>
        request.url.endsWith('/telegram-pricing/observations'),
      )
      .flush([]);
    http
      .expectOne((request) => request.url.endsWith('/telegram-pricing/prices'))
      .flush([]);
    http
      .expectOne(`${environment.apiUrl}/admin/telegram-pricing/state`)
      .flush(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'https://t.me/telegram',
    );
    expect(fixture.nativeElement.textContent).toContain('دریافت فعال');
    fixture.destroy();
  }));
  it('keeps channel management usable when pricing details are unavailable', fakeAsync(() => {
    fixture.detectChanges();
    tick(0);
    completeRefresh(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading).toBeFalse();
    expect(fixture.componentInstance.optionalDataUnavailable).toBeTrue();
    expect(fixture.componentInstance.error).toBe('');
    expect(fixture.nativeElement.textContent).toContain(
      'هنوز کانالی اضافه نشده است',
    );
    fixture.destroy();
  }));

  it('uses clear Persian labels and hides unknown technical status values', () => {
    expect(fixture.componentInstance.statusLabel('Active')).toBe('دریافت فعال');
    expect(fixture.componentInstance.statusLabel('AccessRequired')).toBe(
      'کانال در دسترس نیست',
    );
    expect(
      fixture.componentInstance.statusLabel('UnrecognizedInternalState'),
    ).toBe('نیازمند بررسی پشتیبانی');
  });
});
