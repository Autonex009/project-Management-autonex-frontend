import React, { useState, useEffect } from "react";

// Loopback / LAN hosts, where plain http is the only thing that works in dev.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|.*\.local)(:\d+)?$/i;

/**
 * Force an absolute http:// avatar URL to https://.
 *
 * The app is served over https in production while VITE_API_URL is configured as
 * http://…railway.app, so every uploaded avatar was mixed content: Chrome logs a
 * warning and auto-upgrades the request, which only works because the backend
 * happens to answer on https too. Upgrading here makes it deliberate.
 *
 * Deliberately not conditioned on `window.location.protocol` — this module runs
 * during SSR as well, and a server/client disagreement about the `src` attribute
 * is a hydration mismatch.
 */
const forceHttps = (url) => {
  if (!url.startsWith("http://")) return url;
  const rest = url.slice("http://".length);
  const host = rest.split("/")[0];
  return LOCAL_HOST.test(host) ? url : `https://${rest}`;
};

export function getAvatarUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return forceHttps(trimmed);
  }
  const apiBase = import.meta.env.VITE_API_URL || "";
  if (apiBase) {
    const cleanBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return forceHttps(`${cleanBase}${cleanPath}`);
  }
  return trimmed;
}

export default function UserAvatar({
  src,
  name = "User",
  size = "md",
  // Shape is a prop rather than something callers append via className: Tailwind
  // emits rounded-full AFTER the smaller radii, so a `rounded-2xl` passed through
  // className loses to the default no matter the order it is written in.
  rounded = "rounded-full",
  className = "",
  imgClassName = "",
  fallbackClassName = "",
}) {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = getAvatarUrl(src);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initials = String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-[13px]",
    lg: "w-10 h-10 text-sm",
    xl: "w-20 h-20 text-2xl font-bold",
  };

  const currentSizeClass = sizeClasses[size] || size || "w-9 h-9 text-[13px]";

  if (resolvedUrl && !hasError) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${currentSizeClass} ${rounded} object-cover flex-shrink-0 ring-1 ring-slate-200 ${imgClassName} ${className}`}
      />
    );
  }

  return (
    <div
      className={`${currentSizeClass} ${rounded} flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600 font-semibold ring-1 ring-slate-200 select-none ${fallbackClassName} ${className}`}
    >
      {initials}
    </div>
  );
}
