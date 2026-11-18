import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';

interface ScanReference {
  Name: string; Year: string; AdvertisementCount: number;
  ReferencePriceBillion: number; ComparedPricesBillion: number[];
}
interface RejectedReference {
  CarId: number; Year: string; Status: string; Reason: string;
  CandidatePricesBillion: number[]; AdvertisementCount: number;
}
interface ScanResults {
  Status?: string; ParsedCars?: number; ReferenceCount?: number;
  SavedCars?: number; ChannelErrors?: Record<string, string>;
  RejectedReferences?: RejectedReference[]; References?: ScanReference[];
}
interface ScanStatus {
  status?: string; startedAt?: string; finishedAt?: string;
  totalChannels?: number; completedChannels?: number;
  failedChannels?: number; messagesProcessed?: number;
  parsedCars?: number; referenceCount?: number; savedCars?: number;
  channelErrors?: Record<string, string>; error?: string;
  results?: ScanResults;
}

@Component({
  selector: 'app-telegram-management',
  standalone: true,
  imports: [CommonModule],
  template: `
  <section class="telegram-admin" dir="rtl">
    <header class="hero">
      <div><span class="eyebrow">مرکز کنترل منابع قیمت</span>
        <h1>مدیریت اسکن تلگرام</h1>
        <p>اجرای اسکن فقط با دستور مدیر است. تأیید مرجع قیمت توسط الگوریتم انجام می‌شود و نیازی به تأیید دستی قیمت نیست.</p>
      </div>
      <div class="actions">
        <button class="secondary" type="button" (click)="refresh()" [disabled]="loading">↻ بروزرسانی گزارش</button>
        <button class="primary" type="button" (click)="startScan()" [disabled]="loading || starting || isRunning">
          {{ starting ? 'در حال ارسال درخواست…' : isRunning ? 'اسکن در حال اجراست' : '▶ شروع اسکن دستی' }}
        </button>
      </div>
    </header>

    <div class="notice" *ngIf="error" role="alert">{{ error }}</div>
    <div class="notice info" *ngIf="!error && !scan">هنوز گزارشی دریافت نشده است. برای مشاهده وضعیت، بروزرسانی گزارش را بزنید.</div>
    <div class="summary" *ngIf="scan">
      <div class="summary-head">
        <span class="status" [class.running]="isRunning" [class.warn]="scan.status === 'PartialSuccess'">
          {{ statusLabel(scan.status) }}
        </span>
        <span>شروع: {{ formatDate(scan.startedAt) }} · پایان: {{ formatDate(scan.finishedAt) }}</span>
      </div>
      <div class="metrics">
        <article><small>پیام‌های دریافت‌شده</small><strong>{{ scan.messagesProcessed ?? '—' }}</strong><span>مجموع پیام‌های پردازش‌شده</span></article>
        <article><small>آگهی‌های استخراج‌شده</small><strong>{{ scan.parsedCars ?? results?.ParsedCars ?? '—' }}</strong><span>قبل از ارزیابی مرجع</span></article>
        <article><small>گروه‌های مرجع معتبر</small><strong>{{ scan.referenceCount ?? results?.ReferenceCount ?? '—' }}</strong><span>به تفکیک خودرو و سال</span></article>
        <article><small>خودروهای به‌روزشده</small><strong>{{ scan.savedCars ?? results?.SavedCars ?? '—' }}</strong><span>دارای مرجع در اسکن اخیر</span></article>
        <article><small>قیمت‌های ردشده</small><strong>{{ rejected.length }}</strong><span>نیازمند بررسی علت رد</span></article>
        <article><small>کانال‌های ناموفق</small><strong>{{ channelErrors.length }}</strong><span>عدم دسترسی یا خطای خواندن</span></article>
      </div>
    </div>

    <div class="explain">
      <h2>اسکن چه مراحلی دارد؟</h2>
      <div class="steps">
        <div><b>۱</b><span>خواندن کانال‌های قابل دسترس</span></div>
        <div><b>۲</b><span>شناسایی آگهی خودروی صفر</span></div>
        <div><b>۳</b><span>تطبیق مدل، تیپ و سال</span></div>
        <div><b>۴</b><span>مقایسه و تأیید سیستمی قیمت</span></div>
        <div><b>۵</b><span>نمایش فقط مراجع تأییدشده</span></div>
      </div>
      <p>این مراحل، منطق سیستم را نشان می‌دهند؛ گزارش لحظه‌ای هر مرحله تنها پس از پشتیبانی API قابل نمایش است.</p>
    </div>

    <nav class="tabs" aria-label="گزارش‌های اسکن">
      <button *ngFor="let item of tabs" type="button" [class.selected]="tab === item.id" (click)="tab = item.id">{{ item.label }}</button>
    </nav>

    <div class="panel" *ngIf="tab === 'overview'">
      <h2>خلاصه وضعیت</h2>
      <p *ngIf="!scan">داده‌ای برای نمایش وجود ندارد.</p>
      <ng-container *ngIf="scan">
        <p>وضعیت فعلی: <strong>{{ statusLabel(scan.status) }}</strong></p>
        <p *ngIf="scan.error" class="bad">خطای اجرای اسکن: {{ scan.error }}</p>
        <p *ngIf="channelErrors.length">برخی کانال‌ها قابل خواندن نیستند. این خطا به‌تنهایی به معنی ردشدن همه قیمت‌های مرجع نیست.</p>
        <p>مرجع معتبر فقط برای خودروی صفر و پس از تأیید الگوریتم قابل انتشار است؛ تأیید مدیر لازم نیست.</p>
      </ng-container>
    </div>

    <div class="panel" *ngIf="tab === 'approved'">
      <h2>قیمت‌های مرجع تولیدشده <span>({{ references.length }})</span></h2>
      <p *ngIf="!results">جزئیات مراجع در پاسخ API موجود نیست.</p>
      <p *ngIf="results && !references.length">مرجع قیمتی در این گزارش ثبت نشده است.</p>
      <div class="table-wrap" *ngIf="references.length"><table><thead><tr><th>خودرو</th><th>سال</th><th>تعداد آگهی</th><th>قیمت مرجع (میلیارد تومان)</th><th>قیمت‌های مقایسه‌شده</th></tr></thead>
        <tbody><tr *ngFor="let item of references"><td>{{ item.Name }}</td><td>{{ item.Year }}</td><td>{{ item.AdvertisementCount }}</td><td><strong>{{ item.ReferencePriceBillion }}</strong></td><td>{{ item.ComparedPricesBillion.join('، ') }}</td></tr></tbody></table></div>
    </div>

    <div class="panel" *ngIf="tab === 'rejected'">
      <h2>گروه‌های قیمت ردشده <span>({{ rejected.length }})</span></h2>
      <p *ngIf="!results">جزئیات رد قیمت در پاسخ API موجود نیست.</p>
      <p *ngIf="results && !rejected.length">گروه ردشده‌ای در این گزارش ثبت نشده است.</p>
      <div class="rejection" *ngFor="let item of rejected">
        <div><strong>خودرو {{ item.CarId }} · سال {{ item.Year }}</strong><span class="pill">نیازمند بررسی</span></div>
        <p>قیمت‌های بررسی‌شده: {{ item.CandidatePricesBillion.join('، ') }} میلیارد تومان</p>
        <small>علت: پراکندگی زیاد قیمت‌ها یا نبود توافق کافی بین آگهی‌ها</small>
      </div>
    </div>

    <div class="panel" *ngIf="tab === 'channels'">
      <h2>خطاهای کانال‌ها <span>({{ channelErrors.length }})</span></h2>
      <p *ngIf="!channelErrors.length">خطای کانالی در آخرین گزارش ثبت نشده است.</p>
      <div class="channel" *ngFor="let item of channelErrors">
        <strong dir="ltr">{{ item.name }}</strong><span>{{ item.reason }}</span>
      </div>
      <p class="hint">این گزارش خطای دریافت را نشان می‌دهد؛ خصوصی‌بودن کانال بدون بررسی مستقل قطعی نیست.</p>
    </div>
    <footer>منبع گزارش: آخرین Job ثبت‌شده در Backend. برای مشاهده داده‌های جدید از بروزرسانی استفاده کنید.</footer>
  </section>`,
  styles: [`
    :host{display:block;font-family:inherit;color:#483a21}.telegram-admin{max-width:1450px;margin:auto}
    .hero{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;background:linear-gradient(120deg,#fff,#fff7df);border:1px solid #ecdcb0;border-radius:22px;padding:26px}
    .eyebrow{color:#a17b22;font-weight:800;font-size:12px}.hero h1{font-size:26px;margin:8px 0}.hero p{margin:0;max-width:650px;line-height:2;color:#76674e}
    .actions{display:flex;flex-wrap:wrap;gap:10px}button{cursor:pointer;font-family:inherit;font-weight:800;border-radius:12px;padding:12px 18px;border:1px solid #e5d5a7}
    button:disabled{opacity:.55;cursor:not-allowed}.primary{background:#a98127;color:white;border-color:#a98127}.secondary{background:white;color:#745617}
    .notice{margin-top:16px;padding:14px 18px;border-radius:12px;background:#fff0ef;color:#a52e2e}.notice.info{background:#f8f3e7;color:#705b34}
    .summary,.explain,.panel{background:#fff;border:1px solid #eee3c8;border-radius:20px;padding:20px;margin-top:18px}
    .summary-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;color:#82765f;font-size:13px;margin-bottom:16px}
    .status{background:#e7f7ed;color:#167342;padding:7px 12px;border-radius:999px;font-weight:800}.status.warn{background:#fff1d5;color:#9b6500}.status.running{background:#e7f0ff;color:#235bb3}
    .metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.metrics article{border-radius:14px;background:#fbf8f1;padding:18px;display:flex;flex-direction:column;gap:7px}
    .metrics small,.metrics span{color:#87765c}.metrics strong{font-size:29px;color:#624913}.metrics span{font-size:12px}
    h2{font-size:18px;margin:0 0 16px}.steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.steps div{background:#fbf8f1;border-radius:12px;padding:12px;display:flex;align-items:center;gap:9px;font-size:13px}
    .steps b{background:#e5c777;color:#624913;padding:5px 9px;border-radius:9px}.explain p,.hint{color:#82765f;font-size:13px;line-height:2}
    .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.tabs button{background:#fff;color:#765f30}.tabs button.selected{background:#a98127;color:#fff}
    .panel{min-height:180px}.panel h2 span{font-size:13px;color:#a98127}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:680px;text-align:right}
    th,td{padding:13px;border-bottom:1px solid #f0e8d6;font-size:13px}th{background:#fbf6e9}.rejection{padding:15px;border:1px solid #f2d9d2;border-radius:13px;margin:10px 0;background:#fffaf8}
    .rejection>div{display:flex;justify-content:space-between;gap:12px}.rejection p{margin:10px 0}.rejection small{color:#9b6555}.pill{background:#ffebe6;color:#a23d2a;border-radius:30px;padding:4px 9px;font-size:12px}
    .channel{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;padding:14px;border-bottom:1px solid #eee3c8}.channel span{color:#967454;font-size:12px;max-width:70%}
    .bad{color:#ac2929}footer{font-size:12px;color:#8c7e66;margin:18px 0}
    @media(max-width:900px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:540px){.hero{padding:17px}.hero h1{font-size:21px}.actions{width:100%}.actions button{flex:1}.metrics{gap:8px}.metrics article{padding:12px}.metrics strong{font-size:23px}.steps{grid-template-columns:1fr}.channel span{max-width:100%}}
  `]
})
export class TelegramManagementComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/telegram';
  loading = false;
  starting = false;
  error = '';
  scan: ScanStatus | null = null;
  results: ScanResults | null = null;
  tab: 'overview' | 'approved' | 'rejected' | 'channels' = 'overview';
  readonly tabs = [
    { id: 'overview', label: 'نمای کلی' },
    { id: 'approved', label: 'مراجع تأییدشده' },
    { id: 'rejected', label: 'قیمت‌های ردشده' },
    { id: 'channels', label: 'وضعیت کانال‌ها' }
  ];

  ngOnInit(): void { this.refresh(); }
  get isRunning(): boolean { return this.scan?.status === 'Running' || this.scan?.status === 'Queued'; }
  get references(): ScanReference[] { return this.results?.References ?? []; }
  get rejected(): RejectedReference[] { return this.results?.RejectedReferences ?? []; }
  get channelErrors(): { name: string; reason: string }[] {
    const errors = this.results?.ChannelErrors ?? this.scan?.channelErrors ?? {};
    return Object.entries(errors).map(([name, reason]) => ({ name, reason }));
  }

  refresh(): void {
    this.loading = true; this.error = '';
    this.http.get<ScanStatus>(this.baseUrl + '/status').subscribe({
      next: status => {
        this.scan = status;
        this.http.get<ScanStatus | ScanResults>(this.baseUrl + '/results').subscribe({
          next: payload => {
            const wrapped = payload as ScanStatus;
            this.results = wrapped.results ?? (payload as ScanResults);
            this.loading = false;
          },
          error: () => { this.results = null; this.loading = false; }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = err.status === 401 || err.status === 403
          ? 'برای مشاهده گزارش باید با حساب مدیر وارد شوید.'
          : 'دریافت وضعیت اسکن ممکن نشد. مسیر API یا اتصال سرور را بررسی کنید.';
      }
    });
  }

  startScan(): void {
    if (this.isRunning || this.starting || !confirm('اسکن دستی تلگرام شروع شود؟')) return;
    this.starting = true; this.error = '';
    this.http.post(this.baseUrl + '/scan', {}).subscribe({
      next: () => { this.starting = false; this.refresh(); },
      error: (err: HttpErrorResponse) => {
        this.starting = false;
        this.error = err.status === 409 ? 'یک اسکن دیگر در حال اجراست.' :
          'درخواست اجرای اسکن پذیرفته نشد. مسیر API اجرای دستی را بررسی کنید.';
      }
    });
  }
  statusLabel(status?: string): string {
    return ({ Running: 'در حال اجرا', Queued: 'در صف', Completed: 'تکمیل‌شده',
      PartialSuccess: 'تکمیل با هشدار', Failed: 'ناموفق', Pending: 'هنوز اجرا نشده' } as Record<string, string>)[status ?? ''] ?? 'نامشخص';
  }
  formatDate(value?: string): string {
    return value ? new Date(value).toLocaleString('fa-IR') : '—';
  }
}
