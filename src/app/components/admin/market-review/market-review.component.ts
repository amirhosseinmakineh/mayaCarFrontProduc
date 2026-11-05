import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { apiErrorMessage } from '../../../services/api-error-message';

interface Page<T> { items: T[]; total: number; page: number; pageSize: number; }
interface Price { id: number; name: string; model: string; trim: string | null; year: number | null;
  yearCalendar: string | null; priceDay: string | null; effectivePrice: number; calculatedMarketPrice: number;
  manualOverridePrice: number | null; manualOverrideUntil: string | null; priceReviewStatus: string;
  sourceCount: number; confidence: string; pricingStatus: string; calculatedAt: string | null; }
interface Observation { currency?: string | null; id: number; rawCarName: string | null; model: string | null; trim: string | null;
  year: number | null; yearCalendar: string | null; mileage?: number | null; transmission?: string | null;
  bodyCondition?: string | null; extractedPrice?: number; price?: number; normalizedPrice?: number;
  sourceChannel: string; sourceUrl: string | null; publishedAt?: string; comparisonStatus?: string;
  reasonCode?: string; rawText?: string; }
interface Audit { id: number; action: string; actor: string; reason: string; createdAt: string; beforeJson: string; afterJson: string; }
interface Trim { id: number; name: string; aliases: string; transmission: string | null; }
interface Model { id: number; name: string; aliases: string; companyId: number | null; trims: Trim[]; }
interface Catalog { companies: {id: number; name: string}[]; models: Model[]; }

@Component({ selector: 'app-market-review', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './market-review.component.html', styleUrl: './market-review.component.css' })
export class MarketReviewComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly platform = inject(PLATFORM_ID);
  private readonly destroy = inject(DestroyRef);
  private readonly base = `${environment.apiUrl}/admin/market-review`;
  scope: 'used' | 'zero' = 'used';
  trimFilter = ''; minPrice: number | null = null; maxPrice: number | null = null; reviewStatus = ''; pricingStatus = ''; from = ''; to = ''; mileageBucket = '';
  search = ''; year: number | null = null; minSources = 0; page = 0;
  prices?: Page<Price>; selected?: Price; sources: Observation[] = []; sourcePage = 0; sourceTotal = 0; audit: Audit[] = [];
  catalog: Catalog = { companies: [], models: [] }; unknown?: Page<Observation>; unknownPage = 0;
  auditPage = 0; auditScope = ''; auditId = 0;
  busy = false; saving = false; error = ''; notice = ''; reason = ''; overridePrice: number | null = null; expires = '';
  identity?: Observation; identityModel: number | null = null; identityTrim: number | null = null;
  identityYear: number | null = null; calendar: string | null = null; mileage: number | null = null;
  transmission: string | null = null; bodyCondition: string | null = null;
  editModelId = 0; modelName = ''; modelAliases = ''; companyId: number | null = null;
  editTrimId = 0; trimModelId: number | null = null; trimName = ''; trimAliases = ''; trimTransmission: string | null = null;
  ngOnInit(): void { if (!isPlatformBrowser(this.platform)) return; this.load(); this.loadCatalog(); }
  loadCatalog(): void { this.http.get<Catalog>(`${this.base}/catalog`).pipe(takeUntilDestroyed(this.destroy)).subscribe({ next: c => this.catalog = c, error: e => this.fail(e) }); }
  load(reset = false): void {
    if (reset) { this.page = 0; this.selected = undefined; this.identity = undefined; this.sources = []; this.audit = []; this.unknownPage = 0; this.auditPage = 0; }
    this.error = ''; this.busy = true;
    let params = new HttpParams().set('search', this.search).set('page', this.page).set('minSources', this.minSources);
    if (this.year != null) params = params.set('year', this.year);
    for (const [key, value] of Object.entries({ trim: this.trimFilter, minPrice: this.minPrice, maxPrice: this.maxPrice,
      reviewStatus: this.reviewStatus, pricingStatus: this.pricingStatus, from: this.from, to: this.to, mileageBucket: this.scope === 'used' ? this.mileageBucket : '' }))
      if (value != null && value !== '') params = params.set(key, value);
    this.http.get<Page<Price>>(`${this.base}/prices/${this.scope}`, { params }).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.busy = false))
      .subscribe({ next: p => { this.prices = p; const fresh = p.items.find(x => x.id === this.selected?.id); if (fresh) this.select(fresh); }, error: e => this.fail(e) });
    if (this.scope === 'used') this.loadUnknown(this.unknownPage);
  }
  select(price: Price, page = 0): void {
    this.sourcePage = page;
    this.selected = price; this.sources = []; this.audit = []; this.overridePrice = price.manualOverridePrice;
    if (price.manualOverrideUntil) {
      const expiry = new Date(this.utc(price.manualOverrideUntil)!);
      this.expires = new Date(expiry.getTime() - expiry.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    } else this.expires = '';
    this.http.get<Page<Observation>>(`${this.base}/prices/${this.scope}/${price.id}/sources?page=${page}`).pipe(takeUntilDestroyed(this.destroy))
      .subscribe({ next: p => { this.sources = p.items; this.sourceTotal = p.total; }, error: e => this.fail(e) });
    this.history(`${this.scope}-price`, price.id);
  }
  loadUnknown(page: number): void { this.unknownPage = Math.max(0, page); this.http.get<Page<Observation>>(`${this.base}/unknown?page=${this.unknownPage}`).pipe(takeUntilDestroyed(this.destroy)).subscribe({ next: p => this.unknown = p, error: e => this.fail(e) }); }
  history(scope: string, id: number, page = 0): void { this.auditPage = Math.max(0, page); this.auditScope = scope; this.auditId = id; this.http.get<Audit[]>(`${this.base}/audit/${scope}/${id}?page=${this.auditPage}`).pipe(takeUntilDestroyed(this.destroy)).subscribe({ next: a => this.audit = a, error: e => this.fail(e) }); }
  mutate(path: string, body: unknown, put = false): void {
    if (this.saving) return;
    if (!this.reason.trim()) { this.error = 'دلیل تصمیم یا اصلاح را وارد کنید.'; return; }
    this.saving = true; this.error = ''; this.notice = '';
    const request = put ? this.http.put(`${this.base}/${path}`, body) : this.http.post(`${this.base}/${path}`, body);
    request.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.saving = false)).subscribe({ next: result => {
      const queued = result as { queued?: boolean; workerEnabled?: boolean } | null;
      this.notice = queued?.workerEnabled === false ? 'درخواست ثبت شد؛ پردازشگر بک‌اند غیرفعال است و باید فعال شود.' : queued?.queued ? 'تغییر ثبت شد و محاسبه در صف بک‌اند است؛ تا یک دقیقه دیگر فهرست را بارگذاری کنید.' : path.startsWith('recalculate/') ? 'درخواست محاسبه ثبت شد؛ بک‌اند کار را ادامه می‌دهد. تا یک دقیقه دیگر فهرست را دوباره بارگذاری کنید.' : 'تغییر ثبت شد. جزئیات و قیمت‌های محاسبه‌شده را بازبینی کنید.';
      this.load(); this.loadCatalog();
    }, error: e => this.fail(e) });
  }
  override(revoke = false): void {
    if (!this.selected) return;
    this.mutate(`prices/${this.scope}/${this.selected.id}/override`, { price: revoke ? null : this.overridePrice,
      validUntil: !revoke && this.expires ? new Date(this.expires).toISOString() : null, reason: this.reason });
  }
  decision(decision: string): void { if (this.selected) this.mutate(`prices/${this.scope}/${this.selected.id}/decision`, { decision, reason: this.reason }); }
  listingDecision(row: Observation, decision: string): void { this.mutate(`listings/${this.scope}/${row.id}/decision`, { decision, reason: this.reason }); }
  correct(row: Observation): void {
    this.identity = row; this.identityModel = this.catalog.models.find(m => m.name.toLowerCase() === row.model?.toLowerCase())?.id ?? null;
    this.identityTrim = this.catalog.models.find(m => m.id === this.identityModel)?.trims.find(t => t.name === row.trim)?.id ?? null;
    this.identityYear = row.year; this.calendar = row.yearCalendar; this.mileage = row.mileage ?? null;
    this.transmission = row.transmission ?? null; this.bodyCondition = row.bodyCondition ?? null;
    this.history(`${this.scope}-listing`, row.id);
  }
  get allTrims(): string[] { return [...new Set(this.catalog.models.flatMap(x => x.trims.map(t => t.name)).filter(x => x !== "نام‌محور"))].sort(); }
  get identityTrims(): Trim[] { return this.catalog.models.find(m => m.id === this.identityModel)?.trims ?? []; }
  saveIdentity(): void { if (this.identity && this.identityModel) this.mutate(`listings/${this.scope}/${this.identity.id}/identity`, {
    modelId: this.identityModel, trimId: this.identityTrim, year: this.identityYear, yearCalendar: this.identityYear == null ? null : this.calendar,
    mileage: this.mileage, transmission: this.transmission, bodyCondition: this.bodyCondition, reason: this.reason }, true); }
  modelEdit(model?: Model): void { this.editModelId = model?.id ?? 0; this.modelName = model?.name ?? ''; this.modelAliases = model?.aliases ?? ''; this.companyId = model?.companyId ?? null; }
  modelSave(): void { this.mutate(`catalog/models/${this.editModelId}`, { name: this.modelName, aliases: this.modelAliases, companyId: this.companyId, reason: this.reason }, true); }
  trimEdit(model: Model, trim?: Trim): void { this.trimModelId = model.id; this.editTrimId = trim?.id ?? 0; this.trimName = trim?.name ?? ''; this.trimAliases = trim?.aliases ?? ''; this.trimTransmission = trim?.transmission ?? null; }
  trimSave(): void { if (this.trimModelId) this.mutate(`catalog/trims/${this.editTrimId}`, { modelId: this.trimModelId, name: this.trimName, aliases: this.trimAliases, transmission: this.trimTransmission, reason: this.reason }, true); }
  recalculate(): void { this.reason ||= 'بازمحاسبه درخواست‌شده توسط مدیر'; this.mutate(`recalculate/${this.scope}`, {}); }
  next(offset: number): void { this.page = Math.max(0, this.page + offset); this.load(); }
  label(value: string | null): string { return ({ SingleSource: 'تک‌منبعی؛ اطمینان پایین', Low: 'پایین', UnknownTrim: 'تیپ نامشخص', IdentityNeedsReview: 'مشخصات قبلی نیازمند بررسی است', 'نام‌محور': 'تیپ نامشخص', Approved: 'تأییدشده', Rejected: 'ردشده', Unreviewed: 'بررسی نشده', Calculated: 'محاسبه‌شده', Unavailable: 'غیرقابل انتشار', Jalali: 'شمسی', Gregorian: 'میلادی' } as Record<string,string>)[value ?? ''] ?? value ?? 'نامشخص'; }
  overrideActive(price: Price): boolean { return price.manualOverridePrice != null && (!price.manualOverrideUntil || new Date(this.utc(price.manualOverrideUntil)!).getTime() > Date.now()); }
  currencyLabel(value: string | null | undefined): string { return value === 'IRT' ? 'تومان' : value === 'IRR' ? 'ریال' : 'واحد نامشخص'; }
  utc(value: string | null | undefined): string | null { return value ? /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z` : null; }
  fail(error: HttpErrorResponse): void { this.error = apiErrorMessage(error); }
}
