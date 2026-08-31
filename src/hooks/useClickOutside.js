import { useEffect } from "react";

export function useClickOutside(ref, onOutside, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event) => {
      const el = ref?.current;
      if (!el) return;
      if (el.contains(event.target)) return;
      onOutside(event);
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    document.addEventListener("pointerdown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("pointerdown", handler);
    };
  }, [ref, onOutside, enabled]);
}