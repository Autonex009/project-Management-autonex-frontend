import { useState, useRef, useCallback, useLayoutEffect, useEffect } from "react";

const DEFAULT_WIDTH = 320;
const DEFAULT_MARGIN = 12;
const DEFAULT_CLOSE_DELAY = 140;

/**
 * Shared hover/click popover behavior extracted from AllocationPopover and
 * CandidateAllocationsPopover, which carried near-identical copies of this
 * logic: smart fixed positioning relative to a trigger (flips above the
 * trigger when there isn't room below), outside-click / Escape dismissal,
 * reposition-on-scroll/resize, and a short close delay so moving the mouse
 * from trigger to popover doesn't flicker-close it.
 *
 * `deps` lets a caller force a reposition when popover content changes size
 * (e.g. allocation list length changes) — pass a fixed-length array.
 */
export function usePopoverPosition({
  width = DEFAULT_WIDTH,
  margin = DEFAULT_MARGIN,
  closeDelay = DEFAULT_CLOSE_DELAY,
  deps = [],
} = {}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    placement: "bottom",
    arrowLeft: 0,
  });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const closeTimerRef = useRef(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverHeight = popoverRef.current?.offsetHeight || 320;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const triggerCenter = rect.left + rect.width / 2;
    let left = triggerCenter - width / 2;
    left = Math.max(margin, Math.min(left, vw - width - margin));

    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const placeBelow = spaceBelow >= popoverHeight || spaceBelow >= spaceAbove;
    const top = placeBelow ? rect.bottom + 8 : rect.top - popoverHeight - 8;

    const arrowLeft = Math.max(16, Math.min(width - 16, triggerCenter - left));

    setPosition({
      top,
      left,
      placement: placeBelow ? "bottom" : "top",
      arrowLeft,
    });
  }, [width, margin]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // Re-measure once after content lays out (in case size changed)
    const id = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, updatePosition, ...deps]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        (triggerRef.current && triggerRef.current.contains(e.target)) ||
        (popoverRef.current && popoverRef.current.contains(e.target))
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), closeDelay);
  }, [closeDelay]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  return {
    open,
    setOpen,
    position,
    triggerRef,
    popoverRef,
    scheduleClose,
    cancelClose,
  };
}