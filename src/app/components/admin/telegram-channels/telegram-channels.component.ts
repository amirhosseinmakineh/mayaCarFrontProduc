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
  TelegramJobTimeline,
  TelegramTimelineStage,
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
  selectedJobId: number | null = null;
  timeline?: TelegramJobTimeline;
  timelineUnavailable = false;
  pendingClearCount: number | null = null;
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
      timeline: this.selectedJobId === null ? of(null) : this.service.getTimeline(this.selectedJobId).pipe(
        catchError(() => {
          this.timelineUnavailable = true;
          return of(null);
        }),
      ),
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
          this.channels = data.channels;
          this.summary = data.summary;
          this.capability = data.capability;
          this.jobs = data.jobs;
          if (this.selectedJobId === null && this.jobs.length > 0) {
            this.selectJob(this.jobs[0].id);
          } else if (data.timeline) {
            this.timeline = data.timeline;
            this.timelineUnavailable = false;
          }
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

  selectJob(jobId: number): void {
    this.selectedJobId = jobId;
    this.timeline = undefined;
    this.timelineUnavailable = false;
    this.service.getTimeline(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (timeline) => {
          if (this.selectedJobId === jobId) {
            this.timeline = timeline;
            this.changeDetector.markForCheck();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.timelineUnavailable = true;
          this.showError(error);
        },
      });
  }

  timelineLabel(stage: TelegramTimelineStage): string {
    const labels: Record<string, string> = {
      Queued: 'ثبت درخواست',
      Collection: 'دریافت از کانال',
      Received: 'ذخیره پیام خام',
      Parsed: 'استخراج آگهی',
      Validated: 'اعتبارسنجی',
      Stored: 'ثبت آگهی سالم و قیمت',
    };
    return labels[stage.code] ?? stage.code;
  }

  timelineStatus(stage: TelegramTimelineStage): string {
    const labels: Record<TelegramTimelineStage['status'], string> = {
      Waiting: 'در انتظار',
      InProgress: 'در حال انجام',
      Completed: 'انجام شد',
      NoData: 'داده‌ای برای این مرحله نبود',
      Failed: 'ناموفق',
    };
    return labels[stage.status];
  }

  clearListings(): void {
    const expectedCount = this.pendingClearCount;
    if (expectedCount === null || this.actionBusy) {
      return;
    }
    this.actionBusy = true;
    this.success = '';
    this.error = '';
    this.service.clearListings(expectedCount)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.actionBusy = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (result) => {
          this.pendingClearCount = null;
          this.observations = [];
          this.success = `${result.clearedCount} آگهی از نمایش حذف شد. پیام‌های خام و سابقه قیمت نگهداری شدند.`;
          this.refresh();
        },
        error: (error: HttpErrorResponse) => {
          this.pendingClearCount = null;
          this.showError(error);
          this.refresh();
        },
      });
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

    if (error.status === 409) {
      this.error = error.error?.message || 'فهرست در حال تغییر است؛ دوباره تلاش کنید.';
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
      NeedsReview: 'اطلاعات آگهی کامل نیست',
      Ignored: 'پیام غیرآگهی یا خودرو شناسایی نشده',
      Stored: 'ذخیره‌شده',
      WaitingForComparableChannels: 'در نوبت محاسبه میانگین',
      Unmatched: 'خودرو شناسایی نشد',
      Ambiguous: 'مشخصات خودرو مبهم است',
      Invalid: 'اطلاعات نامعتبر',
      Late: 'خارج از بازه محاسبه',
      CalculationError: 'محاسبه انجام نشد',
      Compared: 'در میانگین روزانه محاسبه شد',
      Superseded: 'قیمت جدیدتر همین کانال جایگزین شد',
      Excluded: 'از میانگین کنار گذاشته شد',
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
      ? labels[status] || 'وضعیت هنوز شناسایی نشده'
      : 'هنوز بررسی نشده';
  }

  observationReason(observation: TelegramObservation): string {
    if ((observation.extractionVersion ?? 0) < 2) {
      return 'این رکورد قدیمی در نوبت پردازش دوباره خودکار است.';
    }
    const reasons: Record<string, string> = {
      PRICE_MISSING: 'در متن پیام قیمت روشنی پیدا نشد؛ تماس با فروشنده جای قیمت را نمی‌گیرد.',
      PRICE_MISSING_OR_INVALID: 'قیمت قابل استفاده استخراج نشد.',
      PRICE_INVALID_OR_AMBIGUOUS: 'قیمت صفر، نامعتبر یا دارای چند مقدار مبهم است.',
      PRICE_UNIT_MISSING_OR_AMBIGUOUS: 'مبلغ یا واحد قیمت روشن نیست.',
      INVALID_PRICE_OR_CURRENCY: 'قیمت یا واحد پول روشن و قابل استفاده نیست.',
      CURRENCY_MISSING: 'عدد قیمت وجود دارد، اما تومان یا ریال بودن آن مشخص نیست.',
      CONDITION_UNCLEAR: 'قیمت مشخص است، اما صفر یا کارکرده بودن خودرو روشن نیست.',
      IDENTITY_INCOMPLETE: 'شرکت، مدل، تیپ یا سال خودرو کامل مشخص نیست.',
      MANUFACTURER_MISSING: 'شرکت سازنده شناسایی نشده است.',
      MODEL_MISSING: 'مدل خودرو شناسایی نشده است.',
      TRIM_MISSING: 'تیپ خودرو مشخص نیست؛ ممکن است با تیپ دیگری اشتباه شود.',
      YEAR_MISSING: 'سال ساخت معتبر در پیام مشخص نیست.',
      NEWER_CHANNEL_SAMPLE: 'از این کانال آگهی معتبر جدیدتری وجود دارد؛ هر کانال فقط یک سهم در میانگین دارد.',
      DUPLICATE_AD: 'همین آگهی قبلاً دریافت شده است و دوباره وارد میانگین نمی‌شود.',
      MISSING_VERIFIABLE_IMAGE: 'تصویر اصلی آگهی در دسترس نیست.',
      MISSING_MILEAGE: 'کارکرد خودرو برای مقایسه مشخص نشده است.',
      MISSING_SOURCE_LINK: 'لینک پیام اصلی در دسترس نیست.',
      COMPARISON_FIELDS_INCOMPLETE: 'اطلاعات لازم برای مقایسه کامل نیست.',
      DAILY_CALCULATION_FAILED: 'محاسبه قیمت روزانه انجام نشد؛ آگهی منتشر نشده است.',
      PUBLICATION_DATE_INVALID: 'تاریخ انتشار پیام معتبر نیست.',
      OUTSIDE_PRICE_WINDOW: 'پیام قدیمی است و در محاسبه قیمت روز وارد نمی‌شود.',
      NON_VEHICLE_MESSAGE: 'پیام خبری، غیرآگهی یا فاقد نام خودرو قابل تشخیص است؛ متن اصلی نگهداری شده است.',
      CATALOG_ENTRY_PENDING: 'خودرو پس از تکمیل مقایسه ساخته می‌شود.',
      IDENTITY_AMBIGUOUS: 'مشخصات با بیش از یک خودرو سازگار است.',
    };
    if (observation.reasonCode === 'INSUFFICIENT_INDEPENDENT_CHANNELS'
      || observation.comparisonStatus === 'WaitingForComparableChannels') {
      if (observation.reasonCode && reasons[observation.reasonCode]) return reasons[observation.reasonCode];
      return 'این آگهی در نوبت محاسبه میانگین کانال‌های ثبت‌شده است؛ حداقل پنج کانال لازم نیست.';
    }
    if (observation.reasonCode && reasons[observation.reasonCode]) return reasons[observation.reasonCode];
    if (observation.processingStatus === 'Published') {
      return `میانگین از آخرین قیمت معتبر ${observation.validPriceSourceCount ?? 0} کانال ثبت شد؛ هر کانال یک سهم دارد.`;
    }
    if (observation.matchStatus === 'Late') return 'پیام قدیمی است و در قیمت روز وارد نمی‌شود.';
    return observation.matchReason && /[آ-ی]/.test(observation.matchReason)
      ? observation.matchReason : 'جزئیات این وضعیت هنوز ثبت نشده است.';
  }

  priceUnavailableLabel(observation: TelegramObservation): string {
    return observation.price && !observation.currency
      ? 'واحد پول قیمت مشخص نیست' : 'قیمتی استخراج نشده است';
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
