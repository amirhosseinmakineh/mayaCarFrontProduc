export interface CarFilter {
  minPrice?: number; maxPrice?: number; company?: string; model?: string; trim?: string; year?: number;
  minMileage?: number; maxMileage?: number; sort?: string; pageSize?: number; pageNumber?: number; isUsed?: boolean;
}
