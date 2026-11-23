import type { RequestHandler } from 'express';
import http from 'node:http';
import https from 'node:https';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

export const DEFAULT_API_PROXY_TARGET = 'https://api.mayakhodro.com';
const proxiedPathPrefixes = ['/api', '/images', '/WeatherForecast'];
const hopByHopHeaders = [
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
];

export function createApiProxy(
  backendOrigin = process.env['API_PROXY_TARGET'] || DEFAULT_API_PROXY_TARGET,
  timeoutMilliseconds = 60_000,
  uploadTimeoutMilliseconds = Math.max(timeoutMilliseconds, 120_000),
): RequestHandler {
  const origin = new URL(backendOrigin);
  if (origin.protocol !== 'http:' && origin.protocol !== 'https:') {
    throw new Error('API proxy target must use HTTP or HTTPS');
  }

  return (req, res, next) => {
    const path = req.path;
    if (!proxiedPathPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) {
      next();
      return;
    }

    const requestId = randomUUID();
    const method = req.method;
    const upload = method === 'PUT' && (/^\/api\/admin\/catalog\/model-images(?:\/|$)/.test(path) || /^\/api\/car\/\d+\/image\/?$/i.test(path));
    const started = performance.now();
    let stage = 'UpstreamConnection';
    let failureCode: string | undefined;
    let upstreamStatus: number | undefined;
    let logged = false;

    function logResult(statusCode: number) {
      if (logged) return;
      logged = true;
      if (!upload && statusCode < 500) return;
      const event = JSON.stringify({ event: 'api_proxy_request', requestId, method, path,
        statusCode, upstreamStatus, durationMs: Math.round(performance.now() - started),
        failureStage: statusCode >= 400 ? stage : undefined, failureCode });
      if (statusCode >= 500) console.error(event);
      else console.info(event);
    }

    res.setHeader('X-Request-Id', requestId);
    if (upload) console.info(JSON.stringify({ event: 'api_proxy_upload_received', requestId, method, path }));
    // Reframe the streamed body using Node's HTTP writer. Preserve the known
    // body size and multipart boundary, while stripping hop-by-hop headers.
    const excluded = new Set([...hopByHopHeaders, 'host', 'x-request-id',
      ...(req.headers.connection ?? '').toLowerCase().split(',').map(value => value.trim())]);
    const headers: http.OutgoingHttpHeaders = { 'X-Request-Id': requestId };
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined && !excluded.has(key)) headers[key] = value;
    }

    const upstreamUrl = new URL(origin);
    const queryIndex = req.originalUrl.indexOf('?');
    upstreamUrl.pathname = path;
    upstreamUrl.search = queryIndex < 0 ? '' : req.originalUrl.slice(queryIndex);
    const request = (upstreamUrl.protocol === 'https:' ? https : http).request(
      upstreamUrl,
      { method, headers },
      upstream => {
        upstreamStatus = upstream.statusCode;
        stage = 'UpstreamResponse';
        upstream.once('error', () => fail('UPSTREAM_RESPONSE_ERROR', 502));
        // Following an API-domain redirect drops the browser's Authorization.
        if (upstreamStatus && upstreamStatus >= 300 && upstreamStatus < 400 && upstream.headers.location) {
          upstream.resume();
          failureCode = 'API_PROXY_REDIRECT';
          res.status(502).json({ code: failureCode, message: 'مسیر ارتباط با سرور نیاز به اصلاح دارد. دوباره وارد شدن مشکل را رفع نمی‌کند.' });
          return;
        }

        res.status(upstreamStatus || 502);
        const responseExcluded = new Set([...hopByHopHeaders, 'x-request-id',
          ...(upstream.headers.connection ?? '').toLowerCase().split(',').map(value => value.trim())]);
        for (const [key, value] of Object.entries(upstream.headers)) {
          if (value !== undefined && !responseExcluded.has(key)) res.setHeader(key, value);
        }
        upstream.pipe(res);
      },
    );
    const deadline = setTimeout(() => {
      fail('API_PROXY_TIMEOUT', 504);
      request.destroy();
    }, Math.max(1, upload ? uploadTimeoutMilliseconds : timeoutMilliseconds));
    deadline.unref();

    function fail(code: string, status: number) {
      if (failureCode || res.writableEnded || res.destroyed) return;
      failureCode = code;
      if (res.headersSent) {
        logResult(status);
        res.destroy();
        return;
      }
      for (const key of ['content-length', 'content-encoding', 'content-type']) res.removeHeader(key);
      res.status(status).json({ requestId, code,
        message: status === 504 ? 'مهلت پاسخ سرور پایان یافت. دوباره تلاش کنید.'
          : 'ارتباط با سرور برقرار نشد. کمی بعد دوباره تلاش کنید.' });
    }

    request.once('socket', socket => {
      if (request.reusedSocket) stage = 'ForwardingRequestBody';
      else socket.once(upstreamUrl.protocol === 'https:' ? 'secureConnect' : 'connect', () => {
        if (stage === 'UpstreamConnection') stage = 'ForwardingRequestBody';
      });
    });
    request.once('finish', () => {
      if (stage === 'ForwardingRequestBody') stage = 'WaitingForUpstreamHeaders';
    });
    request.once('error', () => fail('API_PROXY_UNAVAILABLE', 502));
    res.once('finish', () => {
      clearTimeout(deadline);
      logResult(res.statusCode);
    });
    res.once('close', () => {
      clearTimeout(deadline);
      if (!res.writableFinished) {
        failureCode ??= 'CLIENT_DISCONNECTED';
        logResult(499);
        request.destroy();
      }
    });

    if (method === 'GET' || method === 'HEAD') request.end();
    else req.pipe(request);
  };
}
