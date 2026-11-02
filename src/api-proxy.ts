import type { RequestHandler } from 'express';
import http from 'node:http';
import https from 'node:https';

export const DEFAULT_API_PROXY_TARGET = 'https://api.mayakhodro.com';

export function createApiProxy(backendOrigin = process.env['API_PROXY_TARGET'] || DEFAULT_API_PROXY_TARGET): RequestHandler {
const proxiedPathPrefixes = ['/api', '/images', '/WeatherForecast'];

// Browser requests stay same-origin. The server connects directly to HTTPS;
// returning the public HTTP-to-HTTPS redirect would strip browser Authorization.
return (req, res, next) => {
  const requestPath = req.path;
  const shouldProxy = proxiedPathPrefixes.some(
    (prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}/`),
  );

  if (!shouldProxy) {
    next();
    return;
  }

  try {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key === 'host' || key === 'content-length' || key === 'connection') {
        continue;
      }

      if (value) {
        headers[key] = Array.isArray(value) ? value.join(',') : value;
      }
    }

    const upstreamUrl = new URL(req.originalUrl, backendOrigin);
    const request = (upstreamUrl.protocol === 'https:' ? https : http).request(
      upstreamUrl,
      { method: req.method, headers },
      (upstream) => {
        // A browser following an API-domain redirect drops Authorization.
        // Treat routing failures as upstream errors, never as expired sessions.
        if ((upstream.statusCode || 0) >= 300 && (upstream.statusCode || 0) < 400 && upstream.headers.location) {
          upstream.resume();
          res.status(502).json({ code: 'API_PROXY_REDIRECT', message: 'مسیر ارتباط با سرور نیاز به اصلاح دارد. دوباره وارد شدن مشکل را رفع نمی‌کند.' });
          return;
        }
        res.status(upstream.statusCode || 502);
        for (const [key, value] of Object.entries(upstream.headers)) {
          if (value && key !== 'connection') {
            res.setHeader(key, value);
          }
        }
        upstream.pipe(res);
      },
    );

    request.setTimeout(15_000, () => {
      request.destroy(new Error('Backend proxy timeout'));
    });
    request.on('error', () => {
      if (!res.headersSent) res.status(502).json({ code: 'API_PROXY_UNAVAILABLE', message: 'ارتباط با سرور برقرار نشد. کمی بعد دوباره تلاش کنید.' });
      else res.destroy();
    });
    req.on('aborted', () => request.destroy());

    if (req.method === 'GET' || req.method === 'HEAD') {
      request.end();
    } else {
      req.pipe(request);
    }
  } catch (error) {
    next(error);
  }
};
}
