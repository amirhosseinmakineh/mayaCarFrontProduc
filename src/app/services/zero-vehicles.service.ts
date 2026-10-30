import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
export interface ZeroPage<T> { items: T[]; total: number; page: number; pageSize: number; }
export interface ZeroImport {
  id: number; channel: string; status: string; messageLimit: number; before: number | null;
  nextBefore: number | null; pagesFetched: number; stopReason: string; createdAt: string; completedAt: string | null;
  scanned: number; accepted: number; rejected: number; duplicates: number; stored: number; priceGroups: number;
  rejectionCounts: string; error: string | null;
}
export interface ZeroListing {
  id: number; modelId: number; model: string; trimId: number; trim: string; originalName: string;
  priceToman: number; year: number | null; publishedAt: string; receivedAt: string; channel: string;
  externalMessageId: string; sourceUrl: string | null; pricingStatus: string; referencePrice: number | null;
}
export interface ZeroPrice {
  id: number; modelId: number; model: string; trimId: number; trim: string; referencePrice: number;
  minPrice: number; maxPrice: number; sampleCount: number; sourceCount: number; confidence: string; calculatedAt: string;
}
export interface ZeroCatalog { id: number; name: string; trims: { id: number; name: string }[]; }
@Injectable({ providedIn: 'root' })
export class ZeroVehiclesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/zero-vehicles`;
  start(channel: string, messageLimit: number, before: number | null = null) {
    return this.http.post<ZeroImport>(`${this.base}/imports`, { channel, messageLimit, before });
  }
  run(id: number) { return this.http.get<ZeroImport>(`${this.base}/imports/${id}`); }
  runs(page = 0) { return this.http.get<ZeroPage<ZeroImport>>(`${this.base}/imports`, { params: { page, pageSize: 10 } }); }
  catalog() { return this.http.get<ZeroCatalog[]>(`${this.base}/catalog`); }
  listings(filters: { search: string; modelId: number | null; trimId: number | null; status: string; page: number }) {
    let params = new HttpParams().set('pageSize', 10).set('page', filters.page).set('search', filters.search).set('status', filters.status);
    if (filters.modelId != null) params = params.set('modelId', filters.modelId);
    if (filters.trimId != null) params = params.set('trimId', filters.trimId);
    return this.http.get<ZeroPage<ZeroListing>>(`${this.base}/listings`, { params });
  }
  detail(id: number) { return this.http.get<{ listing: ZeroListing; rawText: string }>(`${this.base}/listings/${id}`); }
  prices(search = '', page = 0) { return this.http.get<ZeroPage<ZeroPrice>>(`${this.base}/prices`, { params: { search, page, pageSize: 10 } }); }
  members(id: number, page = 0) { return this.http.get<ZeroPage<ZeroListing>>(`${this.base}/prices/${id}/listings`, { params: { page, pageSize: 10 } }); }
  recalculate() { return this.http.post<{ groups: number }>(`${this.base}/prices/recalculate`, {}); }
}
