import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import '@fontsource/plus-jakarta-sans';

// hydrateRoot (not createRoot): the server already sent real markup, so we
// attach event listeners to the existing DOM instead of re-rendering from
// scratch. BrowserRouter lives here (not in App) so the same App component
// tree works under StaticRouter on the server.
hydrateRoot(
  document.getElementById('root'),
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
