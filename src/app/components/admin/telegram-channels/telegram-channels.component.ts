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
import { Observable, finalize, forkJoin, timer } from 'rxjs';
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
    forkJoin({
      channels: this.service.getAll(),
      summary: this.service.getSummary(),
      capability: this.service.getCapabilities(),
      jobs: this.service.getJobs(),
      observations: this.service.getObservations(this.matchFilter, this.observationPage),
      dailyPrices: this.service.getDailyPrices(this.priceCarId, this.pricePage),
      pricingState: this.service.getPricingState(),
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
    const entries = channels ?? this.input.split(/[\s,;]+/).filter(Boolean).map(value => value.replace(/^https?:\/\/t\.me\//i, '').replace(/\/$/, ''));
    if (!entries.length || entries.length > 10 || !Number.isInteger(this.messageLimit) || this.messageLimit < 1 || this.messageLimit > 500) {
      this.error = 'یک تا ۱۰ شناسه کانال و تعداد پیام بین ۱ تا ۵۰۰ وارد کنید.';
      return;
    }
    this.previewing = true;
    this.error = '';
    this.service.preview(entries, this.messageLimit, before).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.previewing = false; this.changeDetector.markForCheck(); }),
    ).subscribe({
      next: reports => { this.previewReports = reports; },
      error: error => this.showError(error),
    });
  }

  toggle(channel: TelegramChannel): void {
    this.performAction(this.service.setEnabled(channel.id, !channel.enabled));
  }

  retry(channel: TelegramChannel): void {
    this.performAction(this.service.retry(channel.id));
  }

  test(channel: TelegramChannel): void {
    this.performAction(this.service.test(channel.id));
  }

  remove(channel: TelegramChannel): void {
    this.performAction(this.service.delete(channel.id));
  }

  private performAction(request: Observable<void>): void {
    this.error = '';
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.refresh(),
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

    const message =
      typeof error.error === 'string'
        ? error.error
        : (error.error?.detail ?? error.error?.message ?? error.error?.title);
    this.error =
      message ||
      (error.status === 0
        ? 'اتصال به API برقرار نشد؛ آدرس سرور و CORS را بررسی کنید.'
        : `خطای API (${error.status}): ${error.message}`);
    this.changeDetector.markForCheck();
  }
}
