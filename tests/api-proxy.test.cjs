const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { createApiProxy, DEFAULT_API_PROXY_TARGET } = require('../tmp/api-proxy-test/api-proxy.js');

async function server(handler) {
  const instance = http.createServer(handler);
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${instance.address().port}`, close: () => new Promise(resolve => instance.close(resolve)) };
}
async function fixture(t, upstreamHandler) {
  const upstream = await server(upstreamHandler);
  const app = express();
  app.use(createApiProxy(upstream.origin));
  app.use((req, res) => res.status(404).end());
  const proxy = await server(app);
  t.after(async () => { await proxy.close(); await upstream.close(); });
  return proxy.origin;
}

test('public API target uses HTTPS without an authentication-stripping redirect', () => {
  assert.equal(new URL(DEFAULT_API_PROXY_TARGET).protocol, 'https:');
});
for (const path of ['/api/admin/zero-vehicles/catalog', '/api/admin/telegram-channels/capabilities']) {
  test(`preserves Bearer and query for ${path}`, async t => {
    const origin = await fixture(t, (req, res) => {
      assert.equal(req.headers.authorization, 'Bearer test-session');
      assert.equal(req.url, `${path}?page=2`);
      res.setHeader('Content-Type', 'application/json');
      res.end('{"ok":true}');
    });
    const response = await fetch(`${origin}${path}?page=2`, { headers: { Authorization: 'Bearer test-session' }, redirect: 'manual' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
    assert.deepEqual(await response.json(), { ok: true });
  });
}
test('forwards import POST JSON and authorization unchanged', async t => {
  const body = JSON.stringify({ channel: '@aliajamihavaleh', messageLimit: 20 });
  const origin = await fixture(t, async (req, res) => {
    assert.equal(req.method, 'POST');
    assert.equal(req.headers.authorization, 'Bearer test-session');
    let received = '';
    for await (const chunk of req) received += chunk;
    assert.equal(received, body);
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end('{"id":1}');
  });
  const response = await fetch(`${origin}/api/admin/zero-vehicles/imports`, { method: 'POST', headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' }, body });
  assert.equal(response.status, 202);
});
test('upstream redirect becomes 502 without exposing Location to the browser', async t => {
  const origin = await fixture(t, (req, res) => { res.writeHead(301, { Location: 'https://api.mayakhodro.com/api/admin/zero-vehicles/catalog' }); res.end(); });
  const response = await fetch(`${origin}/api/admin/zero-vehicles/catalog`, { redirect: 'manual' });
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('location'), null);
  assert.equal((await response.json()).code, 'API_PROXY_REDIRECT');
});
test('genuine upstream 401 and authentication challenge are preserved', async t => {
  const origin = await fixture(t, (req, res) => { res.writeHead(401, { 'WWW-Authenticate': 'Bearer error="invalid_token"' }); res.end(); });
  const response = await fetch(`${origin}/api/admin/zero-vehicles/catalog`);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('www-authenticate'), 'Bearer error="invalid_token"');
});
test('upstream connection failure is 502 rather than an invalid-session response', async t => {
  const unused = await server((req, res) => res.end());
  await unused.close();
  const app = express(); app.use(createApiProxy(unused.origin));
  const proxy = await server(app); t.after(proxy.close);
  const response = await fetch(`${proxy.origin}/api/admin/zero-vehicles/catalog`);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, 'API_PROXY_UNAVAILABLE');
});
