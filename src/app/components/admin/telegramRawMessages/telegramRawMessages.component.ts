import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, retry, timer, timeout, finalize } from 'rxjs';
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
interface ArchiveChannel { channelUsername: string; channelName: string | null; messageCount: number; }
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
            {{ refreshPending || refreshRunning ? 'در حال اجرای دریافت…' : '▶ دریافت از تلگرام' }}
          </button>
          <button class="refresh" type="button" (click)="downloadArchive()" [disabled]="exporting || refreshPending || refreshRunning">{{ exporting ? 'در حال آماده‌سازی…' : 'دانلود کل پیام‌ها (JSON)' }}</button>
          <button class="refresh" (click)="reloadDatabase()" [disabled]="loading || channelsLoading">↻ نمایش اطلاعات دیتابیس</button>
        </div>
      </header>
      <div *ngIf="exportError" class="alert" role="alert">{{ exportError }}</div>
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

        <label>از تاریخ<input type="date" [(ngModel)]="fromDate" /></label>
        <label>تا تاریخ<input type="date" [(ngModel)]="toDate" /></label>
        <button class="apply" (click)="applyFilters()" [disabled]="loading">اعمال فیلتر</button>
        <button class="clear" (click)="reset()" [disabled]="loading">پاک‌کردن</button>
      </div>
      <div class="summary"><strong>{{ totalCount | number:'1.0-0' }}</strong> پیام ثبت‌شده
        <span>صفحه {{ page }} از {{ totalPages }}</span></div>
      <div class="channel-layout">
        <aside class="channel-sidebar" aria-label="کانال‌های تلگرام">
          <div class="channel-heading"><h2>کانال‌های تلگرام</h2><button class="refresh" (click)="loadChannels()" [disabled]="channelsLoading">↻</button></div>
          <label class="channel-search">جست‌وجوی کانال<input [(ngModel)]="channelSearch" placeholder="نام یا شناسه کانال…" /></label>
          <button class="channel-item" [class.active]="!selectedChannelUsername" (click)="selectChannel(null)">
            <span>همه کانال‌ها</span><b>{{ allMessagesCount | number:'1.0-0' }}</b>
          </button>
          <div *ngIf="channelsLoading" class="empty">در حال دریافت کانال‌ها…</div>
          <div *ngIf="channelsError" class="alert">{{ channelsError }} <button (click)="loadChannels()">تلاش مجدد</button></div>
          <div class="channel-scroll">
            <button class="channel-item" *ngFor="let ch of filteredChannels; trackBy: trackByChannel"
              [class.active]="selectedChannelUsername === ch.channelUsername"
              (click)="selectChannel(ch.channelUsername)">
              <span class="channel-title">{{ ch.channelName || ch.channelUsername }}<small dir="ltr">&#64;{{ ch.channelUsername }}</small></span>
              <b>{{ ch.messageCount | number:'1.0-0' }}</b>
            </button>
          </div>
          <div *ngIf="!channelsLoading && !channelsError && !filteredChannels.length" class="empty">کانالی پیدا نشد.</div>
        </aside>
        <main class="channel-content">
          <div class="channel-content-header">
            <h2>{{ selectedChannelName }}</h2>
            <span>{{ totalCount | number:'1.0-0' }} پیام</span>
          </div>
          <div *ngIf="error" class="alert" role="alert">{{ error }} <button (click)="load()">تلاش دوباره</button></div>
          <div *ngIf="loading" class="empty">در حال دریافت پیام‌ها…</div>
          <div *ngIf="!loading && !error && !messages.length" class="empty">پیامی با این فیلترها پیدا نشد.</div>
          <div class="message-cards" *ngIf="!loading && messages.length">
            <article class="message-card" *ngFor="let item of messages; trackBy: trackById">
              <div class="message-top">
                <b>{{ item.channelName || item.channelUsername || 'کانال نامشخص' }}</b>
                <time>{{ formatDate(item.publishedAt) }}</time>
              </div>
              <div class="raw-text" dir="auto">{{ item.text || 'پیام بدون متن' }}</div>
              <div class="message-footer">
                <small>شناسه پیام: {{ item.telegramMessageId }}</small>
                <a *ngIf="safeMessageUrl(item.messageUrl) as url" [href]="url" target="_blank" rel="noopener noreferrer">مشاهده در تلگرام ↗</a>
                <button class="refresh" (click)="copyText(item.text)">کپی متن</button>
              </div>
            </article>
          </div>
        </main>
      </div>
      <footer class="pagination" *ngIf="totalCount > pageSize">
        <button (click)="changePage(page-1)" [disabled]="page <= 1 || loading">صفحه قبل</button>
        <div class="page-links">
          <button type="button" *ngFor="let number of pageNumbers" (click)="changePage(number)"
            [class.active]="number === page" [attr.aria-current]="number === page ? 'page' : null"
            [disabled]="loading">{{ number }}</button>
        </div>
        <span>نمایش {{ firstVisible }} تا {{ lastVisible }} از {{ totalCount | number:'1.0-0' }} پیام</span>
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
    .pagination{display:flex;justify-content:center;align-items:center;gap:10px;margin:20px;flex-wrap:wrap;border-top:1px solid #ede4d4;padding-top:18px}
    .page-links{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
    .page-links button{min-width:40px}.page-links button.active{background:#a98127;color:white;border-color:#a98127}
    .pagination>span{width:100%;text-align:center;color:#766d5c;font-size:12px}.pagination button:disabled{opacity:.45;cursor:not-allowed}
    .channel-layout{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:16px;align-items:start;direction:rtl}
    .channel-sidebar,.channel-content{min-width:0;background:#fff;border:1px solid #eae1d1;border-radius:17px;padding:14px}
    .channel-sidebar{position:sticky;top:12px}.channel-heading,.channel-content-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
    .channel-heading h2,.channel-content-header h2{font-size:17px;margin:0}
    .channel-search{display:flex;flex-direction:column;gap:6px;font-size:12px;margin-bottom:12px}
    .channel-search input{min-width:0;padding:11px;border:1px solid #dedbd4;border-radius:10px}
    .channel-scroll{max-height:62vh;overflow:auto}
    .channel-item{width:100%;border:0;border-bottom:1px solid #f0ece4;background:#fff;padding:12px 10px;text-align:right;display:flex;align-items:center;justify-content:space-between;gap:8px;color:#352d20}
    .channel-item:hover,.channel-item.active{background:#fcf6e9}.channel-item.active{box-shadow:inset -4px 0 #a98127}
    .channel-item b{font-size:12px;color:#8a692c}.channel-title{overflow-wrap:anywhere}.channel-title small{display:block;text-align:right;font-size:11px;color:#8b7f6b;margin-top:4px}
    .message-cards{display:flex;flex-direction:column;gap:12px}.message-card{padding:16px;border:1px solid #eae1d1;border-radius:12px}
    .message-card .raw-text{max-height:none;margin-top:12px}.message-footer{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px}
    .message-footer a{color:#946b19}.message-footer small{margin-left:auto}
    @media(max-width:850px){.channel-layout{grid-template-columns:1fr}.channel-sidebar{position:static}.channel-scroll{max-height:240px}}
    @media(max-width:850px){.layout{grid-template-columns:1fr}.messages{max-height:340px}.details{padding:16px}}
    @media(max-width:500px){.heading h1{font-size:21px}.filters label{flex:1 1 100%}.filters button{flex:1}dl{grid-template-columns:1fr}.message-top{flex-wrap:wrap}}
  `]
})
export class TelegramRawMessagesComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly url = environment.apiUrl.replace(/\/$/, '') + '/admin/telegram/messages';
  messages: RawTelegramMessage[] = [];
  channels: ArchiveChannel[] = [];
  selectedChannelUsername: string | null = null;
  channelSearch = ''; channelsLoading = false; channelsError = ''; allMessagesCount = 0;
  get filteredChannels(): ArchiveChannel[] { const q = this.channelSearch.trim().toLocaleLowerCase(); return q ? this.channels.filter(c => (c.channelName || '').toLocaleLowerCase().includes(q) || c.channelUsername.toLocaleLowerCase().includes(q)) : this.channels; }
  get selectedChannelName(): string { return this.selectedChannelUsername ? (this.channels.find(c => c.channelUsername === this.selectedChannelUsername)?.channelName || this.selectedChannelUsername) : 'پیام‌های همه کانال‌ها'; }
  selected: RawTelegramMessage | null = null;
  search = ''; fromDate = ''; toDate = '';
  page = 1; pageSize = 10; totalCount = 0;
  loading = false; error = '';
  refreshPending = false; refreshRunning = false; refreshStatus = 'نامشخص'; refreshError = '';
  archiveDiagnostics: {successfulChannels:number; failedChannels:number; receivedMessages:number; savedMessages:number; channelErrors:Record<string,string>} | null = null;
  private statusInterval?: ReturnType<typeof setInterval>;
  private messagesRequest?: Subscription;
  private channelsRequest?: Subscription;
  private statusRequest?: Subscription;
  private statusLoading = false;
  exporting = false;
  exportError = '';
  private exportRequest?: Subscription;
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalCount / this.pageSize)); }
  get firstVisible(): number { return this.totalCount ? (this.page - 1) * this.pageSize + 1 : 0; }
  get lastVisible(): number { return Math.min(this.page * this.pageSize, this.totalCount); }
  get pageNumbers(): number[] {
    const start = Math.max(1, Math.min(this.page - 2, this.totalPages - 4));
    return Array.from({length: Math.min(5, this.totalPages)}, (_, i) => start + i);
  }
  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.loadChannels();
    this.load();
    this.loadStatus();
    this.statusInterval = setInterval(() => this.loadStatus(), 3000);
  }
  ngOnDestroy(): void {
    if (this.statusInterval) clearInterval(this.statusInterval);
    this.messagesRequest?.unsubscribe();
    this.channelsRequest?.unsubscribe();
    this.statusRequest?.unsubscribe();
    this.exportRequest?.unsubscribe();
  }
  downloadArchive(): void {
    if (!this.isBrowser || this.exporting || this.refreshPending || this.refreshRunning) return;
    this.exporting = true;
    this.exportError = '';
    this.cdr.markForCheck();
    this.exportRequest = this.http.get(this.url + '/export', {responseType: 'json'})
      .pipe(timeout(25000), finalize(() => {
        this.exporting = false;
        this.cdr.markForCheck();
      })).subscribe({
        next: data => {
          try {
            if (!data || typeof data !== 'object' || !Array.isArray((data as {items?: unknown}).items))
              throw new Error('Invalid archive response');
            const blob = new Blob([JSON.stringify(data)], {type: 'application/json;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'telegram-archive-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
            document.body.appendChild(anchor);
            try { anchor.click(); }
            finally {
              anchor.remove();
              setTimeout(() => URL.revokeObjectURL(url), 60000);
            }
          } catch {
            this.exportError = 'ساخت فایل خروجی ناموفق بود.';
            this.cdr.markForCheck();
          }
        },
        error: err => {
          this.exportError = err.status === 401 || err.status === 403
            ? 'دسترسی مدیر برای دانلود لازم است.'
            : err.name === 'TimeoutError' ? 'مهلت دریافت خروجی پایان یافت.'
            : 'دانلود آرشیو ناموفق بود (HTTP ' + (err.status || 0) + ').';
          this.cdr.markForCheck();
        }
      });
  }
  runManual(): void {
    if (this.refreshPending || this.refreshRunning) return;
    this.refreshPending = true; this.refreshError = '';
    this.cdr.markForCheck();
    this.http.post<{status: string}>(this.url + '/refresh', {}).pipe(timeout(15000)).subscribe({
      next: () => { this.refreshPending = false; this.refreshRunning = true; this.refreshStatus = 'در صف اجرا'; this.cdr.markForCheck(); this.loadStatus(); },
      error: err => {
        this.refreshPending = false;
        this.refreshError = err.status === 409 ? 'دریافت قبلی هنوز در حال اجراست.' : 'شروع دریافت دستی ناموفق بود.';
        this.cdr.markForCheck();
        this.loadStatus();
      }
    });
  }
  loadStatus(): void {
    if (this.statusLoading) return;
    this.statusLoading = true;
    this.statusRequest = this.http.get<{status: string; lastError?: string; successfulChannels:number; failedChannels:number; receivedMessages:number; savedMessages:number; channelErrors:Record<string,string>}>(this.url + '/status')
      .pipe(timeout(10000)).subscribe({
        next: result => {
          this.statusLoading = false;
          this.archiveDiagnostics = result;
          this.refreshRunning = result.status === 'Running' || result.status === 'Queued';
          this.refreshStatus = ({Idle:'آماده',Queued:'در صف اجرا',Running:'در حال دریافت',Completed:'تکمیل‌شده',Failed:'ناموفق'} as Record<string,string>)[result.status] ?? result.status;
          this.refreshError = result.lastError ?? '';
          // Manual Telegram collection only updates the database and its status.
          // Reading archived messages is intentionally a separate user action.
          this.cdr.markForCheck();
        },
        error: () => { this.statusLoading = false; this.refreshStatus = 'عدم دسترسی به وضعیت سرور'; this.cdr.markForCheck(); }
      });
  }
  trackById(_index: number, item: RawTelegramMessage): number { return item.id; }
  trackByChannel(_index: number, item: ArchiveChannel): string { return item.channelUsername; }
  reloadDatabase(): void {
    this.page = 1;
    this.loadChannels();
    this.load();
  }
  selectChannel(username: string | null): void {
    this.selectedChannelUsername = username;
    this.page = 1;
    this.load();
  }
  loadChannels(): void {
    this.channelsRequest?.unsubscribe();
    this.channelsLoading = true; this.channelsError = '';
    this.cdr.markForCheck();
    this.channelsRequest = this.http.get<ArchiveChannel[]>(this.url + '/channels').pipe(timeout(20000)).subscribe({
      next: data => {
        this.channels = Array.isArray(data) ? data : [];
        this.allMessagesCount = this.channels.reduce((sum, c) => sum + Number(c.messageCount || 0), 0);
        this.channelsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.channelsLoading = false; this.channelsError = 'دریافت لیست کانال‌ها ناموفق بود.'; this.cdr.markForCheck(); }
    });
  }
  load(): void {
    this.messagesRequest?.unsubscribe();
    this.loading = true; this.error = '';
    this.messages = [];
    this.cdr.markForCheck();
    let params = new HttpParams().set('page', this.page).set('pageSize', this.pageSize);
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.selectedChannelUsername) params = params.set('channelUsername', this.selectedChannelUsername);
    if (this.fromDate) params = params.set('fromDate', this.fromDate);
    if (this.toDate) params = params.set('toDate', this.toDate);
    this.messagesRequest = this.http.get<MessagePage>(this.url, { params }).pipe(
      timeout(20000),
      retry({ count: 2, delay: (error, attempt) => {
        if (error.status && ![0, 408, 429, 502, 503, 504].includes(error.status)) throw error;
        return timer(attempt * 1000);
      } })
    ).subscribe({
      next: response => {
        this.messages = Array.isArray(response?.items) ? response.items : [];
        this.totalCount = Number(response?.totalCount ?? 0);
        if (this.page > this.totalPages) {
          this.page = this.totalPages;
          this.load();
          return;
        }
        this.selected = this.messages.find(m => m.id === this.selected?.id) ?? this.messages[0] ?? null;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.messages = []; this.selected = null; this.totalCount = 0; this.loading = false;
        this.error = err.status === 401 || err.status === 403
          ? 'برای مشاهده آرشیو باید با حساب مدیر وارد شوید.'
          : err.name === 'TimeoutError' ? 'زمان پاسخ API بیشتر از ۲۰ ثانیه شد. دوباره تلاش کنید.' : 'دریافت آرشیو پیام‌ها ممکن نشد. اتصال سرور و API آرشیو را بررسی کنید.';
        this.cdr.markForCheck();
      }
    });
  }
  applyFilters(): void { this.page = 1; this.load(); }
  reset(): void { this.search = ''; this.fromDate = ''; this.toDate = ''; this.applyFilters(); }
  changePage(next: number): void { if (this.loading || next === this.page || next < 1 || next > this.totalPages) return; this.page = next; this.load(); }
  formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fa-IR', {dateStyle:'medium',timeStyle:'short'});
  }
  safeMessageUrl(value?: string | null): string | null {
    if (!value) return null;
    try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 't.me' || url.hostname === 'telegram.me') ? url.href : null; }
    catch { return null; }
  }
  async copyText(value: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(value);
  }
}
