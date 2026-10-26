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
import { checkinApi, subProjectApi, canteenMenuApi } from "../../services/api";
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
  { value: "15", label: "15" },
  { value: "17", label: "17" },
];

const LUNCH_PREFERENCES = [
  { value: "canteen", label: "Canteen (6th Floor)", desc: "Variety of food options" },
  { value: "none", label: "No Lunch Plan", desc: "I'll arrange my own meal" },
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
  const [validationErrors, setValidationErrors] = useState({});

  const getIstHour = () => {
    return parseInt(
      new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: 'numeric' }),
      10
    );
  };
  const [isCanteenClosed, setIsCanteenClosed] = useState(getIstHour() >= 11);
  const [selectedCanteenItem, setSelectedCanteenItem] = useState(null);

  const { isDismissed, isOpenManually, dismiss, setModalOpen, setCanLoadDashboard } = useCheckinStore();

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      const parsedUser = userStr ? JSON.parse(userStr) : null;
      setUser(parsedUser);
      if (!parsedUser?.employee_id || parsedUser?.must_change_password) {
        setCanLoadDashboard(true);
      }
    } catch {
      setUser(null);
      setCanLoadDashboard(true);
    }
  }, [location.pathname, setCanLoadDashboard]);

  const hasEmployeeRecord = Boolean(user?.employee_id) && !user?.must_change_password;

  const { data: status, isLoading, isError } = useQuery({
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
    setValidationErrors({});
  }, [status]);

  const isAuthRoute =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/employee-signup');

  const shouldPrompt = hasEmployeeRecord && !isLoading && status && !status.already_checked_in && !isAuthRoute;
  const isOpen = Boolean(shouldPrompt && (!isDismissed || isOpenManually));

  useEffect(() => {
    setModalOpen(isOpen);
    return () => setModalOpen(false);
  }, [isOpen, setModalOpen]);

  // Refresh cutoff state whenever modal becomes visible
  useEffect(() => {
    if (isOpen) {
      setIsCanteenClosed(getIstHour() >= 11);
    }
  }, [isOpen]);

  // Law 1: Fetch menu only when modal is open, WFO, and before 11:00 AM
  const { data: canteenMenu = [], isLoading: isCanteenMenuLoading } = useQuery({
    queryKey: ["canteenMenu"],
    queryFn: () => canteenMenuApi.getMenu(),
    enabled: isOpen && workMode === "WFO" && !isCanteenClosed,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-default to 'none' (No Lunch Plan) when opening at or after 11:00 AM
  useEffect(() => {
    if (isCanteenClosed && workMode === "WFO") {
      setLunchPreference("none");
      setSelectedCanteenItem(null);
    }
  }, [isCanteenClosed, workMode]);

  // Auto-select first item when menu loads and none selected (before 11 AM)
  useEffect(() => {
    if (!isCanteenClosed && canteenMenu.length > 0 && !selectedCanteenItem) {
      setSelectedCanteenItem(canteenMenu[0]);
    }
  }, [canteenMenu, isCanteenClosed, selectedCanteenItem]);

  useEffect(() => {
    if (isError || (status && status.already_checked_in) || isDismissed) {
      setCanLoadDashboard(true);
    }
  }, [status, isError, isDismissed, setCanLoadDashboard]);

  // Safety fallback: if modal is not active and checkin settled, don't keep dashboard waiting indefinitely
  useEffect(() => {
    if (isOpen) return;
    const timer = setTimeout(() => {
      setCanLoadDashboard(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isOpen, setCanLoadDashboard]);

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

    if (!mood) {
      errors.mood = "Please select how you are feeling today";
    }

    if (workMode === "WFO") {
      if (!officeFloor) {
        errors.officeFloor = "Please select your office floor";
      }
      if (!lunchPreference) {
        errors.lunchPreference = "Please select your lunch preference";
      } else if (lunchPreference === "canteen" && !isCanteenClosed && !selectedCanteenItem && canteenMenu.length > 0) {
        errors.lunchPreference = "Please select a meal option from today's menu";
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
        tiffin_type: (workMode === "WFO" && lunchPreference === "canteen")
          ? selectedCanteenItem?.name || "Standard Canteen Meal"
          : null,
      }),
    onSuccess: () => {
      toast.success("✓ Checked in — have a great day!", {
        duration: 3000,
        icon: "👋",
      });
      queryClient.invalidateQueries({ queryKey: ["checkin-today"] });
      dismiss();
    },
    onError: (err) => {
      const detail = err?.response?.data?.detail;
      // Graceful recovery for the 10:59 AM in-flight submission race condition
      if (typeof detail === "string" && detail.includes("11:00 AM IST")) {
        setIsCanteenClosed(true);
        setLunchPreference("none");
        setSelectedCanteenItem(null);
        toast.error("11:00 AM cutoff reached. 'No Lunch Plan' has been selected for your check-in. Please submit again.");
        return;
      }
      const msg =
        err?.response?.data?.detail?.[0]?.msg ||
        detail ||
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
    queryKey: ["all-sub-projects-dropdown"],
    queryFn: () => subProjectApi.getDropdown(),
    enabled: isOpen,
    staleTime: 60000,
  });

  const fallbackOptions = useMemo(() => {
    const assignedIds = new Set(projectOptions.map(p => p.project_id));
    const opts = (allProjects || [])
      .filter(p => !assignedIds.has(p.id) && p.project_status !== "archived")
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                {/* Option 1: Canteen (6th Floor) */}
                <div
                  className={`w-full rounded-xl border-2 transition-all duration-150 ${
                    isCanteenClosed
                      ? "border-slate-200 bg-slate-50/80 opacity-90 cursor-not-allowed"
                      : lunchPreference === "canteen"
                      ? "border-indigo-400 bg-indigo-50/40"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    disabled={isCanteenClosed}
                    onClick={() => {
                      if (!isCanteenClosed) {
                        setLunchPreference("canteen");
                        setValidationErrors((prev) => ({ ...prev, lunchPreference: "" }));
                      }
                    }}
                    className="w-full p-3 text-left flex items-start gap-3"
                  >
                    <input
                      type="radio"
                      name="lunch_preference"
                      disabled={isCanteenClosed}
                      checked={lunchPreference === "canteen"}
                      onChange={() => {}}
                      className="w-4 h-4 mt-0.5 accent-indigo-600 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-sm ${lunchPreference === "canteen" ? "text-indigo-900" : "text-slate-800"}`}>
                          Canteen (6th Floor)
                        </span>
                        {isCanteenClosed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            ⏰ Booking Closed (11:00 AM)
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Open for booking
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isCanteenClosed
                          ? "Canteen order submissions close at 11:00 AM daily."
                          : "Choose from today's prepared menu options."}
                      </p>
                    </div>
                  </button>

                  {/* Sub-UI: If it is >= 11:00 AM, show in-place professional alert banner */}
                  {isCanteenClosed && (
                    <div className="mx-3 mb-3 p-3 rounded-lg bg-amber-50/90 border border-amber-200/80 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800 leading-relaxed">
                        <span className="font-semibold block mb-0.5">Lunch Booking Finalized</span>
                        Canteen meal booking closes daily at <strong>11:00 AM IST</strong>. Today's order list has already been finalized and sent to the caterer. <strong>"No Lunch Plan"</strong> has been automatically selected for your check-in.
                      </div>
                    </div>
                  )}

                  {/* Sub-UI: If < 11:00 AM and Canteen selected, show Menu Options */}
                  {!isCanteenClosed && lunchPreference === "canteen" && (
                    <div className="mx-3 mb-3 p-3 rounded-xl bg-white border border-indigo-100 shadow-2xs space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-indigo-950 block">
                        Select Today's Meal Option:
                      </label>
                      {isCanteenMenuLoading ? (
                        <p className="text-xs text-slate-400 py-1">Loading today's menu options...</p>
                      ) : canteenMenu.length === 0 ? (
                        <p className="text-xs text-slate-400 py-1">Standard meal will be served today.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {canteenMenu.map((item) => {
                            const isSelected = selectedCanteenItem?.id === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCanteenItem(item);
                                  setValidationErrors((prev) => ({ ...prev, lunchPreference: "" }));
                                }}
                                className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                                  isSelected
                                    ? "border-indigo-500 bg-indigo-50/80 ring-1 ring-indigo-400"
                                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">{item.is_veg ? "🟢" : "🔴"}</span>
                                  <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                                </div>
                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                  item.extra_charge === 0
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                  {item.extra_charge === 0 ? "Free" : `+₹${item.extra_charge}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Option 2: No Lunch Plan */}
                <button
                  type="button"
                  onClick={() => {
                    setLunchPreference("none");
                    setSelectedCanteenItem(null);
                    setValidationErrors((prev) => ({ ...prev, lunchPreference: "" }));
                  }}
                  className={`w-full rounded-xl border-2 p-3 transition-all duration-150 text-left flex items-start gap-3 ${
                    lunchPreference === "none"
                      ? "border-indigo-400 bg-indigo-50/40"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="lunch_preference"
                    checked={lunchPreference === "none"}
                    onChange={() => {}}
                    className="w-4 h-4 mt-0.5 accent-indigo-600"
                  />
                  <div>
                    <div className="font-semibold text-sm text-slate-800">No Lunch Plan</div>
                    <p className="text-xs text-slate-500 mt-0.5">I'll arrange my own meal today</p>
                  </div>
                </button>
              </div>

              {validationErrors.lunchPreference && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationErrors.lunchPreference}</span>
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

        {/* Mood Selection (Mandatory) */}
        <section className="space-y-3 pt-2 border-t border-slate-100">
          <SectionHeader title="How are you feeling today?" required />
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map(({ value, label, icon: Icon, tone }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMood(value);
                  setValidationErrors((prev) => ({ ...prev, mood: "" }));
                }}
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
          {validationErrors.mood && (
            <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
              <AlertCircle className="w-4 h-4" />
              <span>{validationErrors.mood}</span>
            </div>
          )}
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
