import { useRef } from "react";
import { useLocation } from "react-router-dom";

// Maintains a navigation "trail" for breadcrumbs that reflects how the user
// actually moved between pages, so e.g. Projects → (open a project's) Analytics
// shows "Projects › Analytics" and clicking "Projects" returns there.
//
// `resolve(pathname)` must return { name, key, isDetail? } for the current
// route, or null to leave the trail unchanged.
//
// Rules on each location change:
// - Revisiting a page already in the trail → truncate back to it (collapse).
// - A "drill" (a detail route, or any navigation carrying router state — i.e.
// an in-page action like a project's Analytics/Allocations button) → append.
// - Any other top-level navigation (e.g. a sidebar link, which carries no
// state) → reset the trail to just that page.
// - The trail is capped so lateral browsing can't grow it without bound.
const MAX = 4;

export function useBreadcrumbTrail(resolve) {
  const location = useLocation();
  const trailRef = useRef([]);
  const lastRef = useRef(null);

  const full = location.pathname + location.search;

  // Only recompute when the location actually changes (also makes this safe
  // under StrictMode's double-invoked render).
  if (lastRef.current !== full) {
    lastRef.current = full;
    const meta = resolve(location.pathname);
    if (meta) {
      const key = meta.key || location.pathname;
      const entry = { key, name: meta.name, path: full };
      const treatAsDrill = !!meta.isDetail || !!location.state;

      const idx = trailRef.current.findIndex((c) => c.key === key);
      if (idx >= 0) {
        trailRef.current = [...trailRef.current.slice(0, idx), entry];
      } else if (treatAsDrill) {
        trailRef.current = [...trailRef.current, entry];
      } else {
        trailRef.current = [entry];
      }

      if (trailRef.current.length > MAX) {
        trailRef.current = trailRef.current.slice(
          trailRef.current.length - MAX,
        );
      }
    }
  }

  return trailRef.current;
}
