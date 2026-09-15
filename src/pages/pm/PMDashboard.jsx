import React, { useState } from "react";
import { formatDisplayName } from "../../utils/displayName";
import PMMyDashboard from "./PMMyDashboard";
import Dashboard from "../Dashboard";

const PMDashboard = () => {
  const [pmTab, setPmTab] = useState("project");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          {pmTab === "project" && (
            <>
              <h1 className="text-lg font-semibold text-slate-900">
                PM Dashboard –{" "}
                <span className="text-blue-600">
                  {formatDisplayName(user.name)?.split(" ")[0] || "Manager"}
                </span>
              </h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Project oversight & team management
              </p>
            </>
          )}
        </div>

        <div className="flex gap-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setPmTab("project")}
            className={`text-[12px] font-bold px-4 py-1.5 rounded-lg transition-all ${
              pmTab === "project"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Project Dashboard
          </button>
          <button
            onClick={() => setPmTab("my")}
            className={`text-[12px] font-bold px-4 py-1.5 rounded-lg transition-all ${
              pmTab === "my"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            My Dashboard
          </button>
        </div>
      </div>

      {pmTab === "project" ? <Dashboard /> : <PMMyDashboard />}
    </div>
  );
};

export default PMDashboard;