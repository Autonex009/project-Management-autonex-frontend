import { useEffect } from "react";

export function useClickOutside(ref, onOutside, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event) => {
      const el = ref?.current;
      if (!el) return;
      
      // If the clicked element is inside the ref, do nothing.
      if (el.contains(event.target)) return;
      
      // Also check if the clicked element is part of a detached DOM node.
      // Sometimes React unmounts the clicked element before the listener fires,
      // causing contains() to return false even if it was originally inside.
      // However, for closing dropdowns, usually we want it to close if clicked outside.
      onOutside(event);
    };

    // Use capture phase to ensure the event is caught before any inner elements
    // can call stopPropagation(), which is a common cause of click-outside bugs app-wide.
    document.addEventListener("mousedown", handler, true);
    document.addEventListener("touchstart", handler, true);

    return () => {
      document.removeEventListener("mousedown", handler, true);
      document.removeEventListener("touchstart", handler, true);
    };
  }, [ref, onOutside, enabled]);
}
