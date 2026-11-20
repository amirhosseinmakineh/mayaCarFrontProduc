import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface CatalogCar {
  id: number;
  imageName?: string;
  name: string;
  companyId: number | null;
  company: string | null;
  carModelId: number | null;
  model: string | null;
  tipId: number | null;
  tip: string | null;
  eligibleForTelegramComparison: boolean;
}
interface CatalogResponse {
  totalCars: number;
  eligibleCars: number;
  excludedCars: number;
  missingCompany: number;
  filteredCount: number;
  pageNumber: number;
  pageSize: number;
  items: CatalogCar[];
}

@Component({
  selector: 'app-admin-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="catalog" dir="rtl">
      <header class="hero">
        <div><small>مدیریت داده‌های پایه</small><h1>کاتالوگ خودروها</h1>
          <p>خودروهای موجود در دیتابیس؛ مستقل از اینکه در اسکن تلگرام قیمت مرجع دریافت کرده باشند.</p>
        </div>
        <button type="button" (click)="load()" [disabled]="loading">↻ بروزرسانی</button>
      </header>

      <div class="metrics">
        <article><span>کل خودروهای ثبت‌شده</span><strong>{{ data?.totalCars ?? '—' }}</strong></article>
        <article><span>قابل ورود به مقایسه</span><strong>{{ data?.eligibleCars ?? '—' }}</strong></article>
        <article><span>فاقد مدل یا تیپ</span><strong>{{ data?.excludedCars ?? '—' }}</strong></article>
        <article><span>فاقد شرکت</span><strong>{{ data?.missingCompany ?? '—' }}</strong></article>
      </div>

      <div class="panel">
        <div class="toolbar">
          <form (ngSubmit)="searchCars()">
            <input name="search" [(ngModel)]="search" placeholder="جست‌وجو با شناسه، نام، مدل، تیپ یا شرکت" aria-label="جست‌وجوی کاتالوگ">
            <button type="submit" [disabled]="loading">جست‌وجو</button>
          </form>
          <span>{{ data?.filteredCount ?? 0 }} خودرو</span>
        </div>
        <p class="error" *ngIf="error" role="alert">{{ error }}</p>
        <p *ngIf="imageMessage" role="status">{{ imageMessage }}</p>
        <p *ngIf="loading" class="empty">در حال بارگذاری کاتالوگ…</p>
        <div class="table-wrap" *ngIf="!loading">
          <table>
            <thead><tr><th>شناسه</th><th>نام خودرو</th><th>شرکت</th><th>مدل</th><th>تیپ</th><th>وضعیت مقایسه</th><th>عکس خودرو</th></tr></thead>
            <tbody>
              <tr *ngFor="let car of data?.items">
                <td>{{ car.id }}</td><td>{{ car.name || '—' }}</td>
                <td>{{ car.company || 'ثبت نشده' }}</td><td>{{ car.model || 'ثبت نشده' }}</td>
                <td>{{ car.tip || 'ثبت نشده' }}</td>
                <td><span class="pill" [class.warn]="!car.eligibleForTelegramComparison">{{ car.eligibleForTelegramComparison ? 'قابل مقایسه' : 'مدل یا تیپ ناقص' }}</span></td>
                <td>
                  <a *ngIf="car.imageName" [href]="imageUrl(car.imageName)" target="_blank" rel="noopener">مشاهده عکس</a>
                  <label>
                    تغییر عکس
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      [disabled]="uploadingId !== null" (change)="uploadImage(car, $event)">
                  </label>
                </td>
              </tr>
              <tr *ngIf="!data?.items?.length"><td colspan="7" class="empty">خودرویی برای نمایش وجود ندارد.</td></tr>
            </tbody>
          </table>
        </div>
        <footer>
          <button type="button" (click)="changePage(-1)" [disabled]="loading || page === 0">صفحه قبل</button>
          <span>صفحه {{ page + 1 }} از {{ totalPages }}</span>
          <button type="button" (click)="changePage(1)" [disabled]="loading || page + 1 >= totalPages">صفحه بعد</button>
        </footer>
      </div>
    </section>
  `,
  styles: [`
    :host{display:block;color:#5f4714}.catalog{max-width:1450px;margin:auto}
    .hero,.panel{background:#fff;border:1px solid #eee3c8;border-radius:20px;padding:22px}
    .hero{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;background:linear-gradient(120deg,#fff,#fff7df)}
    .hero small{color:#a17b22;font-weight:800}.hero h1{font-size:25px;margin:8px 0}.hero p{color:#806d4c;line-height:1.9;margin:0}
    button{font:inherit;font-weight:800;border:1px solid #d9c28c;border-radius:12px;padding:10px 17px;background:#a98127;color:#fff;cursor:pointer}
    button:disabled{opacity:.5;cursor:not-allowed}
    .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}
    .metrics article{background:#fff;border:1px solid #eee3c8;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px}
    .metrics span{color:#806d4c;font-size:13px}.metrics strong{font-size:27px}
    .toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}
    form{display:flex;gap:8px;flex:1;max-width:670px}input{font:inherit;flex:1;min-width:0;border:1px solid #e3d4b2;border-radius:12px;padding:11px 14px}
    .table-wrap{overflow-x:auto}table{width:100%;min-width:740px;border-collapse:collapse;text-align:right}
    th,td{padding:13px;border-bottom:1px solid #f0e8d6;font-size:13px}th{background:#fbf6e9}
    .pill{display:inline-block;padding:6px 11px;border-radius:999px;background:#e7f7ed;color:#167342;font-weight:800}
    .pill.warn{background:#fff1d5;color:#986200}.error{background:#fff0ef;color:#a52e2e;padding:12px;border-radius:10px}
    .empty{text-align:center;padding:26px;color:#806d4c}footer{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:18px}
    @media(max-width:850px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:540px){.hero,.panel{padding:15px}.hero h1{font-size:21px}.metrics{gap:8px}.metrics article{padding:12px}.metrics strong{font-size:22px}form{width:100%}}
  `]
})
export class CatalogComponent implements OnInit {
  private readonly http = inject(HttpClient);
  data: CatalogResponse | null = null;
  loading = false;
  uploadingId: number | null = null;
  imageMessage = '';
  error = '';
  search = '';
  page = 0;
  readonly pageSize = 50;
  private pending?: Subscription;
  private requestSequence = 0;

  get totalPages(): number {
    return Math.max(1, Math.ceil((this.data?.filteredCount ?? 0) / this.pageSize));
  }

  ngOnInit(): void { this.load(); }

  searchCars(): void { this.page = 0; this.load(); }

  changePage(direction: number): void {
    const next = this.page + direction;
    if (next < 0 || next >= this.totalPages) return;
    this.page = next;
    this.load();
  }

  imageUrl(path: string): string {
    return /^https?:\/\//i.test(path) ? path : `https://api.mayakhodro.com/${path.replace(/^\//, '')}`;
  }

  uploadImage(car: CatalogCar, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploadingId !== null) return;

    const form = new FormData();
    form.append('image', file);
    this.uploadingId = car.id;
    this.imageMessage = '';
    this.http.put<{ imageName: string }>(`${environment.apiUrl}/car/${car.id}/image`, form).subscribe({
      next: ({ imageName }) => {
        car.imageName = imageName;
        this.uploadingId = null;
        this.imageMessage = `عکس خودرو ${car.name} ذخیره شد.`;
      },
      error: () => {
        this.uploadingId = null;
        this.imageMessage = `ذخیرهٔ عکس خودرو ${car.name} ناموفق بود.`;
      }
    });
  }

  load(): void {
    this.pending?.unsubscribe();
    const sequence = ++this.requestSequence;
    this.loading = true;
    this.error = '';
    const params = new HttpParams()
      .set('pageNumber', this.page)
      .set('pageSize', this.pageSize)
      .set('search', this.search.trim());
    this.pending = this.http.get<CatalogResponse>(`${environment.apiUrl}/admin/catalog`, { params }).subscribe({
      next: result => { if (sequence !== this.requestSequence) return; this.data = result; this.loading = false; },
      error: (err: HttpErrorResponse) => {
        if (sequence !== this.requestSequence) return;
        this.loading = false;
        this.error = err.status === 403 ? 'دسترسی به کاتالوگ مجاز نیست.'
          : err.status === 401 ? 'برای مشاهده کاتالوگ دوباره وارد حساب مدیر شوید.'
          : 'دریافت اطلاعات کاتالوگ ناموفق بود. لطفاً دوباره تلاش کنید.';
      }
    });
  }
}
