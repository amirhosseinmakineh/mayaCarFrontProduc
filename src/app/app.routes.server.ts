import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Load data-dependent and authenticated pages in the browser so remote API
  // availability does not block the server-rendered response.
  { path: 'carList', renderMode: RenderMode.Client },
  { path: 'usedCarList', renderMode: RenderMode.Client },
  { path: 'carDetail/:carId', renderMode: RenderMode.Client },
  { path: 'adminDashboard/**', renderMode: RenderMode.Client },
  { path: 'userPannel', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
