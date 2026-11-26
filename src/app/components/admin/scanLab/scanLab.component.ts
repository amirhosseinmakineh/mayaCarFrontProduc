import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ChangeDetectorRef, OnDestroy, inject } from '@angular/core';
import { Subscription, finalize, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section dir="rtl">
      <h1>آزمایشگاه اسکن خودرو</h1>
      <p>محیط اجرای کوئری‌های فقط خواندنی</p>
      <div class="toolbar">
        <button class="primary" (click)="execute()" [disabled]="loading || !editorSql.trim()">▶ اجرا</button>
        <button (click)="copy()" [disabled]="!editorSql">کپی</button>
        <button (click)="paste()" [disabled]="loading">پیست</button>
        <button (click)="editorSql=''; editorResult=null; error=''; notice='کوئری پاک شد'" [disabled]="loading">پاک کردن کل</button>
        <button (click)="editorSql=initialSql" [disabled]="loading">بازنشانی</button>
      </div>
      <textarea dir="ltr" [(ngModel)]="editorSql" rows="12" spellcheck="false" [disabled]="loading" aria-label="SQL query"></textarea>
      <p *ngIf="notice" role="status">{{ notice }}</p>
      <p *ngIf="loading">در حال اجرا…</p>
      <p *ngIf="error" class="error" role="alert">{{ error }}</p>
      <div *ngIf="editorResult as output" style="overflow:auto">
        <p>تعداد خروجی: {{ output.rowCount }} — زمان: {{ output.elapsedMs }} ms</p>
        <p *ngIf="output.truncated">خروجی به ۵۰۰ ردیف محدود شده است.</p>
        <table><thead><tr><th *ngFor="let column of output.columns">{{ column }}</th></tr></thead>
        <tbody><tr *ngFor="let row of output.rows"><td *ngFor="let cell of row">{{ cell === null ? 'NULL' : cell }}</td></tr></tbody></table>
      </div>
    </section>`,
  styles: [`section{padding:16px;min-width:0;background:#fff;border:1px solid #e6d9bf;border-radius:16px}.toolbar{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.toolbar button{margin:0}.primary{background:#80601e;color:#fff}.error{color:#a32929;background:#fff1f1;padding:12px;border-radius:8px}textarea{width:100%;box-sizing:border-box;font:14px/1.7 monospace;background:#18212d;color:#e5edf5;border:1px solid #354457;border-radius:10px;padding:14px;resize:vertical;text-align:left;direction:ltr;min-height:220px}pre{white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;background:#f5f5f5;color:#222;padding:14px;border-radius:8px;font-size:13px}table{width:max-content;min-width:100%;border-collapse:collapse;margin:12px 0}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:right;white-space:nowrap;overflow-wrap:normal}button{padding:10px 16px;margin:4px;border:1px solid #b79a60;border-radius:8px;background:white;color:#60491e}button:disabled{opacity:.5}`]
})
export class ScanLabComponent implements OnDestroy {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private request?: Subscription;
  loading = false; error = ''; notice = '';
  initialSql = `SELECT CAST(Id AS bigint) AS Id,
    TRIM(REPLACE(LEFT([Text], CHARINDEX(CHAR(10), [Text] + CHAR(10)) - 1), CHAR(13), '')) AS CarName
FROM dbo.TelegramRawArchiveSnapshots`;
  editorSql = this.initialSql;
  editorResult: {columns:string[];rows:(string|null)[][];rowCount:number;elapsedMs:number;truncated:boolean} | null = null;
  execute():void {
    if(this.loading || !this.editorSql.trim()) return;
    this.loading=true; this.error=''; this.editorResult=null;
    const url=environment.apiUrl.replace(/\/$/, '')+'/admin/telegram/scan-lab/query';
    this.request=this.http.post<NonNullable<ScanLabComponent['editorResult']>>(url,{sql:this.editorSql})
      .pipe(timeout(20000),finalize(()=>{this.loading=false;this.cdr.markForCheck();}))
      .subscribe({next:data=>{this.editorResult=data;},error:err=>{this.error=err.error?.message || (err.status === 503 ? 'سرویس اجرای SQL در دسترس نیست؛ اتصال اختصاصی ScanLabReadOnly و تنظیمات سرور را بررسی کنید.' : 'خطا در اجرای SQL (HTTP '+(err.status || 0)+')');}});
  }
  async copy():Promise<void> {
    try { await navigator.clipboard.writeText(this.editorSql); this.notice='کوئری کپی شد'; }
    catch { this.notice='کپی خودکار ممکن نیست؛ متن را انتخاب و کپی کنید.'; }
    this.cdr.markForCheck();
  }
  async paste():Promise<void> {
    try { const value=await navigator.clipboard.readText(); if(!this.loading) this.editorSql=value; this.notice='متن جایگزین شد'; }
    catch { this.notice='دسترسی کلیپ‌بورد ممکن نیست؛ داخل ادیتور Paste کنید.'; }
    this.cdr.markForCheck();
  }
  ngOnDestroy():void { this.request?.unsubscribe(); }
}
