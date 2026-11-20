import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { retry, timer, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface RawTelegramMessage {
  id: number;
  telegramMessageId: number;
  channelId?: string | null;
  channelName?: string | null;
  channelUsername?: string | null;
  senderName?: string | null;
  text: string;
  messageUrl?: string | null;
  publishedAt?: string | null;
  collectedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}
interface MessagePage {
  items: RawTelegramMessage[];
  totalCount: number;
  page: number;
  pageSize: number;
}
@Component({
  selector: 'app-telegram-raw-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="archive" dir="rtl">
      <header class="heading">
        <div><span class="eyebrow">آرشیو مستقل پیام‌ها</span><h1>پیام‌های خام تلگرام</h1>
          <p>نمایش کامل متن و مشخصات پیام‌های دریافت‌شده؛ مستقل از اسکن و مقایسه قیمت خودرو</p></div>
        <div class="manual-actions">
          <button class="apply" (click)="runManual()" [disabled]="refreshPending || refreshRunning">
            {{ refreshPending || refreshRunning ? 'در حال اجرای دریافت…' : '▶ دریافت دستی پیام‌ها' }}
          </button>
          <button class="refresh" (click)="load()" [disabled]="loading">↻ بروزرسانی لیست</button>
        </div>
      </header>
      <div class="summary" aria-live="polite">
        وضعیت جمع‌آوری: <strong>{{ refreshStatus }}</strong>
        <span *ngIf="refreshError" class="alert">{{ refreshError }}</span>
      </div>
      <div class="archive-diagnostics" *ngIf="archiveDiagnostics">
        <span>کانال موفق: <b>{{ archiveDiagnostics.successfulChannels }}</b></span>
        <span>کانال ناموفق: <b>{{ archiveDiagnostics.failedChannels }}</b></span>
        <span>پیام دریافت‌شده: <b>{{ archiveDiagnostics.receivedMessages }}</b></span>
        <span>پیام ذخیره‌شده: <b>{{ archiveDiagnostics.savedMessages }}</b></span>
        <details *ngIf="archiveDiagnostics.channelErrors && (archiveDiagnostics.channelErrors | keyvalue).length">
          <summary>جزئیات خطای کانال‌ها</summary>
          <div *ngFor="let item of archiveDiagnostics.channelErrors | keyvalue">
            <b dir="ltr">{{ item.key }}</b>: {{ item.value }}
          </div>
        </details>
      </div>
      <div class="filters">
        <label>جست‌وجوی متن یا شناسه<input [(ngModel)]="search" (keyup.enter)="applyFilters()" placeholder="متن پیام یا شناسه…" /></label>
        <label>کانال<input [(ngModel)]="channel" (keyup.enter)="applyFilters()" placeholder="نام یا یوزرنیم کانال" /></label>
        <label>از تاریخ<input type="date" [(ngModel)]="fromDate" /></label>
        <label>تا تاریخ<input type="date" [(ngModel)]="toDate" /></label>
        <button class="apply" (click)="applyFilters()">اعمال فیلتر</button>
        <button class="clear" (click)="reset()">پاک‌کردن</button>
      </div>
      <div class="summary"><strong>{{ totalCount | number:'1.0-0' }}</strong> پیام ثبت‌شده
        <span>صفحه {{ page }} از {{ totalPages }}</span></div>
      <div *ngIf="error" class="alert" role="alert">{{ error }} <button (click)="load()">تلاش دوباره</button></div>
      <div *ngIf="loading" class="empty">در حال دریافت پیام‌ها…</div>
      <div *ngIf="!loading && !error && !messages.length" class="empty">پیامی با این فیلترها پیدا نشد.</div>
      <div class="layout" *ngIf="!loading && messages.length">
        <div class="messages">
          <button class="message" *ngFor="let item of messages; trackBy: trackById"
            [class.active]="selected?.id === item.id" (click)="selected = item">
            <span class="message-top"><b>{{ item.channelName || item.channelUsername || 'کانال نامشخص' }}</b>
              <time>{{ formatDate(item.publishedAt) }}</time></span>
            <span class="preview">{{ item.text || 'پیام بدون متن' }}</span>
            <small>شناسه پیام: {{ item.telegramMessageId }} <span *ngIf="item.senderName"> · {{ item.senderName }}</span></small>
          </button>
        </div>
        <article class="details" *ngIf="selected as item">
          <div class="detail-header"><h2>جزئیات کامل پیام</h2><button (click)="copyText(item.text)">کپی متن</button></div>
          <dl>
            <div><dt>کانال</dt><dd>{{ item.channelName || '—' }}</dd></div>
            <div><dt>شناسه کانال</dt><dd dir="ltr">{{ item.channelId || '—' }}</dd></div>
            <div><dt>نام کاربری کانال</dt><dd dir="ltr">{{ item.channelUsername || '—' }}</dd></div>
            <div><dt>ارسال‌کننده</dt><dd>{{ item.senderName || '—' }}</dd></div>
            <div><dt>شناسه پیام</dt><dd>{{ item.telegramMessageId }}</dd></div>
            <div><dt>تاریخ انتشار</dt><dd>{{ formatDate(item.publishedAt) }}</dd></div>
            <div><dt>زمان دریافت</dt><dd>{{ formatDate(item.collectedAt) }}</dd></div>
          </dl>
          <h3>متن اصلی و بدون تغییر</h3><div class="raw-text" dir="auto">{{ item.text || 'پیام بدون متن' }}</div>
          <a *ngIf="safeMessageUrl(item.messageUrl) as url" [href]="url" target="_blank" rel="noopener noreferrer">مشاهده پیام در تلگرام ↗</a>
          <ng-container *ngIf="item.metadata"><h3>سایر جزئیات ذخیره‌شده</h3>
            <pre class="metadata" dir="ltr">{{ item.metadata | json }}</pre></ng-container>
        </article>
      </div>
      <footer class="pagination" *ngIf="totalCount > pageSize">
        <button (click)="changePage(page-1)" [disabled]="page <= 1 || loading">صفحه قبل</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button (click)="changePage(page+1)" [disabled]="page >= totalPages || loading">صفحه بعد</button>
      </footer>
    </section>`,
  styles: [`
    :host{display:block;min-width:0;color:#352d20}.archive{max-width:1500px;margin:auto;padding:8px}
.manual-actions{display:flex;flex-wrap:wrap;gap:9px}.heading{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:18px}
    .eyebrow{font-size:12px;color:#977226;font-weight:700}.heading h1{font-size:26px;margin:7px 0}.heading p{color:#766d5c;line-height:1.9;margin:0}
    button,input{font:inherit}button{cursor:pointer}.refresh,.apply,.clear,.pagination button,.detail-header button{border:1px solid #e6d9bf;border-radius:11px;padding:11px 15px;background:white;color:#6e5423;font-weight:700}
.archive-diagnostics{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;padding:14px;background:#fff;border:1px solid #ede4d4;border-radius:12px}
    .archive-diagnostics span{font-size:13px}.archive-diagnostics details{width:100%;overflow-wrap:anywhere;font-size:12px;line-height:2}
    .filters{background:white;border:1px solid #ede4d4;border-radius:18px;padding:17px;display:flex;align-items:end;gap:12px;flex-wrap:wrap}
    .filters label{font-size:12px;font-weight:700;display:flex;flex-direction:column;gap:7px;flex:1 1 160px}
    .filters input{min-width:0;padding:12px;border:1px solid #dedbd4;border-radius:10px;outline:none}
    .filters input:focus{border-color:#aa852e;box-shadow:0 0 0 3px #aa852e22}.apply{background:#a98127;color:white}
    .summary{display:flex;align-items:center;gap:8px;padding:16px 2px;color:#6d6558}.summary strong{font-size:23px;color:#6b4d15}.summary span{margin-right:auto;font-size:12px}
    .layout{display:grid;grid-template-columns:minmax(270px, .85fr) minmax(0,1.4fr);gap:15px;align-items:start}
    .messages,.details{background:#fff;border:1px solid #eae1d1;border-radius:17px;overflow:hidden}
    .messages{max-height:72vh;overflow-y:auto}.message{display:block;width:100%;border:0;border-bottom:1px solid #f0ece4;text-align:right;padding:17px;background:#fff;color:inherit}
    .message:hover,.message.active{background:#fcf6e9}.message.active{box-shadow:inset -4px 0 #a98127}
    .message-top{display:flex;justify-content:space-between;gap:10px}.message-top time{font-size:11px;color:#8d8270}
    .preview{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.9;margin:9px 0;color:#5c554c}
    .message small{color:#8b7f6b}.details{padding:22px;min-width:0}.detail-header{display:flex;align-items:center;justify-content:space-between;gap:10px}
    h2{font-size:19px;margin:0}h3{font-size:15px;margin:23px 0 10px}dl{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    dl div{background:#faf8f4;padding:12px;border-radius:10px;min-width:0}dt{font-size:11px;color:#8d8270}dd{margin:6px 0 0;overflow-wrap:anywhere;font-weight:600}
    .raw-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:2;background:#f8f7f4;padding:18px;border-radius:12px;max-height:45vh;overflow:auto;unicode-bidi:plaintext}
    .metadata{overflow:auto;background:#f8f7f4;border-radius:10px;padding:14px;font-size:12px}.details a{display:inline-block;margin-top:14px;color:#946b19}
    .empty,.alert{background:white;padding:32px;text-align:center;border-radius:15px}.alert{color:#a72f2f}.alert button{margin-right:10px}
    .pagination{display:flex;justify-content:center;align-items:center;gap:15px;margin:20px}.pagination button:disabled{opacity:.45;cursor:not-allowed}
    @media(max-width:850px){.layout{grid-template-columns:1fr}.messages{max-height:340px}.details{padding:16px}}
    @media(max-width:500px){.heading h1{font-size:21px}.filters label{flex:1 1 100%}.filters button{flex:1}dl{grid-template-columns:1fr}.message-top{flex-wrap:wrap}}
  `]
})
export class TelegramRawMessagesComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly url = environment.apiUrl.replace(/\/$/, '') + '/admin/telegram/messages';
  messages: RawTelegramMessage[] = [];
  selected: RawTelegramMessage | null = null;
  search = ''; channel = ''; fromDate = ''; toDate = '';
  page = 1; pageSize = 25; totalCount = 0;
  loading = false; error = '';
  refreshPending = false; refreshRunning = false; refreshStatus = 'نامشخص'; refreshError = '';
  archiveDiagnostics: {successfulChannels:number; failedChannels:number; receivedMessages:number; savedMessages:number; channelErrors:Record<string,string>} | null = null;
  private statusInterval?: ReturnType<typeof setInterval>;
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalCount / this.pageSize)); }
  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.load();
    this.loadStatus();
    this.statusInterval = setInterval(() => this.loadStatus(), 3000);
  }
  ngOnDestroy(): void { if (this.statusInterval) clearInterval(this.statusInterval); }
  runManual(): void {
    this.refreshPending = true; this.refreshError = '';
    this.http.post<{status: string}>(this.url + '/refresh', {}).pipe(timeout(15000)).subscribe({
      next: () => { this.refreshPending = false; this.refreshRunning = true; this.refreshStatus = 'در صف اجرا'; this.loadStatus(); },
      error: err => {
        this.refreshPending = false;
        this.refreshError = err.status === 409 ? 'دریافت قبلی هنوز در حال اجراست.' : 'شروع دریافت دستی ناموفق بود.';
        this.loadStatus();
      }
    });
  }
  loadStatus(): void {
    this.http.get<{status: string; lastError?: string; successfulChannels:number; failedChannels:number; receivedMessages:number; savedMessages:number; channelErrors:Record<string,string>}>(this.url + '/status')
      .pipe(timeout(10000)).subscribe({
        next: result => {
          this.archiveDiagnostics = result;
          const wasRunning = this.refreshRunning;
          this.refreshRunning = result.status === 'Running' || result.status === 'Queued';
          this.refreshStatus = ({Idle:'آماده',Queued:'در صف اجرا',Running:'در حال دریافت',Completed:'تکمیل‌شده',Failed:'ناموفق'} as Record<string,string>)[result.status] ?? result.status;
          this.refreshError = result.lastError ?? '';
          if (wasRunning && !this.refreshRunning && result.status === 'Completed') this.load();
        },
        error: () => { this.refreshStatus = 'عدم دسترسی به وضعیت سرور'; }
      });
  }
  trackById(_index: number, item: RawTelegramMessage): number { return item.id; }
  load(): void {
    this.loading = true; this.error = '';
    let params = new HttpParams().set('page', this.page).set('pageSize', this.pageSize);
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.channel.trim()) params = params.set('channel', this.channel.trim());
    if (this.fromDate) params = params.set('fromDate', this.fromDate);
    if (this.toDate) params = params.set('toDate', this.toDate);
    this.http.get<MessagePage>(this.url, { params }).pipe(
      timeout(20000),
      retry({ count: 2, delay: (error, attempt) => {
        if (error.status && ![0, 408, 429, 502, 503, 504].includes(error.status)) throw error;
        return timer(attempt * 1000);
      } })
    ).subscribe({
      next: response => {
        this.messages = Array.isArray(response?.items) ? response.items : [];
        this.totalCount = Number(response?.totalCount ?? 0);
        this.selected = this.messages.find(m => m.id === this.selected?.id) ?? this.messages[0] ?? null;
        this.loading = false;
      },
      error: err => {
        this.messages = []; this.selected = null; this.totalCount = 0; this.loading = false;
        this.error = err.status === 401 || err.status === 403
          ? 'برای مشاهده آرشیو باید با حساب مدیر وارد شوید.'
          : err.name === 'TimeoutError' ? 'زمان پاسخ API بیشتر از ۱۵ ثانیه شد. دوباره تلاش کنید.' : 'دریافت آرشیو پیام‌ها ممکن نشد. اتصال سرور و API آرشیو را بررسی کنید.';
      }
    });
  }
  applyFilters(): void { this.page = 1; this.load(); }
  reset(): void { this.search = ''; this.channel = ''; this.fromDate = ''; this.toDate = ''; this.applyFilters(); }
  changePage(next: number): void { if (next < 1 || next > this.totalPages) return; this.page = next; this.load(); }
  formatDate(value?: string | null): string { return value ? new Date(value).toLocaleString('fa-IR', {dateStyle:'medium',timeStyle:'short'}) : '—'; }
  safeMessageUrl(value?: string | null): string | null {
    if (!value) return null;
    try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 't.me' || url.hostname === 'telegram.me') ? url.href : null; }
    catch { return null; }
  }
  async copyText(value: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(value);
  }
}
