import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Home, Building2, Smile, Meh, Frown, Zap } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { checkinApi, subProjectApi } from "../../services/api";
import { MultiSelect } from "../ui/MultiSelect";
import useCheckinStore from "../../store/useCheckinStore";

const MOODS = [
  { value: "great", label: "Great", icon: Zap, tone: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { value: "okay", label: "Okay", icon: Smile, tone: "text-sky-600 bg-sky-50 border-sky-200" },
  { value: "low", label: "Low energy", icon: Meh, tone: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "stressed", label: "Stressed", icon: Frown, tone: "text-red-600 bg-red-50 border-red-200" },
];

export default function DailyCheckInModal() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [workMode, setWorkMode] = useState("WFO");
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [mood, setMood] = useState(null);

  const { isDismissed, isOpenManually, dismiss } = useCheckinStore();

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      setUser(userStr ? JSON.parse(userStr) : null);
    } catch {
      setUser(null);
    }
  }, [location.pathname]);

  // Skip entirely while a forced password change is pending — that modal takes
  // priority and stacking both would be confusing.
  const hasEmployeeRecord = Boolean(user?.employee_id) && !user?.must_change_password;

  const { data: status, isLoading } = useQuery({
    queryKey: ["checkin-today"],
    queryFn: () => checkinApi.getToday(),
    enabled: hasEmployeeRecord,
    staleTime: 0,
  });

  useEffect(() => {
    if (!status) return;
    setWorkMode(status.suggested_work_mode || "WFO");
    if (status.project_options?.length === 1) {
      setSelectedProjects([status.project_options[0].project_id]);
    }
  }, [status]);

  const shouldPrompt = hasEmployeeRecord && !isLoading && status && !status.already_checked_in;
  const isOpen = Boolean(shouldPrompt && (!isDismissed || isOpenManually));

  const toggleProject = (id) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      checkinApi.submit({
        work_mode: workMode,
        project_ids: selectedProjects,
        mood,
      }),
    onSuccess: () => {
      toast.success("Checked in — have a great day!");
      queryClient.invalidateQueries({ queryKey: ["checkin-today"] });
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.detail?.[0]?.msg ||
        err?.response?.data?.detail ||
        "Couldn't submit your check-in. Please try again.";
      toast.error(typeof msg === "string" ? msg : "Couldn't submit your check-in.");
    },
  });

  const projectOptions = useMemo(() => status?.project_options || [], [status]);
  
  const { data: allProjects } = useQuery({
    queryKey: ["all-sub-projects"],
    queryFn: () => subProjectApi.getAll(),
    enabled: isOpen,
    staleTime: 60000,
  });

  const fallbackOptions = useMemo(() => {
    const assignedIds = new Set(projectOptions.map(p => p.project_id));
    const opts = (allProjects || [])
      .filter(p => !assignedIds.has(p.id))
      .map((p) => ({ label: p.name, value: p.id }));
    opts.push({ label: "Other", value: "other" });
    return opts;
  }, [allProjects, projectOptions]);

  const canSubmit = selectedProjects.length > 0 && !isPending;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={dismiss} size="md" disableBackdropClose={!isOpenManually}>
      <Modal.Header onClose={dismiss}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Good morning, {user?.name?.split(" ")[0] || "there"}!</h2>
            <p className="text-xs text-slate-500">Quick check-in before you get started today.</p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="space-y-6">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Where are you working from?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setWorkMode("WFO")}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors ${workMode === "WFO" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
            >
              <Building2 className="h-5 w-5" />
              <span className="text-sm font-medium">Office (WFO)</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkMode("WFH")}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors ${workMode === "WFH" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
            >
              <Home className="h-5 w-5" />
              <span className="text-sm font-medium">Home (WFH)</span>
            </button>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Which project(s) are you on today?
          </h3>
          <div className="space-y-3">
            {projectOptions.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                No active project allocations found. Select a project from the list below:
              </p>
            )}
            
            {projectOptions.length > 0 && (
              <div className="space-y-2">
                {projectOptions.map((p) => (
                  <label
                    key={p.project_id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${selectedProjects.includes(p.project_id) ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(p.project_id)}
                      onChange={() => toggleProject(p.project_id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">{p.project_name}</span>
                  </label>
                ))}
              </div>
            )}
            
            <MultiSelect
              options={fallbackOptions}
              value={selectedProjects.filter(id => !projectOptions.some(p => p.project_id === id))}
              onChange={(newDropdownValues) => {
                const assignedValues = selectedProjects.filter(id => projectOptions.some(p => p.project_id === id));
                setSelectedProjects([...assignedValues, ...newDropdownValues]);
              }}
              placeholder={projectOptions.length > 0 ? "Search other projects..." : "Search projects..."}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            How are you feeling today? <span className="font-normal normal-case text-slate-400">(optional)</span>
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map(({ value, label, icon: Icon, tone }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMood((m) => (m === value ? null : value))}
                title={label}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors ${mood === value ? tone : "border-slate-200 text-slate-400 hover:border-slate-300"}`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[11px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>
      </Modal.Body>

      <Modal.Footer>
        <Button
          type="button"
          onClick={() => submit()}
          disabled={!canSubmit}
          className="w-full justify-center"
        >
          {isPending ? "Checking in…" : "Check In"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
