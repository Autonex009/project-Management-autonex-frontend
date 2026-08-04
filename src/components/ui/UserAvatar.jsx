import React, { useState, useEffect } from "react";

export function getAvatarUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const apiBase = import.meta.env.VITE_API_URL || "";
  if (apiBase) {
    const cleanBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${cleanBase}${cleanPath}`;
  }
  return trimmed;
}

export default function UserAvatar({
  src,
  name = "User",
  size = "md",
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
        className={`${currentSizeClass} rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200 ${imgClassName} ${className}`}
      />
    );
  }

  return (
    <div
      className={`${currentSizeClass} rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600 font-semibold ring-1 ring-slate-200 select-none ${fallbackClassName} ${className}`}
    >
      {initials}
    </div>
  );
}
