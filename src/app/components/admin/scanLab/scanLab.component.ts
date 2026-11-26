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
      <p>کنسول SQL مدیریت دیتابیس</p>
      <p class="warning">دستورات SQL می‌توانند داده‌ها را تغییر دهند یا حذف کنند.</p>
      <div class="toolbar">
        <button class="primary" (click)="execute()" [disabled]="loading || !editorSql.trim()">▶ اجرا</button>
        <button (click)="copy()" [disabled]="!editorSql">کپی</button>
        <button (click)="paste()" [disabled]="loading">پیست</button>
        <button (click)="editorSql=''; editorResult=null; error=''; notice='کوئری پاک شد'" [disabled]="loading">پاک کردن کل</button>
        <button (click)="editorSql=initialSql" [disabled]="loading">بازنشانی</button>
      </div>
      <textarea class="sql-input" dir="ltr" [(ngModel)]="editorSql" rows="12" spellcheck="false" [disabled]="loading" aria-label="SQL query" (keydown.control.enter)="execute()" (keydown.meta.enter)="execute()"></textarea>
      <p *ngIf="notice" role="status">{{ notice }}</p>
      <p *ngIf="loading">در حال اجرا…</p>
      <p *ngIf="error" class="error" role="alert">{{ error }}</p>
      <div *ngIf="editorResult as output" class="results">
        <p>تعداد خروجی: {{ output.rowCount }} — زمان: {{ output.elapsedMs }} ms</p>
        <p *ngIf="output.truncated">خروجی به ۱۰٬۰۰۰ ردیف محدود شده است.</p>
        <p *ngIf="!output.rows.length">هیچ ردیفی برنگشت.</p><div class="table-scroll"><table><thead><tr><th *ngFor="let column of output.columns">{{ column }}</th></tr></thead>
        <tbody><tr *ngFor="let row of output.rows"><td *ngFor="let cell of row">{{ cell === null ? 'NULL' : cell }}</td></tr></tbody></table></div>
      </div>
    </section>`,
  styles: [`
:host{display:block;min-width:0;width:100%;max-width:100%;box-sizing:border-box}
section{box-sizing:border-box;width:100%;max-width:100%;min-width:0;padding:clamp(12px,3vw,24px);background:#fff;border:1px solid #e6d9bf;border-radius:16px}
h1{font-size:clamp(19px,4vw,26px);margin:0 0 8px}
.warning{font-size:13px;color:#805315;background:#fff7e6;padding:10px;border-radius:8px}
.toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
.toolbar button{flex:0 1 auto;margin:0;min-height:44px;padding:8px 14px;border:1px solid #d6c6a6;border-radius:9px;background:#fff;color:#60491e;font-size:14px;cursor:pointer}
.toolbar button.primary{background:#80601e;color:#fff;border-color:#80601e}
.toolbar button:disabled{opacity:.45;cursor:default}
section textarea.sql-input{display:block;width:100%;max-width:100%;box-sizing:border-box;font:14px/1.7 monospace!important;background:#18212d!important;color:#e5edf5!important;border:1px solid #354457!important;border-radius:10px;padding:14px;resize:vertical;text-align:left!important;direction:ltr;min-height:240px;white-space:pre;overflow:auto}
.error{color:#a32929;background:#fff1f1;padding:12px;border-radius:8px;overflow-wrap:anywhere}
.results{min-width:0;max-width:100%;margin-top:16px}
.table-scroll{width:100%;max-width:100%;overflow:auto;max-height:60vh;border:1px solid #e6d9bf;border-radius:8px}
table{width:max-content;min-width:100%;border-collapse:separate;border-spacing:0}
td,th{padding:10px 14px;border-bottom:1px solid #eee;text-align:start;white-space:nowrap;overflow-wrap:normal;min-width:80px}
th{position:sticky;top:0;background:#f6f1e8;z-index:1}tbody tr:nth-child(even){background:#faf9f6}
@media(max-width:600px){.toolbar button{flex:1 1 28%}.toolbar button.primary{flex-basis:100%}section textarea.sql-input{font-size:16px!important}td,th{padding:8px 10px}}
`]
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
      .subscribe({next:data=>{this.editorResult=data;},error:err=>{this.error=err.error?.message || (err.status === 503 ? 'سرویس اجرای SQL در دسترس نیست؛ اتصال دیتابیس و تنظیمات سرور را بررسی کنید.' : 'خطا در اجرای SQL (HTTP '+(err.status || 0)+')');}});
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
