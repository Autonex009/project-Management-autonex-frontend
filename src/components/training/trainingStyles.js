// Shared class strings for the Training and Development screens.
// Direction: exact, procedural, a little strict — an invigilator's desk.
// Neutrals are Slate, the brand accent is indigo, and colour is spent only on
// things that need attention: pass/fail, overdue, unassigned, strict proctoring.

export const ui = {
  // Surfaces
  panel: "bg-white rounded-xl border border-slate-200/80",
  inset: "bg-slate-50 rounded-lg border border-slate-200/80",
  divider: "divide-y divide-slate-100",

  // Text roles
  title: "text-[15px] font-medium text-slate-900 leading-snug",
  heading: "text-base font-medium text-slate-900",
  body: "text-sm text-slate-600 leading-relaxed",
  muted: "text-[13px] text-slate-500",
  meta: "text-xs tabular-nums text-slate-500",

  // Forms
  label: "block text-sm font-medium text-slate-700 mb-1.5",
  hint: "text-xs text-slate-500 mt-1.5",
  input:
    "w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/20 transition-colors",
  textarea:
    "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/20 transition-colors",
  // Kept for any leftover native control; prefer <Select /> from ./Select
  select:
    "h-9 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/20 transition-colors cursor-pointer",

  // Buttons (override the shared Button so the screen keeps one loud action)
  btnQuiet:
    "h-8 px-3 gap-1.5 rounded-lg text-[13px] font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-none transition-colors",
  btnPrimary: "h-9 px-4 gap-1.5 rounded-lg text-sm font-medium shadow-none transition-colors",
  btnDark:
    "h-9 px-4 gap-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-none transition-colors",
  iconBtn:
    "inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors",

  // Quiet tag: sentence case, no fill colour
  tag: "inline-flex items-center h-5 px-1.5 rounded border border-slate-200 text-xs text-slate-600",
  tagWarn: "inline-flex items-center h-5 px-1.5 rounded bg-amber-50 text-xs font-medium text-amber-700",

  // Level 1 — section tabs (Training / Assessment): underline, larger
  sectionTab: (active) =>
    `inline-flex items-center gap-2 h-12 text-[15px] whitespace-nowrap border-b-2 -mb-px transition-colors ${
      active
        ? "border-indigo-600 text-slate-900 font-medium"
        : "border-transparent text-slate-500 hover:text-slate-900"
    }`,

  // Level 2 — views inside a section: segmented control
  segment: "inline-flex items-center p-1 bg-slate-100 rounded-lg",
  segmentItem: (active) =>
    `inline-flex items-center gap-2 h-8 px-3 rounded-md text-sm whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
      active
        ? "bg-white text-slate-900 font-medium shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
        : "text-slate-500 hover:text-slate-900"
    }`,
  segmentCount: (active) =>
    `text-xs tabular-nums ${active ? "text-indigo-600" : "text-slate-400"}`,

  // Legacy underline tab (kept for any inner view that still uses it)
  tab: (active) =>
    `inline-flex items-center gap-2 h-10 px-1 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
      active
        ? "border-indigo-600 text-slate-900 font-medium"
        : "border-transparent text-slate-500 hover:text-slate-900"
    }`,
  tabCount: "text-xs tabular-nums text-slate-400",

  icon: "h-4 w-4 shrink-0",
};

// One small dot per real backend test_type, so the list can be scanned by type.
export const TEST_TYPES = [
  { value: "mcq", label: "MCQ", dot: "bg-indigo-500" },
  { value: "typing", label: "Typing", dot: "bg-teal-500" },
];
export const testTypeMeta = (type) => {
  const norm = String(type || "mcq").toLowerCase();
  return (
    TEST_TYPES.find((t) => t.value === norm) || {
      value: norm,
      label: norm.toUpperCase(),
      dot: "bg-slate-400",
    }
  );
};

// Dynamic smart cluster scope options matching app/schemas/cluster.py & app/services/cluster_service.py
export const CLUSTER_SCOPES = [
  { value: "custom", label: "Manual roster (custom)", hint: "Pick members" },
  { value: "everyone", label: "Everyone", hint: "All active staff" },
  { value: "full_time", label: "Full-time staff", hint: "Full-time" },
  { value: "annotators_reviewers", label: "Annotators & reviewers", hint: "Annotator / Reviewer / QA" },
  { value: "developers", label: "Developers", hint: "Developer" },
  { value: "project_managers", label: "Program managers", hint: "Program Manager" },
  { value: "team_leads", label: "Team leads", hint: "Team Lead" },
  { value: "new_joiners", label: "New joiners", hint: "Joined >= cut-off" },
];
export const AUTO_CLUSTER_SCOPES = CLUSTER_SCOPES.filter((s) => s.value !== "custom");
export const clusterScopeLabel = (scope) =>
  CLUSTER_SCOPES.find((s) => s.value === scope)?.label || scope || "Manual roster";
export const getClusterScopes = (cluster) => {
  if (!cluster?.is_dynamic) return [];
  if (Array.isArray(cluster.dynamic_scopes) && cluster.dynamic_scopes.length > 0) {
    return cluster.dynamic_scopes.filter((s) => s && s !== "custom");
  }
  return cluster.dynamic_scope && cluster.dynamic_scope !== "custom" ? [cluster.dynamic_scope] : [];
};

// Pass-rate colour: the number that tells an admin where to look.
export const rateTone = (rate) => {
  if (rate === null || rate === undefined) return "text-slate-400";
  if (rate >= 70) return "text-emerald-600";
  if (rate >= 40) return "text-amber-600";
  return "text-rose-600";
};

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
