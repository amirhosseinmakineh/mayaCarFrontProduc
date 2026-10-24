import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'about-us', renderMode: RenderMode.Prerender },
  { path: 'contact-us', renderMode: RenderMode.Prerender },
  // Load data-dependent and authenticated pages in the browser so remote API
  // availability does not block the server-rendered response.
  { path: 'carList', renderMode: RenderMode.Client },
  { path: 'usedCarList', renderMode: RenderMode.Client },
  { path: 'carDetail/:carId', renderMode: RenderMode.Client },
  { path: 'adminDashboard/**', renderMode: RenderMode.Client },
  { path: 'userPannel', renderMode: RenderMode.Client },
  { path: 'installment', renderMode: RenderMode.Client },
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'register', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
