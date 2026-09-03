import "./ssr-globals";

import React from "react";
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { PassThrough } from "node:stream";
import App from "./App";

// Called once per request by the server (server.js in dev, api/ssr.js on Vercel).
// StaticRouter is the SSR counterpart to BrowserRouter — it takes the requested
// URL as a prop instead of reading window.location (which does not exist here).
export function render(url, cookieHeader) {
  return new Promise((resolve, reject) => {
    globalThis.__cookieHeader = cookieHeader;
    let didError = false;

    const stream = new PassThrough();
    let body = "";

    stream.on("data", (chunk) => {
      body += chunk.toString();
    });

    stream.on("end", () => {
      globalThis.__cookieHeader = undefined;
      resolve({ html: body, didError });
    });

    stream.on("error", (err) => {
      globalThis.__cookieHeader = undefined;
      reject(err);
    });

    const { pipe, abort } = renderToPipeableStream(
      <React.StrictMode>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </React.StrictMode>,
      {
        onAllReady() {
          pipe(stream);
        },
        onShellError(error) {
          globalThis.__cookieHeader = undefined;
          reject(error);
        },
        onError(error) {
          didError = true;
          console.error("SSR rendering error:", error);
        },
      }
    );

    // Timeout safety: if something suspends indefinitely, abort after 5s
    setTimeout(() => {
      abort();
    }, 5000);
  });
}

