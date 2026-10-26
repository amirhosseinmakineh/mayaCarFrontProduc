import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, finalize, forkJoin, of, timer } from 'rxjs';
import {
  ImportResult,
  TelegramPreviewReport,
  TelegramObservation,
  DailyCarPrice,
  TelegramPricingState,
  TelegramCapability,
  TelegramChannel,
  TelegramChannelsService,
  TelegramJobLog,
  TelegramSummary,
} from '../../../services/telegram-channels.service';

@Component({
  selector: 'app-telegram-channels',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './telegram-channels.component.html',
  styleUrls: ['./telegram-channels.component.css'],
})
export class TelegramChannelsComponent implements OnInit {
  private readonly service = inject(TelegramChannelsService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  pricingState?: TelegramPricingState | null;
  observations: TelegramObservation[] = [];
  dailyPrices: DailyCarPrice[] = [];
  priceCarId: number | null = null;
  pricePage = 0;
  matchFilter = '';
  observationPage = 0;
  channels: TelegramChannel[] = [];
  capability?: TelegramCapability;
  jobs: TelegramJobLog[] = [];
  summary?: TelegramSummary;
  input = '';
  messageLimit = 500;
  previewing = false;
  previewReports: TelegramPreviewReport[] = [];
  result?: ImportResult;
  loading = false;
  submitting = false;
  error = '';
  success = '';
  actionBusy = false;
  channelPage = 0;
  channelSearch = '';
  pendingRemoval: number | null = null;
  optionalDataUnavailable = false;
  private authorizationFailed = false;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    timer(0, 5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());
  }

  refresh(): void {
    if (this.loading || this.authorizationFailed) {
      return;
    }

    this.loading = true;
    this.optionalDataUnavailable = false;
    forkJoin({
      channels: this.service.getAll(),
      summary: this.service.getSummary(),
      capability: this.service.getCapabilities(),
      jobs: this.service.getJobs(),
      observations: this.service
        .getObservations(this.matchFilter, this.observationPage)
        .pipe(
          catchError(() => {
            this.optionalDataUnavailable = true;
            return of([]);
          }),
        ),
      dailyPrices: this.service
        .getDailyPrices(this.priceCarId, this.pricePage)
        .pipe(
          catchError(() => {
            this.optionalDataUnavailable = true;
            return of([]);
          }),
        ),
      pricingState: this.service
        .getPricingState()
        .pipe(catchError(() => of(null))),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (data) => {
          this.error = '';
          this.channels = data.channels;
          this.summary = data.summary;
          this.capability = data.capability;
          this.jobs = data.jobs;
          this.observations = data.observations;
          this.dailyPrices = data.dailyPrices;
          this.pricingState = data.pricingState;
        },
        error: (error) => this.showError(error),
      });
  }

  asUtc(value?: string): string | null {
    if (!value) {
      return null;
    }
    return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  }

  filterPrices(): void {
    this.pricePage = 0;
    this.refresh();
  }

  changePricePage(offset: number): void {
    this.pricePage = Math.max(0, this.pricePage + offset);
    this.refresh();
  }

  filterObservations(): void {
    this.observationPage = 0;
    this.refresh();
  }

  changeObservationPage(offset: number): void {
    this.observationPage = Math.max(0, this.observationPage + offset);
    this.refresh();
  }

  importChannels(): void {
    if (this.submitting) {
      return;
    }

    const input = this.input.trim();
    if (!input) {
      this.error = 'شناسه یا لینک کانال را وارد کنید.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.result = undefined;
    this.service
      .import(input)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.submitting = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (result) => {
          this.result = result;
          this.input = '';
          this.refresh();
        },
        error: (error) => this.showError(error),
      });
  }

  previewChannels(channels?: string[], before: number | null = null): void {
    if (this.previewing) return;
    const entries =
      channels ??
      this.input
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((value) =>
          value.replace(/^https?:\/\/t\.me\//i, '').replace(/\/$/, ''),
        );
    if (
      !entries.length ||
      entries.length > 10 ||
      !Number.isInteger(this.messageLimit) ||
      this.messageLimit < 1 ||
      this.messageLimit > 500
    ) {
      this.error = 'یک تا ۱۰ شناسه کانال و تعداد پیام بین ۱ تا ۵۰۰ وارد کنید.';
      return;
    }
    this.previewing = true;
    this.error = '';
    this.service
      .preview(entries, this.messageLimit, before)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.previewing = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (reports) => {
          this.previewReports = reports;
        },
        error: (error) => this.showError(error),
      });
  }

  toggle(channel: TelegramChannel): void {
    this.performAction(
      this.service.setEnabled(channel.id, !channel.enabled),
      channel.enabled
        ? 'دریافت آگهی از این کانال متوقف شد.'
        : 'کانال فعال شد؛ دریافت آگهی به‌زودی آغاز می‌شود.',
    );
  }

  retry(channel: TelegramChannel): void {
    this.performAction(
      this.service.retry(channel.id),
      'درخواست دریافت دوباره ثبت شد؛ نتیجه در همین صفحه نمایش داده می‌شود.',
    );
  }

  test(channel: TelegramChannel): void {
    this.performAction(
      this.service.test(channel.id),
      'درخواست بررسی کانال ثبت شد؛ منتظر تغییر وضعیت کانال بمانید.',
    );
  }

  remove(channel: TelegramChannel): void {
    this.pendingRemoval = null;
    this.performAction(
      this.service.delete(channel.id),
      'کانال از فهرست حذف شد.',
    );
  }

  private performAction(request: Observable<void>, message: string): void {
    if (this.actionBusy) {
      return;
    }
    this.actionBusy = true;
    this.success = '';
    this.error = '';
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.actionBusy = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.success = message;
          this.refresh();
        },
        error: (error) => this.showError(error),
      });
  }

  private showError(error: HttpErrorResponse): void {
    if (error.status === 401 || error.status === 403) {
      this.authorizationFailed = true;
      this.error =
        error.status === 401
          ? 'ورود شما معتبر نیست؛ با حساب ادمین دوباره وارد شوید.'
          : 'این حساب دسترسی ادمین برای مدیریت کانال‌ها ندارد.';
      this.changeDetector.markForCheck();
      return;
    }

    this.error =
      error.status === 0
        ? 'ارتباط با سرور برقرار نشد. چند لحظه دیگر دوباره تلاش کنید.'
        : 'انجام این درخواست ممکن نشد. دوباره تلاش کنید؛ اگر مشکل ادامه داشت با پشتیبانی تماس بگیرید.';
    this.changeDetector.markForCheck();
  }

  get visibleChannels(): TelegramChannel[] {
    const search = this.channelSearch.trim().toLowerCase();
    return this.channels
      .filter(
        (channel) =>
          !search ||
          `${channel.title} ${channel.identifier} ${channel.username}`
            .toLowerCase()
            .includes(search),
      )
      .slice(this.channelPage * 10, (this.channelPage + 1) * 10);
  }

  get filteredChannelCount(): number {
    const search = this.channelSearch.trim().toLowerCase();
    return this.channels.filter(
      (channel) =>
        !search ||
        `${channel.title} ${channel.identifier} ${channel.username}`
          .toLowerCase()
          .includes(search),
    ).length;
  }

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      Active: 'دریافت فعال',
      Paused: 'متوقف‌شده',
      Pending: 'در انتظار بررسی',
      Queued: 'در صف بررسی',
      Processing: 'در حال بررسی',
      Succeeded: 'انجام‌شده',
      Failed: 'ناموفق',
      Error: 'نیازمند بررسی',
      AccessRequired: 'کانال در دسترس نیست',
      UnsupportedByCurrentCredentials: 'کانال قابل دریافت نیست',
      Matched: 'خودرو شناسایی شد',
      Unmatched: 'خودرو شناسایی نشد',
      Ambiguous: 'مشخصات خودرو مبهم است',
      Invalid: 'اطلاعات نامعتبر',
      Late: 'خارج از بازه محاسبه',
      CalculationError: 'محاسبه انجام نشد',
      Compared: 'مقایسه انجام شد',
      InsufficientComparisonData: 'منابع مقایسه کافی نیست',
      Rejected: 'قابل انتشار نیست',
      Published: 'منتشرشده',
      Extracted: 'اطلاعات استخراج شد',
      RequestedLimitReached: 'تعداد پیام درخواستی دریافت شد',
      PreviewExhausted: 'پایان پیام‌های در دسترس',
      PreviewUnavailable: 'پیام‌های کانال در دسترس نیست',
      Timeout: 'دریافت بیش از حد طول کشید',
      NetworkError: 'ارتباط برقرار نشد',
      HttpError: 'دریافت پیام ممکن نشد',
      PageLimitReached: 'پایان محدوده بررسی',
      NoProgress: 'پیام قدیمی‌تری دریافت نشد',
      InvalidInput: 'شناسه کانال را اصلاح کنید',
    };
    return status
      ? labels[status] || 'نیازمند بررسی پشتیبانی'
      : 'هنوز بررسی نشده';
  }

  channelHelp(channel: TelegramChannel): string {
    if (!channel.enabled) {
      return 'دریافت متوقف است. برای ادامه، «فعال‌کردن دریافت» را بزنید.';
    }
    if (channel.status === 'Active') {
      return 'کانال قابل دسترس است. دریافت پیام به معنی تأیید یا انتشار همه آگهی‌ها نیست.';
    }
    if (channel.status === 'Pending' || channel.status === 'Processing') {
      return 'درخواست ثبت شده است؛ منتظر بمانید. وضعیت خودکار به‌روز می‌شود.';
    }
    return 'عمومی بودن کانال و درست بودن شناسه را بررسی کنید، سپس «دریافت دوباره» را بزنید.';
  }
}
