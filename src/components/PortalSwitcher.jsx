import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Admin ⇄ PM switch, shown only to HR users (who hold a combined role with access
 * to both portals). Reads the role in an effect so SSR and the first client render
 * agree (no hydration mismatch).
 */
export default function PortalSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  if (role !== "hr") return null;

  const onPm = location.pathname.startsWith("/pm");
  const btn = "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors";

  return (
    <div
      className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"
      title="HR — switch portal"
    >
      <button
        type="button"
        onClick={() => navigate("/admin/dashboard")}
        className={`${btn} ${
          !onPm
            ? "bg-white text-indigo-600 shadow-sm"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        Admin
      </button>
      <button
        type="button"
        onClick={() => navigate("/pm/dashboard")}
        className={`${btn} ${
          onPm
            ? "bg-white text-indigo-600 shadow-sm"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        PM
      </button>
    </div>
  );
}
