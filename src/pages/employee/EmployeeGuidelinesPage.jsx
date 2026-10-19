import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { guidelineApi } from "../../services/api";
import {
  FileText,
  Download,
  ExternalLink,
  FolderOpen,
  Search,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const EmployeeGuidelinesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: myGuidelines = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["guidelines-for-me"],
    queryFn: () => guidelineApi.getForMe(),
  });

  const filteredGuidelines = useMemo(() => {
    if (!searchQuery.trim()) return myGuidelines;
    const q = searchQuery.toLowerCase().trim();
    return myGuidelines.filter(
      (g) =>
        (g.title && g.title.toLowerCase().includes(q)) ||
        (g.organization_name && g.organization_name.toLowerCase().includes(q)) ||
        (g.project_name && g.project_name.toLowerCase().includes(q)) ||
        (g.file_name && g.file_name.toLowerCase().includes(q)) ||
        (g.content && g.content.toLowerCase().includes(q))
    );
  }, [myGuidelines, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Project Guidelines & SOPs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access guidelines, quality standards, and reference documentation for your active projects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Available
            </span>
            <span className="text-base font-bold text-emerald-600">
              {myGuidelines.length}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {myGuidelines.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search guidelines, projects, or attachments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400 shadow-xs"
          />
        </div>
      )}

      {/* Content States */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 animate-pulse">
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          Loading your project guidelines...
        </div>
      ) : isError ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-10 text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800">Unable to load guidelines</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            An error occurred while fetching your project documentation.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : myGuidelines.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-semibold text-base">No guidelines found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Guidelines and SOPs for projects you are allocated to will appear here once uploaded by PMs or Admins.
          </p>
        </div>
      ) : filteredGuidelines.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">No matching guidelines</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query "{searchQuery}"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredGuidelines.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 hover:border-slate-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {g.organization_name && (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-200/60">
                        {g.organization_name}
                      </span>
                    )}
                    {g.project_name && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200/80">
                        <FolderOpen className="w-3 h-3 text-slate-400" />
                        {g.project_name}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-800 text-base leading-snug">
                    {g.title}
                  </h3>
                </div>

                <div className="text-xs text-slate-400 shrink-0 tabular-nums">
                  {g.created_at
                    ? new Date(g.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </div>
              </div>

              {g.content && (
                <div className="mt-3 p-4 bg-slate-50/80 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-mono max-h-60 overflow-y-auto border border-slate-200/60">
                  {g.content}
                </div>
              )}

              {g.file_url && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium truncate max-w-md">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{g.file_name || "Attachment"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={g.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View</span>
                    </a>
                    <a
                      href={g.file_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeGuidelinesPage;
