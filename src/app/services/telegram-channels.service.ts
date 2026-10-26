import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TelegramChannel {
  id: number;
  identifier: string;
  username: string;
  publicUrl: string;
  title: string;
  status: string;
  enabled: boolean;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  messagesCollected: number;
  listingsExtracted: number;
  retryCount: number;
  processedListings: number; failedListings: number;
}

export interface TelegramSummary {
  totalChannels: number;
  active: number;
  paused: number;
  errors: number;
  pending: number;
  processing: number;
  messagesCollected: number;
  listingsExtracted: number;
  lastCollection?: string;
  newCars: number; usedCars: number; comparedCars: number; pendingListings: number; rejectedListings: number; missingImageListings: number; missingManufacturerListings: number;
}

export interface TelegramJobLog {
  id: number;
  channelId: number;
  status: string;
  attempt: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface TelegramCapability {
  provider: string;
  publicPreviewEnabled: boolean;
  requiresApiCredentials: boolean;
  supportsPublicUsernames: boolean;
  supportsHistory: boolean;
  message: string;
}

export interface ImportResult {
  total: number;
  created: number;
  duplicates: number;
  invalid: number;
  queued: number;
  invalidEntries: string[];
}

@Injectable({ providedIn: 'root' })
export class TelegramChannelsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/telegram-channels`;

  getObservations(status = '', page = 0): Observable<TelegramObservation[]> {
    return this.http.get<TelegramObservation[]>(`${environment.apiUrl}/admin/telegram-pricing/observations`, {
      params: { status, page },
    });
  }

  getPricingState(): Observable<TelegramPricingState | null> {
    return this.http.get<TelegramPricingState | null>(`${environment.apiUrl}/admin/telegram-pricing/state`);
  }

  getDailyPrices(carId: number | null = null, page = 0): Observable<DailyCarPrice[]> {
    const params: Record<string, string | number> = { page };
    if (carId !== null && carId > 0) {
      params['carId'] = carId;
    }
    return this.http.get<DailyCarPrice[]>(`${environment.apiUrl}/admin/telegram-pricing/prices`, { params });
  }

  preview(channels: string[], messageLimit: number, before: number | null = null): Observable<TelegramPreviewReport[]> {
    return this.http.post<TelegramPreviewReport[]>(`${this.baseUrl}/preview`, { channels, messageLimit, before });
  }

  getAll(): Observable<TelegramChannel[]> {
    return this.http.get<TelegramChannel[]>(this.baseUrl);
  }

  getSummary(): Observable<TelegramSummary> {
    return this.http.get<TelegramSummary>(`${this.baseUrl}/summary`);
  }

  getCapabilities(): Observable<TelegramCapability> {
    return this.http.get<TelegramCapability>(`${this.baseUrl}/capabilities`);
  }

  getJobs(): Observable<TelegramJobLog[]> {
    return this.http.get<TelegramJobLog[]>(`${this.baseUrl}/jobs`);
  }

  import(input: string): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.baseUrl}/import`, { input });
  }

  setEnabled(id: number, enabled: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/enabled`, enabled);
  }

  retry(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/retry`, {});
  }

  test(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/test`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

export interface TelegramObservation {
  id: number;
  carId?: number;
  rawMessageId?: number;
  sourceChannel: string;
  sourceMessageId: string;
  sourceUrl?: string;
  price?: number;
  currency?: string;
  normalizedPrice?: number;
  publishedAt?: string;
  receivedAt?: string;
  priceDay?: string;
  matchStatus: string;
  matchReason?: string;
  manufacturer?: string;
  primaryImageUrl?: string;
  comparisonStatus?: string;
  comparisonAveragePrice?: number;
  comparedChannelCount?: number;
  validPriceSourceCount?: number;
  processingStatus: string;
  reasonCode?: string;
  year?: number;
  mileage?: number;
  isUsed?: boolean;
  trim?: string;
}

export interface DailyCarPrice {
  carId: number;
  name: string;
  marketPrice: number;
  factoryPrice: number;
  priceDay: string;
  sampleCount: number;
  calculatedAt: string;
  isFinal: boolean;
}

export interface TelegramPricingState {
  lastSuccessAt?: string;
  lastAttemptAt?: string;
  lastError?: string;
}

export interface TelegramPreviewListing {
  channelId: string; messageId: string; carName: string | null; trim: string | null;
  year: number | null; yearCalendar: string | null; mileage: number | null; price: number | null;
  currency: string | null; messageUrl: string | null;
}
export interface TelegramPreviewReport {
  channelId: string; requested: number; received: number; carAds: number; pricesExtracted: number;
  pagesFetched: number; nextBefore: number | null; stopReason: string;
  durationMilliseconds: number; success: boolean; error: string | null;
  listings: TelegramPreviewListing[];
}
