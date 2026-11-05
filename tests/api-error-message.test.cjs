const { test } = require('node:test');
const assert = require('node:assert/strict');
const { apiErrorMessage } = require('../tmp/api-proxy-test/app/services/api-error-message.js');

for (const [status, part] of [[0, 'شبکه'], [401, 'ورود'], [403, 'اجازه'], [504, 'مهلت'], [408, 'مهلت'], [429, 'زیاد'], [500, 'سرور'], [404, 'پیدا نشد']]) {
  test(`explains HTTP ${status} without confusing it with empty data`, () => {
    assert.ok(apiErrorMessage({ status, error: null }).includes(part));
  });
}
test('validation field messages are preserved', () => {
  assert.equal(apiErrorMessage({ status: 400, error: { errors: { Year: ['سال نامعتبر است'], Trim: ['تیپ را انتخاب کنید'] } } }), 'سال نامعتبر است تیپ را انتخاب کنید');
});
test('proxy/server diagnostics intended for users are retained', () => {
  assert.equal(apiErrorMessage({ status: 502, error: { code: 'API_PROXY_REDIRECT', message: 'مسیر نیاز به اصلاح دارد' } }), 'مسیر نیاز به اصلاح دارد');
});
