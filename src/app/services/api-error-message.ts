import type { HttpErrorResponse } from '@angular/common/http';

/** Safe messages for API, proxy and browser failures; empty results are successful responses. */
export function apiErrorMessage(error: HttpErrorResponse): string {
  const message = typeof error.error?.message === 'string' ? error.error.message : undefined;
  if (error.status === 0) return 'اتصال شبکه برقرار نیست یا درخواست به سرور نرسیده است. اتصال را بررسی و دوباره تلاش کنید.';
  if (error.status === 401) return 'ورود شما معتبر نیست؛ دوباره وارد شوید.';
  if (error.status === 403) return 'این حساب اجازهٔ انجام این عملیات را ندارد.';
  if (error.status === 408 || error.status === 504 || error.error?.code === 'API_PROXY_TIMEOUT')
    return message ?? 'مهلت پاسخ سرور پایان یافت. دوباره تلاش کنید.';
  if (error.status === 400 || error.status === 422) {
    const validation = error.error?.errors;
    const details = validation && typeof validation === 'object'
      ? Object.values(validation).flat().filter((value): value is string => typeof value === 'string').join(' ') : '';
    return message ?? (details || 'اطلاعات واردشده معتبر نیست. فیلدها را بررسی کنید.');
  }
  if (error.status === 404) return message ?? 'مورد درخواستی پیدا نشد. فهرست را دوباره بارگذاری کنید.';
  if (error.status === 409) return message ?? 'پردازش دیگری فعال است یا اطلاعات تغییر کرده است؛ دوباره تلاش کنید.';
  if (error.status === 429) return 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.';
  if (error.status >= 500) return message ?? 'سرور نتوانست درخواست را پردازش کند. کمی بعد دوباره تلاش کنید.';
  return message ?? 'انجام درخواست ممکن نشد. دوباره تلاش کنید.';
}
