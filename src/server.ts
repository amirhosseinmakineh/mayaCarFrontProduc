import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';

import express from 'express';
import http from 'node:http';
import https from 'node:https';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

const angularApp = new AngularNodeAppEngine();

const backendOrigin = process.env['API_PROXY_TARGET'] || 'http://api.mayakhodro.com';
const proxiedPathPrefixes = ['/api', '/images', '/WeatherForecast'];

// Keep browser traffic on mayakhodro.com. Runflare permits the frontend
// service to reach the backend through its internal HTTP endpoint, while the
// public HTTPS endpoint can time out for users on some Iranian networks.
app.use(async (req, res, next) => {
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
    request.on('error', next);
    req.on('aborted', () => request.destroy());

    if (req.method === 'GET' || req.method === 'HEAD') {
      request.end();
    } else {
      req.pipe(request);
    }
  } catch (error) {
    next(error);
  }
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next()
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {

  const port = Number(process.env['PORT']) || 3000;
  const host = process.env['HOST'] || '0.0.0.0';

  app.listen(port, host, () => {
    console.log(`Node server listening on http://${host}:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
