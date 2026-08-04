import { useEffect, useState } from "react";

// A tiny observable for the current "detail" breadcrumb title. A detail page
// (e.g. project analytics) sets the title once it knows it (after fetch), and the
// layout's breadcrumb reads it to replace a generic crumb like "Analytics" with the
// actual project name. Cleared on the detail page's unmount.
const listeners = new Set();
let current = null;

export function setPageDetailTitle(title) {
  current = title || null;
  listeners.forEach((fn) => fn(current));
}

export function usePageDetailTitle() {
  const [title, setTitle] = useState(current);
  useEffect(() => {
    listeners.add(setTitle);
    setTitle(current);
    return () => listeners.delete(setTitle);
  }, []);
  return title;
}
