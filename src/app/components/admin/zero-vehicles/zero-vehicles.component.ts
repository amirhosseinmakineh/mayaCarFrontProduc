import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, exhaustMap, finalize, tap, timer } from 'rxjs';
import { ZeroVehiclesService, ZeroCatalog, ZeroImport, ZeroListing, ZeroPage, ZeroPrice, ZeroChannel, ZeroChannelResult, ZeroIssue } from '../../../services/zero-vehicles.service';
@Component({
  selector: 'app-zero-vehicles', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './zero-vehicles.component.html', styleUrls: ['./zero-vehicles.component.css'],
})
export class ZeroVehiclesComponent {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly api = inject(ZeroVehiclesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platform = inject(PLATFORM_ID);
  private polling?: Subscription;
  channel = ''; messageLimit = 100; importBusy = false; recalculateBusy = false;
  error = ''; notice = ''; tab: 'listings' | 'prices' = 'listings';
  run?: ZeroImport; history?: ZeroPage<ZeroImport>; historyPage = 0;
  catalog: ZeroCatalog[] = [];
  filters = { search: '', modelId: null as number | null, trimId: null as number | null, status: '', page: 0 };
  listings?: ZeroPage<ZeroListing>; listingsBusy = false;
  prices?: ZeroPage<ZeroPrice>; pricesBusy = false; priceSearch = ''; pricePage = 0;
  selectedPrice?: ZeroPrice; members?: ZeroPage<ZeroListing>; memberPage = 0; membersBusy = false;
  detail?: { listing: ZeroListing; rawText: string };
  private listingRequest?: Subscription;
  private priceRequest?: Subscription;
  private memberRequest?: Subscription;
  channelText = ''; channels: ZeroChannel[] = []; bulkResults: ZeroChannelResult[] = [];
  channelsBusy = false; deviationPercent = 15; issues?: ZeroPage<ZeroIssue>;
  loadChannels(): void { this.api.channels().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: x => { this.channels = x; this.changeDetector.markForCheck(); }, error: e => this.fail(e) }); }
  addChannels(): void {
    this.channelsBusy = true;
    this.api.addChannels(this.channelText).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.channelsBusy = false; this.changeDetector.markForCheck(); })).subscribe({ next: x => { this.bulkResults = x; this.loadChannels(); }, error: e => this.fail(e) });
  }
  toggleChannel(item: ZeroChannel): void { this.api.toggleChannel(item.id, !item.enabled).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.loadChannels(), error: e => this.fail(e) }); }
  deleteChannel(item: ZeroChannel): void { this.api.deleteChannel(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.loadChannels(), error: e => this.fail(e) }); }
  importAll(): void {
    this.channelsBusy = true;
    this.api.importAll(this.messageLimit).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.channelsBusy = false; this.changeDetector.markForCheck(); })).subscribe({ next: x => { this.bulkResults = x; this.loadHistory(); const first = x.find(y => y.run)?.run; if (first) this.selectRun(first); }, error: e => this.fail(e) });
  }
  importChannel(item: ZeroChannel): void { this.channel = item.identifier; this.start(); }
  saveSettings(): void { this.api.saveSettings(this.deviationPercent).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.notice = 'تنظیم ذخیره شد؛ محاسبه دوباره را اجرا کنید.'; this.changeDetector.markForCheck(); }, error: e => this.fail(e) }); }
  loadIssues(runId: number, page = 0): void { this.api.issues(runId, page).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: x => { this.issues = x; this.changeDetector.markForCheck(); }, error: e => this.fail(e) }); }
  retryRun(): void { if (this.run) { this.channel = this.run.channel; this.start(this.run.before); } }
  ngOnInit(): void {
    if (!isPlatformBrowser(this.platform)) return;
    this.loadChannels();
    this.api.settings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: x => { this.deviationPercent = x.deviationPercent; this.changeDetector.markForCheck(); }, error: e => this.fail(e) });
    timer(3000, 3000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.history?.items.some(x => ['Queued', 'Processing'].includes(x.status))) { this.loadHistory(); this.loadChannels(); this.loadListings(); this.loadPrices(); }
    });
    this.loadCatalog(); this.loadListings(); this.loadPrices(); this.loadHistory(true);
  }
  get active(): boolean { return !!this.run && ['Queued', 'Processing'].includes(this.run.status); }
  get trims() { return this.catalog.find(model => model.id === this.filters.modelId)?.trims ?? []; }
  loadCatalog(): void { this.api.catalog().pipe(takeUntilDestroyed(this.destroyRef), tap({ next: () => this.changeDetector.markForCheck() })).subscribe({ next: value => this.catalog = value, error: e => this.fail(e) }); }
  start(before: number | null = null): void {
    if (this.importBusy || this.active || !this.channel.trim()) return;
    this.error = ''; this.notice = ''; this.importBusy = true;
    this.api.start(this.channel, this.messageLimit, before).pipe(takeUntilDestroyed(this.destroyRef), tap({ next: () => this.changeDetector.markForCheck() }), finalize(() => this.importBusy = false)).subscribe({
      next: run => { this.selectRun(run); this.loadHistory(); }, error: e => this.fail(e),
    });
  }
  continueRun(): void {
    if (!this.run?.nextBefore) return;
    this.channel = this.run.channel; this.messageLimit = this.run.messageLimit; this.start(this.run.nextBefore);
  }
  selectRun(run: ZeroImport): void {
    this.polling?.unsubscribe(); this.run = run; this.issues = undefined; if (!["Queued", "Processing"].includes(run.status)) this.loadIssues(run.id);
    if (!this.active) return;
    this.polling = timer(0, 2000).pipe(exhaustMap(() => this.api.run(run.id)), takeUntilDestroyed(this.destroyRef), tap({ next: () => this.changeDetector.markForCheck() })).subscribe({
      next: result => {
        this.run = result;
        if (!this.active) {
          this.polling?.unsubscribe(); this.loadIssues(result.id); this.loadChannels(); this.loadListings(); this.loadPrices(); this.loadCatalog(); this.loadHistory();
        }
      }, error: e => { this.polling?.unsubscribe(); this.fail(e); },
    });
  }
  refreshRun(): void { if (this.run) this.selectRun(this.run); }
  loadHistory(restore = false): void {
    this.api.runs(this.historyPage).pipe(takeUntilDestroyed(this.destroyRef), tap({ next: () => this.changeDetector.markForCheck() })).subscribe({
      next: data => { this.history = data; if (restore && data.items.length) this.selectRun(data.items[0]); }, error: e => this.fail(e),
    });
  }
  loadListings(reset = false): void {
    if (reset) this.filters.page = 0;
    this.listingRequest?.unsubscribe(); this.listingsBusy = true;
    this.listingRequest = this.api.listings({ ...this.filters }).pipe(takeUntilDestroyed(this.destroyRef), tap({ next: () => this.changeDetector.markForCheck() }), finalize(() => this.listingsBusy = false)).subscribe({ next: data => this.listings = data, error: e => this.fail(e) });
  }
  modelChanged(): void { this.filters.trimId = null; this.loadListings(true); }
  listingPage(offset: number): void { this.filters.page = Math.max(0, this.filters.page + offset); this.loadListings(); }
  loadPrices(reset = false): void {
    if (reset) this.pricePage = 0;
    this.priceRequest?.unsubscribe(); this.pricesBusy = true;
    this.priceRequest = this.api.prices(this.priceSearch, this.pricePage).pipe(takeUntilDestroyed(this.destroyRef), tap({ next: () => this.changeDetector.markForCheck() }), finalize(() => this.pricesBusy = false)).subscribe({ next: data => this.prices = data, error: e => this.fail(e) });
  }
  recalculate(): void {
    this.recalculateBusy = true; this.error = ''; this.notice = '';
    this.api.recalculate().pipe(takeUntilDestroyed(this.destroyRef), tap({ next: () => this.changeDetector.markForCheck() }), finalize(() => this.recalculateBusy = false)).subscribe({ next: result => {
      this.notice = `${result.groups} گروه قیمت معتبر محاسبه شد.`; this.selectedPrice = undefined; this.members = undefined; this.loadPrices(); this.loadListings();
    }, error: e => this.fail(e) });
  }
  showMembers(price: ZeroPrice, page = 0): void {
    this.memberRequest?.unsubscribe();
    this.selectedPrice = price; this.memberPage = page; this.members = undefined; this.membersBusy = true;
    this.memberRequest = this.api.members(price.id, page).pipe(takeUntilDestroyed(this.destroyRef), tap({ next: () => this.changeDetector.markForCheck() }), finalize(() => this.membersBusy = false)).subscribe({ next: data => this.members = data, error: e => this.fail(e) });
  }
  showDetail(id: number): void { this.api.detail(id).pipe(takeUntilDestroyed(this.destroyRef), tap({ next: () => this.changeDetector.markForCheck() })).subscribe({ next: detail => this.detail = detail, error: e => this.fail(e) }); }
  asUtc(value: string): string { return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`; }
  hasNext(data?: ZeroPage<unknown>): boolean { return !!data && (data.page + 1) * data.pageSize < data.total; }
  label(status: string): string {
    return ({ Queued: 'در صف دریافت', Processing: 'در حال دریافت و بررسی', Completed: 'دریافت کامل شد', Partial: 'دریافت ناقص', Failed: 'دریافت ناموفق', Matched: 'تطبیق مرجع معتبر', Ambiguous: 'نام دارای چند قیمت متفاوت', NotFound: 'قیمت بازار پیدا نشد', SourceUnavailable: 'منبع در دسترس نیست', Unavailable: 'قیمت نهایی در دسترس نیست', ReferenceOnly: 'فقط قیمت Car.ir', Priced: 'قیمت نهایی محاسبه شد', AmbiguousPrice: 'واحد مبلغ مبهم', Included: 'در قیمت نهایی محاسبه شد', Pending: 'در انتظار محاسبه', Stale: 'خارج از بازهٔ تازگی', Outlier: 'قیمت غیرعادی؛ خارج از محاسبه', DuplicateContent: 'متن تکراری؛ خارج از محاسبه', Superseded: 'قیمت جدیدتر کانال جایگزین شد', InvalidPrice: 'قیمت خارج از محدوده', Low: 'کم؛ قیمت اولیه', Medium: 'متوسط', High: 'بالاتر' } as Record<string, string>)[status] ?? status;
  }
  get rejectionSummary(): { text: string; count: number }[] {
    const labels: Record<string, string> = { BUY_REQUEST: 'درخواست خرید؛ آگهی فروش نیست', ALLOCATION_OR_PREORDER: 'حواله، امتیاز خرید یا پیش‌فروش؛ خودرو آمادهٔ فروش نیست', POSITIVE_MILEAGE: 'کارکرد مثبت', ZERO_NOT_CONFIRMED: 'صفر بودن تأیید نشد', CONTRADICTORY_CONDITION: 'وضعیت متناقض', MODEL_UNKNOWN_OR_AMBIGUOUS: 'مدل ناشناخته یا مبهم', TRIM_UNKNOWN_OR_AMBIGUOUS: 'تیپ ناشناخته یا مبهم', PRICE_INVALID: 'قیمت نامعتبر یا مبهم', PRICE_OUT_OF_RANGE: 'قیمت خارج از محدوده', CURRENCY_MISSING: 'واحد پول نامشخص', PUBLICATION_DATE_INVALID: 'تاریخ نامعتبر', MESSAGE_INVALID: 'پیام نامعتبر یا بیش از حد طولانی' };
    try { return Object.entries(JSON.parse(this.run?.rejectionCounts ?? '{}') as Record<string, number>).map(([code, count]) => ({ text: labels[code] ?? code, count })); } catch { return []; }
  }
  private fail(error: HttpErrorResponse): void {
    this.changeDetector.markForCheck();
    this.error = error.error?.message ?? (error.status === 401 || error.status === 403 ? 'با حساب ادمین وارد شوید.' : 'دریافت پاسخ از سرور ممکن نشد. دوباره تلاش کنید.');
  }
}
