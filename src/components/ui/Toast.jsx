import React, { useState, useRef, useEffect } from "react";
import { useToaster, resolveValue, toast } from "react-hot-toast";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  WifiOff,
  Loader2,
  X,
} from "lucide-react";

/**
 * Modern Stacked Toast Notification System (Sonner / Untitled UI Style)
 *
 * Features:
 * 1. 3D Card Stack: Multiple notifications stack neatly behind each other like a deck of cards
 * 2. Hover to Expand: Hovering smoothly expands the stack to reveal all active cards
 * 3. Countdown Loading Line: Smoothly animated progress bar at the bottom showing exact time to auto-dismiss
 * 4. Interactive Close: Sleek cross button (✕) to dismiss instantly
 * 5. Minimalist White Theme: Double-ring circular icons, crisp typography, subtle borders, soft shadows
 */

const PROGRESS_KEYFRAMES = `
@keyframes toastCountdownLine {
  0% {
    width: 100%;
  }
  100% {
    width: 0%;
  }
}
`;

function ToastCard({ t, index, isExpanded, isHovered, onHeightChange }) {
  const cardRef = useRef(null);
  const rawMessage = resolveValue(t.message, t);
  const isString = typeof rawMessage === "string";

  // Measure height for smooth stack expansion
  useEffect(() => {
    if (cardRef.current) {
      onHeightChange(t.id, cardRef.current.offsetHeight);
    }
  }, [t.id, onHeightChange, rawMessage]);

  // Check if this is an actual Wi-Fi restriction block (ONLY on error)
  const isWifiBlockError =
    t.type === "error" &&
    isString &&
    (rawMessage.includes("Office Wi-Fi") ||
      rawMessage.includes("authorized office network") ||
      rawMessage.toLowerCase().includes("check-in blocked") ||
      t.icon === "📶");

  // Determine category
  let category = t.type;
  if (isWifiBlockError) {
    category = "wifi-error";
  }

  // Parse title and description
  let title = "";
  let description = rawMessage;

  if (isString) {
    if (rawMessage.startsWith("✓ ")) {
      title = "Successfully updated";
      description = rawMessage.replace(/^✓\s*/, "");
    } else if (rawMessage.includes(": ") && !rawMessage.startsWith("http")) {
      const splitIdx = rawMessage.indexOf(": ");
      const potentialTitle = rawMessage.substring(0, splitIdx).trim();
      if (potentialTitle.length <= 35) {
        title = potentialTitle;
        description = rawMessage.substring(splitIdx + 2).trim();
      }
    }

    if (!title) {
      if (category === "success") title = "Success";
      else if (category === "wifi-error") title = "Check-in blocked";
      else if (category === "error") title = "Action failed";
      else if (category === "loading") title = "Please wait";
      else title = "Notification";
    }
  }

  // Visual configuration matching Untitled UI
  const config = {
    success: {
      ring: "ring-4 ring-emerald-50",
      iconBg: "bg-emerald-50 border border-emerald-100 text-emerald-600",
      icon: <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />,
      progressBar: "bg-emerald-500",
      actionText: "Dismiss",
      actionSecondary: null,
    },
    error: {
      ring: "ring-4 ring-rose-50",
      iconBg: "bg-rose-50 border border-rose-100 text-rose-600",
      icon: <AlertCircle className="w-4 h-4 stroke-[2.5]" />,
      progressBar: "bg-rose-500",
      actionText: "Dismiss",
      actionSecondary: null,
    },
    "wifi-error": {
      ring: "ring-4 ring-amber-50",
      iconBg: "bg-amber-50 border border-amber-100 text-amber-600",
      icon: <WifiOff className="w-4 h-4 stroke-[2.5]" />,
      progressBar: "bg-amber-500",
      actionText: "Dismiss",
      actionSecondary: "Office Wi-Fi Required",
    },
    loading: {
      ring: "ring-4 ring-indigo-50",
      iconBg: "bg-indigo-50 border border-indigo-100 text-indigo-600",
      icon: <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />,
      progressBar: "bg-indigo-500",
      actionText: null,
      actionSecondary: null,
    },
    blank: {
      ring: "ring-4 ring-gray-50",
      iconBg: "bg-gray-50 border border-gray-200 text-gray-600",
      icon: <Info className="w-4 h-4 stroke-[2.5]" />,
      progressBar: "bg-gray-400",
      actionText: "Dismiss",
      actionSecondary: null,
    },
  };

  const style = config[category] || config.blank;
  const toastDuration = t.duration || 5000;

  // Format IP in description if present
  const renderFormattedDescription = (text) => {
    if (!isString) return text;
    const ipMatch = text.match(/\(([\d\.:a-fA-F]+)\)/);
    if (ipMatch) {
      const parts = text.split(ipMatch[0]);
      return (
        <span>
          {parts[0]}
          <span className="inline-flex items-center px-1.5 py-0.2 mx-0.5 font-mono text-[11px] font-semibold rounded bg-gray-100 text-gray-800 border border-gray-200">
            {ipMatch[1]}
          </span>
          {parts[1]}
        </span>
      );
    }
    return text;
  };

  // Stacking calculation
  let transform = "";
  let zIndex = 50 - index;
  let opacity = 1;
  let pointerEvents = "auto";

  if (!isExpanded) {
    if (index === 0) {
      transform = "translate3d(0, 0, 0) scale(1)";
      opacity = 1;
    } else if (index === 1) {
      transform = "translate3d(0, 12px, 0) scale(0.96)";
      opacity = 0.92;
    } else if (index === 2) {
      transform = "translate3d(0, 24px, 0) scale(0.92)";
      opacity = 0.75;
    } else {
      transform = "translate3d(0, 32px, 0) scale(0.88)";
      opacity = 0;
      pointerEvents = "none";
    }
  }

  return (
    <div
      ref={cardRef}
      style={{
        zIndex,
        opacity,
        pointerEvents,
        transform,
        transformOrigin: "bottom center",
      }}
      className={`
        relative w-full max-w-[390px] p-4 bg-white border border-gray-200/90 rounded-xl
        shadow-lg shadow-gray-900/5 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
      `}
    >
      <div className="flex items-start gap-3.5">
        {/* Double-Ring Icon Container */}
        <div className="shrink-0 pt-0.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${style.ring} ${style.iconBg}`}
          >
            {style.icon}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 leading-5">
            {title}
          </h4>
          <div className="text-sm text-gray-500 mt-1 leading-5 font-normal">
            {renderFormattedDescription(description)}
          </div>

          {/* Action Link Row */}
          {style.actionText && (
            <div className="flex items-center gap-3 mt-3 pt-0.5">
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >
                {style.actionText}
              </button>
              {style.actionSecondary && (
                <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer">
                  {style.actionSecondary}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Close Cross Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t.id);
          }}
          className="shrink-0 p-1 -mr-1 -mt-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      {/* Countdown Loading Line */}
      {t.type !== "loading" && toastDuration !== Infinity && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-100 overflow-hidden">
          <div
            key={`${t.id}-${t.createdAt || 0}`}
            className={`h-full ${style.progressBar}`}
            style={{
              animation: `toastCountdownLine ${toastDuration}ms linear forwards`,
              animationPlayState: isHovered ? "paused" : "running",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function StackedToaster({ toastOptions }) {
  const { toasts, handlers } = useToaster(toastOptions);
  const [isHovered, setIsHovered] = useState(false);
  const heightsRef = useRef({});

  const handleHeightChange = (id, height) => {
    heightsRef.current[id] = height;
  };

  // Only take visible toasts, newest first
  const visibleToasts = toasts.filter((t) => t.visible);
  const reversed = [...visibleToasts].reverse();

  if (visibleToasts.length === 0) return null;

  return (
    <>
      <style>{PROGRESS_KEYFRAMES}</style>
      <div
        className="fixed top-5 right-5 z-[100000] pointer-events-none flex flex-col items-end"
        onMouseEnter={() => {
          setIsHovered(true);
          handlers.startPause();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          handlers.endPause();
        }}
      >
        <div className="relative pointer-events-auto flex flex-col items-end gap-2.5 w-[390px]">
          {reversed.map((t, idx) => {
            return (
              <div
                key={t.id}
                className={`w-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  !isHovered && idx > 0 ? "absolute top-0 right-0" : ""
                }`}
              >
                <ToastCard
                  t={t}
                  index={idx}
                  isExpanded={isHovered}
                  isHovered={isHovered}
                  onHeightChange={handleHeightChange}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default StackedToaster;
