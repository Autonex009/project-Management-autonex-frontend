// Server-only browser-global stubs.
//
// This module MUST be imported before any application code on the server.
// ES module imports are evaluated in order, so importing this file first in
// entry-server.jsx guarantees these stubs exist before App (and its transitive
// imports such as services/api.js) are evaluated or rendered.
//
// ~37 files across the app read localStorage/sessionStorage during module
// evaluation or render. In Node there is no such global, so renderToString
// would throw "localStorage is not defined". Stubbing them centrally here means
// none of those files need to be touched. On the client this file is never
// imported, so real browser storage is used unchanged.

// Assign UNCONDITIONALLY (not gated on `=== undefined`). Node 18/20/22 have no
// localStorage global, but Node 21+ ships an experimental Web Storage that emits
// an ExperimentalWarning and needs a --localstorage-file flag to function. We do
// not want that — we want a deterministic no-op. Overriding it here (the global
// property is configurable) gives identical behaviour on every Node version and
// suppresses the warning. This file is never imported on the client, so real
// browser storage is untouched there.
const makeNoopStorage = () => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: makeNoopStorage(),
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, 'sessionStorage', {
  value: makeNoopStorage(),
  configurable: true,
  writable: true,
});
