import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

/**
 * DynamicTooltip
 * 
 * High-performance, dynamically adjusted hover tooltip with:
 * - Smart vertical flip (auto-flips top/bottom based on available viewport space)
 * - Viewport boundary clamping (never clips off left/right screen edges)
 * - Exact arrow positioning aligned with trigger center
 * - Optimized truncation awareness: by default only reveals when content is actually truncated
 *   (scrollWidth > clientWidth) or when a distinct custom tooltip is provided.
 * - Portal-rendered to document.body (immune to parent overflow-hidden and z-index clipping)
 */
export default function DynamicTooltip({
  text,
  tooltip,
  children,
  className = "",
  tooltipClassName = "",
  placement = "top", // "top" | "bottom" | "auto"
  alwaysShow = false,
  maxWidth = 260,
  delay = 100,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, actualPlacement: "top", arrowLeft: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timerRef = useRef(null);

  const displayText = text ?? (typeof children === "string" ? children : "");
  const contentToDisplay = tooltip ?? displayText;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const rect = trigger.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 36;
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : Math.min(maxWidth, 240);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

    const spaceAbove = rect.top - margin;
    const spaceBelow = vh - rect.bottom - margin;

    let actualPlacement = "top";
    if (placement === "bottom") {
      actualPlacement = spaceBelow >= tooltipHeight || spaceBelow >= spaceAbove ? "bottom" : "top";
    } else if (placement === "top") {
      actualPlacement = spaceAbove >= tooltipHeight || spaceAbove >= spaceBelow ? "top" : "bottom";
    } else {
      // auto
      actualPlacement = spaceAbove >= tooltipHeight || spaceAbove >= spaceBelow ? "top" : "bottom";
    }

    const triggerCenter = rect.left + rect.width / 2;
    let left = triggerCenter - tooltipWidth / 2;
    // Clamp to viewport
    left = Math.max(margin, Math.min(left, vw - tooltipWidth - margin));

    // Arrow relative to tooltip box
    const arrowLeft = Math.max(10, Math.min(tooltipWidth - 10, triggerCenter - left));

    let top = 0;
    if (actualPlacement === "top") {
      top = rect.top - tooltipHeight - 6;
    } else {
      top = rect.bottom + 6;
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      actualPlacement,
      arrowLeft: Math.round(arrowLeft),
    });
  }, [placement, maxWidth]);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trigger = triggerRef.current;
    if (!trigger) return;

    // Check if content is actually truncated or if custom tooltip differs from text
    const isTruncated = trigger.scrollWidth > trigger.clientWidth;
    const hasCustomTooltip = Boolean(tooltip && tooltip !== displayText);

    if (alwaysShow || isTruncated || hasCustomTooltip) {
      timerRef.current = setTimeout(() => {
        setIsOpen(true);
      }, delay);
    }
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 50);
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const id = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`min-w-0 ${children ? "inline-flex" : "truncate"} ${className}`}
      >
        {children || displayText}
      </div>

      {isOpen && typeof document !== "undefined" && contentToDisplay &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              maxWidth: `${maxWidth}px`,
              zIndex: 99999,
            }}
            className={`pointer-events-none rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-xl transition-opacity animate-in fade-in duration-150 ${tooltipClassName}`}
          >
            <div className="relative break-words whitespace-normal leading-relaxed">
              {contentToDisplay}
            </div>
            {/* Triangular arrow indicator */}
            <div
              style={{ left: `${coords.arrowLeft}px` }}
              className={`absolute h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-slate-200 bg-white ${
                coords.actualPlacement === "top"
                  ? "top-full -mt-[3.5px] border-b border-r"
                  : "bottom-full -mb-[3.5px] border-t border-l"
              }`}
            />
          </div>,
          document.body
        )}
    </>
  );
}
