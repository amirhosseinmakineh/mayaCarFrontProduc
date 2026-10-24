export function normalizeMobile(value: string): string {
  return value.trim().replace(/[۰-۹٠-٩]/g, digit =>
    String('۰۱۲۳۴۵۶۷۸۹'.includes(digit)
      ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) : '٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

export function authErrorMessage(error: any): string {
  if (error?.name === 'TimeoutError') return 'پاسخ سرور طول کشید؛ دوباره تلاش کنید.';
  if (error?.status === 0) return 'اتصال به سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید.';
  const body = error?.error;
  if (body && typeof body === 'object') {
    if (body.errors) {
      const messages = Object.values(body.errors).flat().filter(value => typeof value === 'string');
      if (messages.length) return messages.join(' ');
    }
    if (typeof body.message === 'string') return body.message;
    if (typeof body.title === 'string') return body.title;
  }
  if (typeof body === 'string' && body.length < 500 && !/<[^>]+>/.test(body)) return body;
  return 'درخواست انجام نشد؛ دوباره تلاش کنید.';
}
