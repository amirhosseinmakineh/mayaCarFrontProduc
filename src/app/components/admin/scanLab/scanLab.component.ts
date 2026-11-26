import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, ChangeDetectorRef, OnDestroy, inject } from '@angular/core';
import { Subscription, finalize, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface ScanResult { items: {id:number;carName:string|null}[]; totalCount:number; page:number; sql:string; executedSql:string; }
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section dir="rtl">
      <h1>آزمایشگاه اسکن خودرو</h1>
      <h2>مرحله ۱: استخراج خط اول پیام</h2>
      <p>فقط خواندنی؛ بدون تغییر آرشیو یا خودروها</p>
      <h3>ادیتور SQL (فقط خواندنی)</h3>
      <textarea dir="ltr" [(ngModel)]="editorSql" rows="12" spellcheck="false" style="width:100%;box-sizing:border-box;font-family:monospace"></textarea>
      <button (click)="execute()" [disabled]="loading || !editorSql.trim()">Execute</button>
      <button (click)="editorSql=initialSql" [disabled]="loading">بازنشانی</button>
      <div *ngIf="editorResult as output" style="overflow:auto">
        <p>تعداد خروجی: {{ output.rowCount }} — زمان: {{ output.elapsedMs }} ms</p>
        <p *ngIf="output.truncated">خروجی به ۵۰۰ ردیف محدود شده است.</p>
        <table><thead><tr><th *ngFor="let column of output.columns">{{ column }}</th></tr></thead>
        <tbody><tr *ngFor="let row of output.rows"><td *ngFor="let cell of row">{{ cell === null ? 'NULL' : cell }}</td></tr></tbody></table>
      </div>
      <h3>کوئری ثابت مرحله اول</h3>
      <pre dir="ltr">{{ result?.sql || initialSql }}</pre>
      <button (click)="run(1)" [disabled]="loading">اجرای مرحله اول</button>
      <p *ngIf="loading">در حال دریافت…</p>
      <p *ngIf="error" role="alert">{{ error }}</p>
      <ng-container *ngIf="result as data">
        <h3>SQL تولیدشده برای اجرا (همراه صفحه‌بندی)</h3>
        <pre dir="ltr">{{ data.executedSql || 'در پاسخ سرور موجود نیست' }}</pre>
        <p>تعداد کل: {{ data.totalCount }} — صفحه {{ data.page }}</p>
        <p *ngIf="!data.items.length">هیچ رکوردی در این صفحه برنگشت.</p>
        <table><thead><tr><th>شناسه</th><th>نام استخراج‌شده</th></tr></thead>
        <tbody><tr *ngFor="let row of data.items"><td>{{ row.id }}</td><td>{{ row.carName || '—' }}</td></tr></tbody></table>
        <button (click)="run(data.page-1)" [disabled]="loading || data.page<=1">قبلی</button>
        <button (click)="run(data.page+1)" [disabled]="loading || data.page*10>=data.totalCount">بعدی</button>
      </ng-container>
    </section>`,
  styles: [`section{padding:16px;min-width:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;background:#f5f5f5;color:#222;padding:14px;border-radius:8px;font-size:13px}table{width:100%;border-collapse:collapse;margin:12px 0}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:right;overflow-wrap:anywhere}button{padding:10px 16px;margin:4px;border:1px solid #b79a60;border-radius:8px;background:white;color:#60491e}button:disabled{opacity:.5}`]
})
export class ScanLabComponent implements OnDestroy {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private request?: Subscription;
  loading = false; error = ''; result: ScanResult | null = null;
  initialSql = `SELECT CAST(Id AS bigint) AS Id,
    TRIM(REPLACE(LEFT(MessageText, CHARINDEX(CHAR(10), MessageText + CHAR(10)) - 1), CHAR(13), '')) AS CarName
FROM dbo.TelegramRawMessages`;
  editorSql = this.initialSql;
  editorResult: {columns:string[];rows:(string|null)[][];rowCount:number;elapsedMs:number;truncated:boolean} | null = null;
  execute():void {
    if(this.loading || !this.editorSql.trim()) return;
    this.loading=true; this.error=''; this.editorResult=null;
    const url=environment.apiUrl.replace(/\/$/, '')+'/admin/telegram/scan-lab/query';
    this.request=this.http.post<NonNullable<ScanLabComponent['editorResult']>>(url,{sql:this.editorSql})
      .pipe(timeout(20000),finalize(()=>{this.loading=false;this.cdr.markForCheck();}))
      .subscribe({next:data=>{this.editorResult=data;},error:err=>{this.error=err.error?.message || 'خطا در اجرای SQL (HTTP '+(err.status || 0)+')';}});
  }
  run(page:number):void {
    if(this.loading || page<1) return;
    this.loading=true; this.error='';
    const url=environment.apiUrl.replace(/\/$/, '')+'/admin/telegram/scan-lab/step1';
    this.request=this.http.get<ScanResult>(url,{params:new HttpParams().set('page',page).set('pageSize',10)})
      .pipe(timeout(20000),finalize(()=>{this.loading=false;this.cdr.markForCheck();}))
      .subscribe({next:data=>{this.result=data;},error:err=>{this.error='خطا در دریافت خروجی (HTTP '+(err.status || 0)+')';}});
  }
  ngOnDestroy():void { this.request?.unsubscribe(); }
}
