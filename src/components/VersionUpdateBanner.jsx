import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCw, X, Sparkles } from "lucide-react";

/* global __APP_VERSION__ */
const CURRENT_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

export const VersionUpdateBanner = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissedUntil, setDismissedUntil] = useState(0);
  const location = useLocation();
  const initialPathRef = useRef(location.pathname);

  useEffect(() => {
    // In local development, version changes on every file edit if using Date.now(), so ignore 'dev'
    if (CURRENT_VERSION === "dev") return;

    let isMounted = true;

    const checkVersion = async () => {
      // If user dismissed in the last 15 minutes, don't re-show yet
      if (Date.now() < dismissedUntil) return;

      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.version && data.version !== CURRENT_VERSION && isMounted) {
          setHasUpdate(true);
        }
      } catch {
        // Network error / offline, ignore
      }
    };

    // Check on initial load
    checkVersion();

    // Check whenever user focuses back to the tab
    const handleFocus = () => checkVersion();
    window.addEventListener("focus", handleFocus);

    // Poll every 60 seconds
    const interval = setInterval(checkVersion, 60000);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [dismissedUntil]);

  // Safe auto-refresh on route change:
  // If an update is waiting and the user navigates to another page, perform a full reload
  // to seamlessly mount the latest bundle at the target route without data loss.
  useEffect(() => {
    if (hasUpdate && location.pathname !== initialPathRef.current) {
      window.location.reload();
    }
  }, [hasUpdate, location.pathname]);

  const handleUpdate = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    // Snooze for 15 minutes
    setDismissedUntil(Date.now() + 15 * 60 * 1000);
    setHasUpdate(false);
  };

  if (!hasUpdate) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-5 right-5 z-[100001] flex items-center gap-3.5 rounded-2xl border border-indigo-200/80 bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Sparkles className="h-4 w-4" />
      </div>

      <div className="flex flex-col pr-1">
        <span className="text-[13px] font-semibold text-slate-800">
          New version available
        </span>
        <span className="text-xs text-slate-500">
          An update was deployed on Railway.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleUpdate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
        >
          <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: "3s" }} />
          Reload
        </button>

        <button
          onClick={handleDismiss}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          aria-label="Dismiss update notification"
          title="Dismiss for 15 minutes"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default VersionUpdateBanner;
