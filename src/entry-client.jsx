import React from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "@fontsource/plus-jakarta-sans";

// Vite's canonical dynamic chunk failure handler:
// If a user has a tab open across a Railway redeployment, an old JS chunk hash no longer
// exists (HTTP 404). Automatically reload once cleanly to fetch new HTML and latest bundle hashes.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const retryKey = "vite_chunk_reload_attempted";
  if (!sessionStorage.getItem(retryKey)) {
    sessionStorage.setItem(retryKey, "true");
    window.location.reload();
  }
});

// Clear retry guard once the application mounts and runs stably
setTimeout(() => {
  sessionStorage.removeItem("vite_chunk_reload_attempted");
}, 10000);

// hydrateRoot (not createRoot): the server already sent real markup, so we
// attach event listeners to the existing DOM instead of re-rendering from
// scratch. BrowserRouter lives here (not in App) so the same App component
// tree works under StaticRouter on the server.
hydrateRoot(
  document.getElementById("root"),
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
