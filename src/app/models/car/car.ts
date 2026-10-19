export interface Car {
  id: number;
  isUsed?: boolean;
  categoryName?: string | number;
  tipName?: string;
  carModeName?: string;
  company?: string;
  companyName?: string;
  name: string;
  startDate?: string;
  price?: number;
  marketPrice?: number;
  marketPriceDay?: string;
  priceSampleCount?: number;
  priceCalculatedAt?: string;
  factoryPrice?: number;
  imageName?: string;
  description?: string;
  sourceUrl?: string;
  lastUpdated?: string;
  details?: {
    title?: string;
    description?: string;
    imageUrl?: string;
    images?: string[];
    sections?: Array<{
      name: string;
      specifications: Array<{ name: string; value: string }>;
      paragraphs: string[];
    }>;
  };
}
