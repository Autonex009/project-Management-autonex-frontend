// IMPORTANT: ssr-globals must be the first import so its browser-global stubs
// are installed before App's module graph is evaluated (ES imports run in order).
import './ssr-globals';

import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';

// Called once per request by the server (server.js in dev, api/ssr.js on Vercel).
// StaticRouter is the SSR counterpart to BrowserRouter — it takes the requested
// URL as a prop instead of reading window.location (which does not exist here).
// cookieHeader is accepted now but only becomes load-bearing in Phase 2
// (cookie-based auth); Phase 1 renders public pages fully and protected pages
// as empty (ProtectedRoute's <Navigate> renders null during renderToString).
export function render(url, cookieHeader) {
  // Store the cookie header globally so that useAuth can access it on the server
  globalThis.__cookieHeader = cookieHeader;
  try {
    const html = renderToString(
      <React.StrictMode>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </React.StrictMode>
    );
    return { html };
  } finally {
    // Clean up to prevent memory leaks or cross-request pollution
    globalThis.__cookieHeader = undefined;
  }
}
