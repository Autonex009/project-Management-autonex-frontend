// Vercel serverless SSR handler (production only).
//
// Vercel is serverless — an Express app.listen() cannot run there, so this
// function IS the production render path. server.js (Express) is only for local
// dev / self-hosting. Both are thin wrappers around the SAME render() in
// src/entry-server.jsx — no duplicated render logic.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../dist/server/entry-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(
  resolve(__dirname, '../dist/client/index.html'),
  'utf-8'
);

export default async function handler(req, res) {
  // If the request is for a static asset that somehow reached SSR (meaning it doesn't exist), return 404
  if (req.url.match(/\.(js|css|ico|png|jpg|jpeg|svg|woff|woff2|ttf|eot)$/i)) {
    res.status(404).end('Not found');
    return;
  }

  try {
    const { html: appHtml } = await render(req.url, req.headers.cookie || '');
    const html = template.replace('<!--ssr-outlet-->', appHtml);
    
    // Ensure HTML is never cached by browser or CDN
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).end(html);
  } catch (e) {
    console.error(e);
    res.status(500).end(e.message);
  }
}
