// Local development / self-hosted production SSR server.
//
// This file is NOT used on Vercel (serverless) — see api/ssr.js for that.
// Both wrap the SAME render() from src/entry-server.jsx.
//
//   npm run dev   -> this file, Vite in middleware mode (HMR works)
//   npm run serve -> this file with NODE_ENV=production, serves dist/
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Production when NODE_ENV says so OR when launched with --prod. The --prod flag
// keeps `npm run serve` cross-platform (PowerShell/cmd cannot set NODE_ENV=x inline).
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');
const PORT = process.env.PORT || 3000;
const PROXY_TARGET = process.env.VITE_PROXY_TARGET || 'http://localhost:8000';

async function main() {
  const app = express();

  // Proxy /api to the backend in both modes (mirrors the old vite.config proxy).
  // pathFilter keeps the middleware mounted at root so the full "/api/..." path
  // is preserved when forwarded (http-proxy-middleware v3+ behaviour).
  app.use(
    createProxyMiddleware({
      pathFilter: '/api',
      target: PROXY_TARGET,
      changeOrigin: true,
    })
  );

  let vite;
  let render;
  let template;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    const { default: sirv } = await import('sirv');
    app.use(sirv(path.resolve(__dirname, 'dist/client'), { extensions: [] }));
    ({ render } = await import('./dist/server/entry-server.js'));
    template = fs.readFileSync(
      path.resolve(__dirname, 'dist/client/index.html'),
      'utf-8'
    );
  }

  // Catch-all page handler. Express 5 no longer accepts a bare '*' path string,
  // so this is a pathless middleware — it runs last, after the proxy and the
  // asset/static middlewares above (which call next() for page requests).
  app.use(async (req, res, next) => {
    // Only handle GET navigations; let other methods fall through.
    if (req.method !== 'GET') return next();
    const url = req.originalUrl;
    try {
      let html;
      
      // 1. Extract and parse JWT cookie
      const cookieHeader = req.headers.cookie || '';
      const tokenMatch = cookieHeader.match(/(?:^|;\s*)access_token=([^;]*)/);
      const token = tokenMatch ? tokenMatch[1] : null;
      
      let ssrAuth = { isAuthenticated: false, role: null, user: null };
      if (token) {
        try {
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
            if (!payload.exp || payload.exp * 1000 >= Date.now()) {
                ssrAuth = { isAuthenticated: true, role: payload.role, user: payload };
            }
        } catch(e) {}
      }

      let modRender, modPrefetch;
      let templateHtml;

      if (!isProd) {
        templateHtml = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        templateHtml = await vite.transformIndexHtml(url, templateHtml);
        const mod = await vite.ssrLoadModule('/src/entry-server.jsx');
        modRender = mod.render;
        modPrefetch = mod.prefetch;
      } else {
        modRender = render;
        const mod = await import('./dist/server/entry-server.js');
        modPrefetch = mod.prefetch;
        templateHtml = template;
      }

      // 2. Prefetch data
      let dehydratedState = null;
      if (modPrefetch && ssrAuth.isAuthenticated) {
          dehydratedState = await modPrefetch(url, token, ssrAuth.user);
      }

      // 3. Render App
      const { html: appHtml } = modRender(url, cookieHeader, ssrAuth, dehydratedState);
      
      // 4. Inject State
      const injectedState = `<script>window.__SSR_AUTH__=${JSON.stringify(ssrAuth)};window.__REACT_QUERY_STATE__=${JSON.stringify(dehydratedState || null)};</script>`;
      
      html = templateHtml.replace('<!--ssr-outlet-->', injectedState + appHtml);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      if (!isProd && vite) vite.ssrFixStacktrace(e);
      console.error(e);
      res.status(500).end(e.message);
    }
  });

  app.listen(PORT, () => {
    console.log(`SSR server running at http://localhost:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

main();
