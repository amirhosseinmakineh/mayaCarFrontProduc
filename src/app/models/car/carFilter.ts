export interface CarFilter {
  minPrice?: number;
  maxPrice?: number;
  company?: string;
  companyId?: number;
  modelId?: number;
  pageSize?: number;
  pageNumber?: number;
}
