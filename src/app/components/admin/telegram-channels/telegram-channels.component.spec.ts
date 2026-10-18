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

  function completeRefresh(): void {
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
    expect(fixture.nativeElement.textContent).toContain('1 ایجاد شد');
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
    ).toContain('Import failed');
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
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'https://t.me/telegram',
    );
    expect(fixture.nativeElement.textContent).toContain('Active');
    fixture.destroy();
  }));
});
