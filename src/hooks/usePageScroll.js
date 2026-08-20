import { useEffect, useRef } from "react";
import useScrollStore from "../store/useScrollStore";

export function usePageScroll(pageKey, { enabled = true } = {}) {
  const setScrollPosition = useScrollStore((s) => s.setScrollPosition);
  const savedY = useScrollStore((s) => s.scrollPositions[pageKey] ?? 0);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!enabled || !pageKey) return;
    const main = document.querySelector("main");
    if (!main) return;

    if (!restoredRef.current && savedY > 0) {
      restoredRef.current = true;
      const t = setTimeout(() => {
        main.scrollTop = savedY;
      }, 40);
      return () => clearTimeout(t);
    }

    const onScroll = () => setScrollPosition(pageKey, main.scrollTop);
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      main.removeEventListener("scroll", onScroll);
      setScrollPosition(pageKey, main.scrollTop);
    };
  }, [pageKey, enabled, savedY, setScrollPosition]);
}