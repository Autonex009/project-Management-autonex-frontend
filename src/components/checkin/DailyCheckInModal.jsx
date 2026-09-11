import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck, Home, Building2, Smile, Meh, Frown, Zap,
  AlertCircle, ChefHat
} from "lucide-react";
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

const OFFICE_FLOORS = [
  { value: "7", label: "7" },
  { value: "9", label: "9" },
  { value: "17", label: "17" },
];

const LUNCH_PREFERENCES = [
  { value: "order_tiffin", label: "Order Tiffin", icon: ChefHat, desc: "Delicious home-cooked meal" },
  { value: "canteen", label: "Canteen (6th Floor)", desc: "Variety of food options" },
  { value: "none", label: "No Lunch Plan", desc: "I'll arrange my own meal" },
];

const TIFFIN_TYPES = [
  { value: "full_meal", label: "Full Meal", desc: "Rice, dal & vegetables" },
  { value: "no_rice", label: "No Rice", desc: "Dal & vegetables" },
  { value: "dal_and_rice", label: "Dal & Rice", desc: "Simple & light" },
];

const RequiredBadge = () => (
  <span className="ml-1 text-xs font-semibold text-red-500">*</span>
);

const SectionHeader = ({ title, required = false, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-3">
    {Icon && <Icon className="w-4 h-4 text-indigo-600" />}
    <h3 className="text-sm font-semibold text-slate-900">
      {title}
      {required && <RequiredBadge />}
    </h3>
  </div>
);

export default function DailyCheckInModal() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [workMode, setWorkMode] = useState("WFO");
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [mood, setMood] = useState(null);
  const [officeFloor, setOfficeFloor] = useState("");
  const [lunchPreference, setLunchPreference] = useState("");
  const [tiffinType, setTiffinType] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const { isDismissed, isOpenManually, dismiss } = useCheckinStore();

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      setUser(userStr ? JSON.parse(userStr) : null);
    } catch {
      setUser(null);
    }
  }, [location.pathname]);

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
    if (status.project_options?.length > 0) {
      setSelectedProjects(status.project_options.map((p) => p.project_id));
    }
    // Reset WFO-only fields
    setOfficeFloor("");
    setLunchPreference("");
    setTiffinType("");
    setValidationErrors({});
  }, [status]);

  const isAuthRoute =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/employee-signup');

  const shouldPrompt = hasEmployeeRecord && !isLoading && status && !status.already_checked_in && !isAuthRoute;
  const isOpen = Boolean(shouldPrompt && (!isDismissed || isOpenManually));

  const toggleProject = (id) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
    setValidationErrors((prev) => ({ ...prev, projects: "" }));
  };

  const validateForm = () => {
    const errors = {};

    if (!selectedProjects.length) {
      errors.projects = "Please select at least one project";
    }

    if (workMode === "WFO") {
      if (!officeFloor) {
        errors.officeFloor = "Please select your office floor";
      }
      if (!lunchPreference) {
        errors.lunchPreference = "Please select your lunch preference";
      }
      if (lunchPreference === "order_tiffin" && !tiffinType) {
        errors.tiffinType = "Please select your tiffin preference";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      checkinApi.submit({
        work_mode: workMode,
        project_ids: selectedProjects,
        mood,
        office_floor: workMode === "WFO" ? officeFloor : null,
        lunch_preference: workMode === "WFO" ? lunchPreference : null,
        tiffin_type: lunchPreference === "order_tiffin" ? tiffinType : null,
      }),
    onSuccess: () => {
      // Calculate the current hour in IST
      const istHour = parseInt(
        new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: 'numeric' }),
        10
      );
      // If it is 12 PM or later, and they ordered food from the office
      if (istHour >= 12 && workMode === "WFO" && (lunchPreference === "order_tiffin" || lunchPreference === "canteen")) {
        toast("The list is already finalized and sent. Please contact Ashish Jadhav to confirm.", {
          duration: 6000,
          icon: "⚠️",
          style: { maxWidth: 500 }
        });
      } else {
        toast.success("✓ Checked in — have a great day!", {
          duration: 3000,
          icon: "👋",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["checkin-today"] });
      dismiss();
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.detail?.[0]?.msg ||
        err?.response?.data?.detail ||
        "Couldn't submit your check-in. Please try again.";
      toast.error(typeof msg === "string" ? msg : "Couldn't submit your check-in.");
    },
  });

  const handleSubmit = () => {
    if (validateForm()) {
      submit();
    }
  };

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

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={dismiss} size="md" disableBackdropClose={!isOpenManually}>
      {/* Header */}
      <Modal.Header onClose={dismiss}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 shadow-sm">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Good morning, {user?.name?.split(" ")[0] || "there"}! 👋
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Let's get you set up for the day</p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Work Mode Selection */}
        <section className="space-y-3">
          <SectionHeader title="Where are you working today?" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { mode: "WFO", label: "Office", icon: Building2, desc: "Coming to office" },
              { mode: "WFH", label: "Home", icon: Home, desc: "Working from home" }
            ].map(({ mode, label, icon: Icon, desc }) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setWorkMode(mode);
                  setOfficeFloor("");
                  setLunchPreference("");
                  setTiffinType("");
                  setValidationErrors({});
                }}
                className={`group relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-200 ${workMode === mode
                    ? "border-indigo-500 bg-indigo-50 shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
              >
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <div className={`p-2.5 rounded-full transition-colors ${workMode === mode
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                    }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-900">{label}</div>
                    <div className="text-xs text-slate-500 mt-1">{desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* WFO-Only Section */}
        {workMode === "WFO" && (
          <>
            {/* Office Floor Selection */}
            <section className="space-y-3 pt-2 border-t border-slate-100">
              <SectionHeader title="Which floor will you work from?" required icon={Building2} />
              <div className="grid grid-cols-3 gap-2">
                {OFFICE_FLOORS.map((floor) => (
                  <button
                    key={floor.value}
                    type="button"
                    onClick={() => {
                      setOfficeFloor(floor.value);
                      setValidationErrors((prev) => ({ ...prev, officeFloor: "" }));
                    }}
                    className={`py-3 px-2 rounded-xl border-2 font-semibold text-sm transition-all duration-150 ${officeFloor === floor.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                  >
                    Floor {floor.label}
                  </button>
                ))}
              </div>
              {validationErrors.officeFloor && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.officeFloor}</span>
                </div>
              )}
            </section>

            {/* Lunch Preference Selection */}
            <section className="space-y-3 pt-2 border-t border-slate-100">
              <SectionHeader title="What's your lunch plan?" required icon={ChefHat} />
              <div className="space-y-2">
                {LUNCH_PREFERENCES.map((pref) => (
                  <button
                    key={pref.value}
                    type="button"
                    onClick={() => {
                      setLunchPreference(pref.value);
                      if (pref.value !== "order_tiffin") {
                        setTiffinType("");
                      }
                      setValidationErrors((prev) => ({ ...prev, lunchPreference: "", tiffinType: "" }));
                    }}
                    className={`w-full group relative overflow-hidden rounded-xl border-2 p-3 transition-all duration-150 text-left ${lunchPreference === pref.value
                        ? "border-indigo-400 bg-indigo-50/70"
                        : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <input
                        type="radio"
                        name="lunch_preference"
                        checked={lunchPreference === pref.value}
                        onChange={() => { }}
                        className="w-4 h-4 cursor-pointer accent-indigo-600"
                      />
                      <div className="flex-1">
                        <div className={`font-medium ${lunchPreference === pref.value
                            ? "text-indigo-900"
                            : "text-slate-900"
                          }`}>
                          {pref.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {pref.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {validationErrors.lunchPreference && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.lunchPreference}</span>
                </div>
              )}

              {/* Tiffin Type Selection (Conditional) */}
              {lunchPreference === "order_tiffin" && (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100">
                  <label className="text-xs font-semibold uppercase tracking-wider text-indigo-900 block mb-3">
                    Select tiffin type
                    <RequiredBadge />
                  </label>
                  <div className="space-y-2">
                    {TIFFIN_TYPES.map((tiff) => (
                      <button
                        key={tiff.value}
                        type="button"
                        onClick={() => {
                          setTiffinType(tiff.value);
                          setValidationErrors((prev) => ({ ...prev, tiffinType: "" }));
                        }}
                        className={`w-full group relative overflow-hidden rounded-lg border-2 p-2.5 transition-all duration-150 text-left ${tiffinType === tiff.value
                            ? "border-indigo-400 bg-white shadow-sm"
                            : "border-indigo-200 bg-white/60 hover:border-indigo-300"
                          }`}
                      >
                        <div className="flex items-center gap-2.5 relative z-10">
                          <input
                            type="radio"
                            name="tiffin_type"
                            checked={tiffinType === tiff.value}
                            onChange={() => { }}
                            className="w-4 h-4 cursor-pointer accent-indigo-600"
                          />
                          <div className="flex-1">
                            <div className={`font-medium text-sm ${tiffinType === tiff.value
                                ? "text-indigo-900"
                                : "text-slate-700"
                              }`}>
                              {tiff.label}
                            </div>
                            <div className="text-xs text-slate-500">
                              {tiff.desc}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {validationErrors.tiffinType && (
                    <div className="flex items-center gap-2 text-red-600 text-sm mt-3">
                      <AlertCircle className="w-4 h-4" />
                      <span>{validationErrors.tiffinType}</span>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* Projects Selection */}
        <section className={`space-y-3 ${workMode === "WFO" ? "pt-2 border-t border-slate-100" : ""}`}>
          <SectionHeader title="Which projects are you working on?" required />
          <div className="space-y-3">
            {projectOptions.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 italic">
                No active allocations found. Select from available projects below:
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">Allocated Projects</p>
                {projectOptions.map((p) => (
                  <label
                    key={p.project_id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-sm transition-all duration-150 ${selectedProjects.includes(p.project_id)
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(p.project_id)}
                      onChange={() => toggleProject(p.project_id)}
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    />
                    <span className={`font-medium ${selectedProjects.includes(p.project_id)
                        ? "text-indigo-900"
                        : "text-slate-800"
                      }`}>
                      {p.project_name}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 font-medium mb-2">Other Projects</p>
              <MultiSelect
                options={fallbackOptions}
                value={selectedProjects.filter(id => !projectOptions.some(p => p.project_id === id))}
                onChange={(newDropdownValues) => {
                  const assignedValues = selectedProjects.filter(id => projectOptions.some(p => p.project_id === id));
                  setSelectedProjects([...assignedValues, ...newDropdownValues]);
                  setValidationErrors((prev) => ({ ...prev, projects: "" }));
                }}
                placeholder={projectOptions.length > 0 ? "Add more..." : "Search projects..."}
              />
            </div>
          </div>
          {validationErrors.projects && (
            <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>{validationErrors.projects}</span>
            </div>
          )}
        </section>

        {/* Mood Selection (Optional) */}
        <section className="space-y-3 pt-2 border-t border-slate-100">
          <SectionHeader title="How are you feeling today?" />
          <p className="text-xs text-slate-500 mb-2">Optional • Just for our records</p>
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map(({ value, label, icon: Icon, tone }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMood((m) => (m === value ? null : value))}
                title={label}
                className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-150 ${mood === value
                    ? tone.replace("border-", "border-2 border-") + " shadow-sm"
                    : "border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50"
                  }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </section>
      </Modal.Body>

      {/* Footer */}
      <Modal.Footer>
        <div className="flex gap-3 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={dismiss}
            className="flex-1"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            loading={isPending}
            className="flex-1 justify-center"
          >
            {isPending ? "Checking in..." : "Check In"}
          </Button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-3">
          Fields marked with <span className="text-red-500 font-semibold">*</span> are required
        </p>
      </Modal.Footer>
    </Modal>
  );
}
