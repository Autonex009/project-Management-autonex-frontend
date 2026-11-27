import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Eye, Users } from "lucide-react";
import { assessmentApi } from "../../services/api";
import MyAssessmentsPanel from "../../components/training/MyAssessmentsPanel";
import ResultsAnalyticsTab from "../../components/training/ResultsAnalyticsTab";
import { ui } from "../../components/training/trainingStyles";

const VIEWS = [
  { value: "team", label: "Team progress", icon: Users },
  { value: "mine", label: "My assessments", icon: ClipboardCheck },
];

/**
 * PM / Team Lead → "Training & Development" (view-only).
 *
 *  - Team progress: scores, integrity flags, proctoring logs and video for the people in the
 *    caller's own project hierarchy. The backend filters the rows (never the caller or peers),
 *    so this screen has no create / assign / retest / extend / remind actions.
 *  - My assessments: the PM's own assigned tests (same panel employees use).
 */
export default function PMTrainingDevelopmentPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get("tab") === "mine" ? "mine" : "team";

  const { data: filters } = useQuery({
    queryKey: ["evaluatorFilters"],
    queryFn: assessmentApi.getEvaluatorFilters,
    staleTime: 5 * 60 * 1000,
    enabled: view === "team",
  });

  const setView = (next) => {
    const nextParams = new URLSearchParams(params);
    if (next === "mine") nextParams.set("tab", "mine");
    else nextParams.delete("tab");
    setParams(nextParams, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 py-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Training &amp; Development</h1>
          <p className="text-sm text-slate-500 mt-1">
            {view === "team"
              ? "Assessment progress and proctoring logs for the people on your teams."
              : "Tests assigned to you and your own results."}
          </p>
        </div>

        <div className={ui.segment} role="tablist" aria-label="Training and development views">
          {VIEWS.map((v) => {
            const active = view === v.value;
            const Icon = v.icon;
            return (
              <button
                key={v.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(v.value)}
                className={ui.segmentItem(active)}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "team" ? (
        <>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600">
            <Eye className="h-3.5 w-3.5 text-slate-400" />
            View-only. Contact HR to assign tests, grant retests or extend deadlines.
          </div>
          <ResultsAnalyticsTab
            readOnly
            assessments={filters?.assessments || []}
            clusters={filters?.clusters || []}
          />
        </>
      ) : (
        <MyAssessmentsPanel />
      )}
    </div>
  );
}
