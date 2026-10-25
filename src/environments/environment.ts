const apiUrl = typeof window === 'undefined'
  ? 'http://api.mayakhodro.com/api'
  : 'https://api.mayakhodro.com/api';

export const environment = {
  production: true,
  apiUrl,
};
