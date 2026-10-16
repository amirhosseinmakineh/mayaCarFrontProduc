import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TelegramChannelsService, TelegramChannel, TelegramSummary, ImportResult } from '../../../services/telegram-channels.service';

@Component({ selector: 'app-telegram-channels', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './telegram-channels.component.html', styleUrls: ['./telegram-channels.component.css'] })
export class TelegramChannelsComponent {
  private readonly service = inject(TelegramChannelsService);
  channels: TelegramChannel[] = []; summary?: TelegramSummary; input = ''; result?: ImportResult; loading = false; error = '';
  ngOnInit(): void { this.refresh(); }
  refresh(): void { this.loading = true; this.service.getAll().subscribe({ next: x => this.channels = x, error: e => this.error = e.error?.message ?? 'خطا در دریافت کانال‌ها', complete: () => this.loading = false }); this.service.getSummary().subscribe(x => this.summary = x); }
  importChannels(): void { if (!this.input.trim()) return; this.service.import(this.input).subscribe({ next: x => { this.result = x; this.input = ''; this.refresh(); }, error: e => this.error = e.error?.message ?? 'خطا در import' }); }
  toggle(c: TelegramChannel): void { this.service.setEnabled(c.id, !c.enabled).subscribe(() => this.refresh()); }
  retry(c: TelegramChannel): void { this.service.retry(c.id).subscribe(() => this.refresh()); }
  test(c: TelegramChannel): void { this.service.test(c.id).subscribe(() => this.refresh()); }
  remove(c: TelegramChannel): void { this.service.delete(c.id).subscribe(() => this.refresh()); }
}
