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


test('upstream timeout is 504 with a traceable request ID and keeps the session', async t => {
  const upstream = await server(() => {});
  const app = express(); app.use(createApiProxy(upstream.origin, 25));
  const proxy = await server(app);
  t.after(async () => { await proxy.close(); await upstream.close(); });
  const response = await fetch(`${proxy.origin}/api/admin/zero-vehicles/catalog`);
  assert.equal(response.status, 504);
  const body = await response.json();
  assert.equal(body.code, 'API_PROXY_TIMEOUT');
  assert.equal(body.requestId, response.headers.get('x-request-id'));
  assert.ok(body.requestId);
});

test('streams multipart PUT with content length and a shared request ID', async t => {
  const boundary = 'mayacar-test-upload';
  const contentType = `multipart/form-data; boundary=${boundary}`;
  const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="car.jpg"\r\n\r\nimage bytes\r\n--${boundary}--\r\n`);
  let upstreamId;
  const origin = await fixture(t, async (req, res) => {
    assert.equal(req.method, 'PUT');
    assert.equal(req.headers['content-type'], contentType);
    assert.equal(req.headers['content-length'], String(body.length));
    assert.equal(req.headers['transfer-encoding'], undefined);
    assert.equal(req.headers.authorization, 'Bearer test-session');
    upstreamId = req.headers['x-request-id'];
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    assert.deepEqual(Buffer.concat(chunks), body);
    res.setHeader('X-Request-Id', 'unexpected-upstream-id');
    res.end('saved');
  });

  const response = await fetch(`${origin}/api/admin/catalog/model-images/72373`, {
    method: 'PUT', body, headers: { authorization: 'Bearer test-session',
      'content-type': contentType, 'x-request-id': 'untrusted-inbound-value' },
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'saved');
  assert.match(upstreamId, /^[0-9a-f-]{36}$/);
  assert.equal(response.headers.get('x-request-id'), upstreamId);
});

test('upload deadline closes the upstream request after the body was sent', async t => {
  let markClosed;
  const closed = new Promise(resolve => { markClosed = resolve; });
  const upstream = await server((req, res) => {
    res.once('close', markClosed);
    req.resume();
  });
  const app = express();
  app.use(createApiProxy(upstream.origin, 1000, 100));
  const proxy = await server(app);
  t.after(async () => { await proxy.close(); await upstream.close(); });
  const response = await fetch(`${proxy.origin}/api/admin/catalog/model-images/72373`,
    { method: 'PUT', body: new FormData() });
  assert.equal(response.status, 504);
  assert.equal((await response.json()).requestId, response.headers.get('x-request-id'));
  await closed;
});

test('forwards the unified car PATCH as multipart with its upload deadline', async t => {
  const body = new FormData();
  body.append('Id', '42');
  body.append('Image', new Blob(['image bytes'], { type: 'image/jpeg' }), 'car.jpg');

  const upstream = await server(async (req, res) => {
    assert.equal(req.method, 'PATCH');
    assert.equal(req.url, '/api/car');
    assert.equal(req.headers.authorization, 'Bearer test-session');
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const form = await new Response(Buffer.concat(chunks), {
      headers: { 'content-type': req.headers['content-type'] },
    }).formData();
    assert.equal(form.get('Id'), '42');
    assert.equal(form.get('Image').name, 'car.jpg');
    assert.equal(await form.get('Image').text(), 'image bytes');
    await new Promise(resolve => setTimeout(resolve, 250));
    res.end('saved');
  });
  const app = express();
  app.use(createApiProxy(upstream.origin, 100, 5000));
  const proxy = await server(app);
  t.after(async () => { await proxy.close(); await upstream.close(); });

  const response = await fetch(`${proxy.origin}/api/car`, {
    method: 'PATCH', body, headers: { authorization: 'Bearer test-session' },
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'saved');
});

test('closing the downstream client cancels upstream after a complete upload body', async t => {
  let abortClient;
  let markClosed;
  const closed = new Promise(resolve => { markClosed = resolve; });
  const upstream = await server((req, res) => {
    res.once('close', markClosed);
    req.once('end', () => abortClient());
    req.resume();
  });
  const app = express();
  app.use(createApiProxy(upstream.origin, 1000, 1000));
  const proxy = await server(app);
  t.after(async () => { await proxy.close(); await upstream.close(); });
  const request = http.request(`${proxy.origin}/api/admin/catalog/model-images/72373`,
    { method: 'PUT' });
  request.on('error', () => {});
  abortClient = () => request.destroy();
  request.end('body');
  await closed;
});
