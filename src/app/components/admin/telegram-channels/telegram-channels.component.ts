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

  channels: TelegramChannel[] = [];
  capability?: TelegramCapability;
  jobs: TelegramJobLog[] = [];
  summary?: TelegramSummary;
  input = '';
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
        },
        error: (error) => this.showError(error),
      });
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
