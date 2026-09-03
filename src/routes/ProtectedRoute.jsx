import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Decode a JWT payload without verifying signature (browser-side).
 * Falls back to localStorage 'role' for backward compat.
 */
const parseJwt = (token) => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    // Support Node.js SSR environments where atob might need a fallback, though global in modern Node
    const decoded =
      typeof atob !== "undefined"
        ? atob(base64)
        : Buffer.from(base64, "base64").toString("binary");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const useAuth = () => {
  if (typeof window === "undefined") {
    // Server side: extract access_token from the global cookie header set in entry-server.jsx
    let token = null;
    if (globalThis.__cookieHeader) {
      const match = globalThis.__cookieHeader.match(
        /(?:^|; )access_token=([^;]*)/,
      );
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
    
    if (!token) return { isAuthenticated: false, role: null, user: null };

    const payload = parseJwt(token);
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
      return { isAuthenticated: false, role: null, user: null };
    }
    
    return { isAuthenticated: true, role: payload.role, user: payload };
  } else {
    // Client side: we cannot read the HttpOnly cookie.
    // Rely on localStorage for UI state; the backend will reject invalid cookies with 401.
    const storedRole = localStorage.getItem("role");
    const storedUser = localStorage.getItem("user");
    
    if (!storedRole || !storedUser) {
      return { isAuthenticated: false, role: null, user: null };
    }
    
    try {
      const parsedUser = JSON.parse(storedUser);
      return { isAuthenticated: true, role: storedRole, user: parsedUser };
    } catch {
      return { isAuthenticated: false, role: null, user: null };
    }
  }
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!hasMounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const isEmployeeRoute = location.pathname.startsWith("/employee");
    const isPMRoute = location.pathname.startsWith("/pm");
    const loginPath = isEmployeeRoute
      ? "/login/employee"
      : isPMRoute
        ? "/login/pm"
        : "/login/admin";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to the correct dashboard for their role
    const dashboardMap = {
      admin: "/admin/dashboard",
      hr: "/admin/dashboard", // HR lands in Admin; can switch to PM via the portal switcher
      pm: "/pm/dashboard",
      team_lead: "/pm/dashboard", // same portal as a PM, view-only inside
      employee: "/employee/dashboard",
    };
    return <Navigate to={dashboardMap[role] || "/login/admin"} replace />;
  }

  return children;
};

export { useAuth };
export default ProtectedRoute;
