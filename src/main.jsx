import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "@fontsource/plus-jakarta-sans";

window.addEventListener('vite:preloadError', (event) => {
  const chunkFailedMessage = 'chunk_failed_reload';
  if (!sessionStorage.getItem(chunkFailedMessage)) {
    sessionStorage.setItem(chunkFailedMessage, 'true');
    window.location.reload();
  }
});


//check
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
