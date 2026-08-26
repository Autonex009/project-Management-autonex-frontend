import React from "react";
import { useQuery } from "@tanstack/react-query";
import { guidelineApi } from "../../services/api";
import { FileText, Download } from "lucide-react";

const EmployeeGuidelinesPage = () => {

  const { data: myGuidelines = [], isLoading } = useQuery({
    queryKey: ["guidelines-for-me"],
    queryFn: () => guidelineApi.getForMe(),
  });

  return (
    <div className="space-y-6">


      {isLoading ? (
        <div className="text-center py-12 text-slate-400 animate-pulse">
          Loading...
        </div>
      ) : myGuidelines.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No guidelines available</p>
          <p className="text-sm text-slate-400 mt-1">
            Guidelines for your projects will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {myGuidelines.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-slate-800">{g.title}</h3>
              </div>
              {g.content && (
                <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-mono max-h-64 overflow-y-auto">
                  {g.content}
                </div>
              )}
              {g.file_url && (
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href={g.file_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-3">
                Created{" "}
                {new Date(g.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeGuidelinesPage;
