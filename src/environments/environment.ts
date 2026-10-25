// Browser requests stay on the frontend origin. The SSR server proxies these
// paths to the backend over Runflare's internal HTTP route.
const apiUrl = typeof window === 'undefined'
  ? 'http://api.mayakhodro.com/api'
  : '/api';

export const environment = {
  production: true,
  apiUrl,
};
