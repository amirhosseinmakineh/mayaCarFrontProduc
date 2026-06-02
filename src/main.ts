import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, {
  // حفظ تنظیمات موجود در appConfig
  ...appConfig,

  // الحاق providerهای جدید
  providers: [
    // اگر در appConfig.providers چیزی هست نگه می‌دارد
    ...(appConfig.providers || []),

    // اضافه کردن انیمیشن‌ها و ngx-toastr
    importProvidersFrom(
      ToastrModule.forRoot({
        timeOut: 3000,
        positionClass: 'toast-top-right',
        preventDuplicates: true
      })
    )
  ]
})
.catch(err => console.error(err));
