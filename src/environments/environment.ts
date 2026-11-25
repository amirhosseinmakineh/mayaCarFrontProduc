// The default browser API uses the same-origin proxy. Endpoints with a
// dedicated origin use their own configuration.
const apiUrl = typeof window === 'undefined'
  ? 'http://api.mayakhodro.com/api'
  : '/api';

export const environment = {
  production: true,
  apiUrl,
  publicCatalogApiUrl: 'https://api.mayakhodro.com/api',
  telegramReportApiUrl: 'https://api.mayakhodro.com/api',
  catalogImageUploadApiUrl: 'https://api.mayakhodro.com/api',
};
