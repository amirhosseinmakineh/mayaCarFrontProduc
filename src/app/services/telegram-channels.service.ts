import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TelegramChannel { id: number; identifier: string; username: string; publicUrl: string; title: string; status: string; enabled: boolean; lastAttemptAt?: string; lastSuccessAt?: string; lastError?: string; messagesCollected: number; listingsExtracted: number; retryCount: number; }
export interface TelegramSummary { totalChannels: number; active: number; paused: number; errors: number; pending: number; processing: number; messagesCollected: number; listingsExtracted: number; lastCollection?: string; }
export interface ImportResult { total: number; created: number; duplicates: number; invalid: number; queued: number; invalidEntries: string[]; }

@Injectable({ providedIn: 'root' })
export class TelegramChannelsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://api.mayakhodro.com/api/admin/telegram-channels';
  getAll(): Observable<TelegramChannel[]> { return this.http.get<TelegramChannel[]>(this.baseUrl); }
  getSummary(): Observable<TelegramSummary> { return this.http.get<TelegramSummary>(`${this.baseUrl}/summary`); }
  import(input: string): Observable<ImportResult> { return this.http.post<ImportResult>(`${this.baseUrl}/import`, { input }); }
  setEnabled(id: number, enabled: boolean): Observable<void> { return this.http.patch<void>(`${this.baseUrl}/${id}/enabled`, enabled); }
  retry(id: number): Observable<void> { return this.http.post<void>(`${this.baseUrl}/${id}/retry`, {}); }
  test(id: number): Observable<void> { return this.http.post<void>(`${this.baseUrl}/${id}/test`, {}); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}`); }
}
