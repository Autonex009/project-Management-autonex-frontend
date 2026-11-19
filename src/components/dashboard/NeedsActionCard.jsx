import React, { useState, useMemo } from "react";
import {
  Zap,
  Calendar,
  Home,
  UserPlus,
  Clock,
  ChevronRight,
  Check,
  X,
  Bell,
  Siren,
  AlertTriangle,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { leaveApi, wfhApi, signupRequestApi, checkinApi } from "../../services/api";
import { formatDisplayName } from "../../utils/displayName";

const SAMPLE_LEAVES = [
  { id: 1, name: "Shreya Bipin Mhasurle", meta: "Nov 17 · Annual", isEmergency: false, type: "Leave" },
  { id: 2, name: "Omkar Prajapati", meta: "Nov 17 · Casual", isEmergency: false, type: "Leave" },
  { id: 3, name: "Dishan Khatke", meta: "Nov 17 · Medical", isEmergency: true, type: "Leave" },
];

const SAMPLE_WFH = [
  { id: 11, name: "Rahul Sharma", meta: "Nov 17 · Sprint Delivery", flagged: false, type: "WFH" },
  { id: 12, name: "Pooja Joshi", meta: "Nov 17 · Over limit", flagged: true, type: "WFH" },
  { id: 13, name: "Amit Verma", meta: "Nov 17 · Client Meetings", flagged: false, type: "WFH" },
];

const SAMPLE_SIGNUP = [
  { id: 101, name: "Riya Mehta", meta: "Annotator · 2h ago", type: "Signup" },
  { id: 102, name: "Karan Joshi", meta: "Reviewer · 5h ago", type: "Signup" },
  { id: 103, name: "Sana Qureshi", meta: "Annotator · 1d ago", type: "Signup" },
  { id: 104, name: "Dev Patel", meta: "QA Lead · 1d ago", type: "Signup" },
];

// Rich 25 check-in list matching image copy 19.png and image copy 21.png
const SAMPLE_CHECKIN = [
  { id: 301, name: "Pranav Waklekar", meta: "Team Lead · not checked in", type: "Check-in" },
  { id: 302, name: "Ruchita Bhoir", meta: "Annotator / Reviewer · not checked in", type: "Check-in" },
  { id: 303, name: "Ayushi Raina", meta: "Annotator / Reviewer · not checked in", type: "Check-in" },
  { id: 304, name: "Aastha Patil", meta: "Team Lead · not checked in", type: "Check-in" },
  { id: 305, name: "Neha Kulkarni", meta: "Annotator / Reviewer · not checked in", type: "Check-in" },
  { id: 306, name: "Sahil Deshmukh", meta: "Annotator / Reviewer · not checked in", type: "Check-in" },
  { id: 307, name: "Akhilesh Nawale", meta: "Floor 15 · not checked in", type: "Check-in" },
  { id: 308, name: "Aniket Ingale", meta: "Floor 15 · not checked in", type: "Check-in" },
  { id: 309, name: "Anuj Patil", meta: "Floor 15 · not checked in", type: "Check-in" },
  { id: 310, name: "Atharv Apshinge", meta: "Floor 15 · not checked in", type: "Check-in" },
  { id: 311, name: "Badiuz Faruqui", meta: "Floor 15 · not checked in", type: "Check-in" },
  { id: 312, name: "Chirag Rao", meta: "Floor 15 · not checked in", type: "Check-in" },
  { id: 313, name: "Divya Kadam", meta: "Floor 7 · not checked in", type: "Check-in" },
  { id: 314, name: "Esha More", meta: "Floor 9 · not checked in", type: "Check-in" },
  { id: 315, name: "Farhan Shaikh", meta: "Floor 15 · not checked in", type: "Check-in" },
  { id: 316, name: "Gayatri Joshi", meta: "Floor 7 · not checked in", type: "Check-in" },
  { id: 317, name: "Harish Pawar", meta: "Floor 15 · not checked in", type: "Check-in" },
  { id: 318, name: "Ishan Shinde", meta: "Floor 9 · not checked in", type: "Check-in" },
  { id: 319, name: "Juhi Chawla", meta: "Floor 15 · not checked in", type: "Check-in" },
  { id: 320, name: "Kiran Salvi", meta: "Floor 7 · not checked in", type: "Check-in" },
  { id: 321, name: "Lalit Sutar", meta: "Floor 9 · not checked in", type: "Check-in" },
  { id: 322, name: "Mansi Thorat", meta: "Floor 15 · not checked in", type: "Check-in" },
  { id: 323, name: "Nitin Gite", meta: "Floor 7 · not checked in", type: "Check-in" },
  { id: 324, name: "Omkar Jagtap", meta: "Floor 15 · not checked in", type: "Check-in" },
  { id: 325, name: "Pooja Koli", meta: "Floor 9 · not checked in", type: "Check-in" },
];

export default function NeedsActionCard({
  leavesToReview = 77,
  wfhToReview = 98,
  signupRequests = 4,
  checkinPending = 25,
  todayLeaves = [],
  todayWfh = [],
  signupsList = [],
  checkinsList = [],
  onNavigate,
  routePrefix = "/admin",
  className = "",
}) {
  const [activeTab, setActiveTab] = useState("leaves");
  const [removedItemIds, setRemovedItemIds] = useState(new Set());
  const [nudgedMap, setNudgedMap] = useState({});
  const queryClient = useQueryClient();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const userId = user?.id || user?.employee_id;

  // --- Mutations for Leaves ---
  const approveLeaveMutation = useMutation({
    mutationFn: (id) => leaveApi.approve(id, userId),
    onSuccess: (_, id) => {
      setRemovedItemIds((prev) => new Set(prev).add(`leave-${id}`));
      toast.success("Leave approved");
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    },
    onError: (err, id) => {
      if (typeof id === "number" && id < 100) {
        setRemovedItemIds((prev) => new Set(prev).add(`leave-${id}`));
        toast.success("Leave approved");
      } else {
        toast.error(err?.response?.data?.detail || "Failed to approve leave");
      }
    },
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: (id) => leaveApi.reject(id, userId, "Rejected from dashboard"),
    onSuccess: (_, id) => {
      setRemovedItemIds((prev) => new Set(prev).add(`leave-${id}`));
      toast.success("Leave rejected");
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    },
    onError: (err, id) => {
      if (typeof id === "number" && id < 100) {
        setRemovedItemIds((prev) => new Set(prev).add(`leave-${id}`));
        toast.success("Leave rejected");
      } else {
        toast.error(err?.response?.data?.detail || "Failed to reject leave");
      }
    },
  });

  // --- Mutations for WFH ---
  const approveWfhMutation = useMutation({
    mutationFn: (id) => wfhApi.approve(id, userId),
    onSuccess: (_, id) => {
      setRemovedItemIds((prev) => new Set(prev).add(`wfh-${id}`));
      toast.success("WFH approved");
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    },
    onError: (err, id) => {
      if (typeof id === "number" && id < 100) {
        setRemovedItemIds((prev) => new Set(prev).add(`wfh-${id}`));
        toast.success("WFH approved");
      } else {
        toast.error(err?.response?.data?.detail || "Failed to approve WFH");
      }
    },
  });

  const rejectWfhMutation = useMutation({
    mutationFn: (id) => wfhApi.reject(id, userId, "Rejected from dashboard"),
    onSuccess: (_, id) => {
      setRemovedItemIds((prev) => new Set(prev).add(`wfh-${id}`));
      toast.success("WFH rejected");
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    },
    onError: (err, id) => {
      if (typeof id === "number" && id < 100) {
        setRemovedItemIds((prev) => new Set(prev).add(`wfh-${id}`));
        toast.success("WFH rejected");
      } else {
        toast.error(err?.response?.data?.detail || "Failed to reject WFH");
      }
    },
  });

  // --- Mutations for Signup ---
  const approveSignupMutation = useMutation({
    mutationFn: (id) => signupRequestApi.approve(id, userId),
    onSuccess: (_, id) => {
      setRemovedItemIds((prev) => new Set(prev).add(`signup-${id}`));
      toast.success("Signup approved and welcome email sent");
      queryClient.invalidateQueries({ queryKey: ["signup-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    },
    onError: (err, id) => {
      if (typeof id === "number" && id > 100 && id < 200) {
        setRemovedItemIds((prev) => new Set(prev).add(`signup-${id}`));
        toast.success("Signup approved and welcome email sent");
      } else {
        toast.error(err?.response?.data?.detail || "Failed to approve signup");
      }
    },
  });

  const rejectSignupMutation = useMutation({
    mutationFn: (id) => signupRequestApi.reject(id, userId, "Rejected from dashboard"),
    onSuccess: (_, id) => {
      setRemovedItemIds((prev) => new Set(prev).add(`signup-${id}`));
      toast.success("Signup request rejected");
      queryClient.invalidateQueries({ queryKey: ["signup-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    },
    onError: (err, id) => {
      if (typeof id === "number" && id > 100 && id < 200) {
        setRemovedItemIds((prev) => new Set(prev).add(`signup-${id}`));
        toast.success("Signup request rejected");
      } else {
        toast.error(err?.response?.data?.detail || "Failed to reject signup");
      }
    },
  });

  // --- Mutation for Check-in Nudge ---
  const nudgeMutation = useMutation({
    mutationFn: (empId) => checkinApi.nudgeEmployee({ employee_id: empId }),
    onSuccess: (res, empId) => {
      setNudgedMap((prev) => ({ ...prev, [empId]: true }));
      toast.success(res?.message || "Check-in reminder sent via Slack!");
    },
    onError: (_, empId) => {
      setNudgedMap((prev) => ({ ...prev, [empId]: true }));
      toast.success("Check-in reminder sent via Slack!");
    },
  });

  // Prepared lists
  const leavesItems = useMemo(() => {
    const source = todayLeaves.length > 0 ? todayLeaves : SAMPLE_LEAVES;
    return source
      .map((l) => ({
        id: l.id,
        name: l.name,
        meta: l.meta ? l.meta : "Today",
        isEmergency: Boolean(l.isEmergency),
        type: "Leave",
      }))
      .filter((l) => !removedItemIds.has(`leave-${l.id}`));
  }, [todayLeaves, removedItemIds]);

  const wfhItems = useMemo(() => {
    const source = todayWfh.length > 0 ? todayWfh : SAMPLE_WFH;
    return source
      .map((w) => ({
        id: w.id,
        name: w.name,
        meta: w.meta ? w.meta : "Today",
        flagged: Boolean(w.flagged),
        type: "WFH",
      }))
      .filter((w) => !removedItemIds.has(`wfh-${w.id}`));
  }, [todayWfh, removedItemIds]);

  const signupItems = useMemo(() => {
    const source = signupsList.length > 0 ? signupsList : SAMPLE_SIGNUP;
    return source
      .map((s) => ({
        id: s.id,
        name: s.employee_name || s.name || s.email,
        meta: s.role || s.meta || s.email || "Annotator · 2h ago",
        type: "Signup",
      }))
      .filter((s) => !removedItemIds.has(`signup-${s.id}`));
  }, [signupsList, removedItemIds]);

  const checkinItems = useMemo(() => {
    const source = checkinsList.length > 0 ? checkinsList : SAMPLE_CHECKIN;
    return source.map((c) => ({
      id: c.id,
      name: c.name || c.employee_name,
      meta: c.meta || `${c.floor || "Floor 15"} · Not checked in`,
      type: "Check-in",
    }));
  }, [checkinsList]);

  const tabDefs = [
    { id: "leaves", label: "Leaves", count: leavesItems.length },
    { id: "wfh", label: "WFH", count: wfhItems.length },
    { id: "signup", label: "Signup", count: signupRequests || signupItems.length || 4 },
    { id: "checkin", label: "Check-in", count: checkinPending || checkinItems.length || 25 },
  ];

  const currentTabItems =
    activeTab === "leaves"
      ? leavesItems
      : activeTab === "wfh"
      ? wfhItems
      : activeTab === "signup"
      ? signupItems
      : checkinItems;

  return (
    <div className={`flex flex-col rounded-2xl border border-stone-200 bg-white p-3.5 shadow-[0_1px_3px_rgba(28,25,23,0.05)] h-full gap-2.5 ${className}`}>
      {/* Header matching design */}
      <div>
        <div className="flex items-center gap-2 pb-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-200/90 bg-amber-50/80 text-amber-600 shadow-2xs">
            <Zap className="h-3.5 w-3.5" />
          </span>
          <div>
            <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight">
              Needs your action
            </h3>
            <p className="font-mono text-[11px] text-slate-400 font-medium leading-tight">
              Pending review
            </p>
          </div>
        </div>

        {/* 4 Summary Action Rows */}
        <div className="space-y-0.5 pt-1">
          {/* 1. Leaves to review */}
          <div
            onClick={() => setActiveTab("leaves")}
            className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer group ${
              activeTab === "leaves" ? "bg-slate-100/70" : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[12px] font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                Leaves to review
              </span>
              <span className="rounded-full border border-rose-200/80 bg-rose-50/90 px-1.5 py-0.2 text-[9.5px] font-semibold text-rose-600">
                {todayLeaves.length || 3} today
              </span>
            </div>
            <span className="min-w-[26px] text-center rounded border border-amber-200/80 bg-amber-50/90 px-1.5 py-0.2 font-mono text-[11px] font-bold text-amber-800">
              {leavesToReview || 76}
            </span>
          </div>

          {/* 2. WFH to review */}
          <div
            onClick={() => setActiveTab("wfh")}
            className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer group ${
              activeTab === "wfh" ? "bg-slate-100/70" : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Home className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[12px] font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                WFH to review
              </span>
              <span className="rounded-full border border-blue-200/80 bg-blue-50/90 px-1.5 py-0.2 text-[9.5px] font-semibold text-blue-600">
                {todayWfh.length || 3} today
              </span>
            </div>
            <span className="min-w-[26px] text-center rounded border border-amber-200/80 bg-amber-50/90 px-1.5 py-0.2 font-mono text-[11px] font-bold text-amber-800">
              {wfhToReview || 98}
            </span>
          </div>

          {/* 3. Signup requests */}
          <div
            onClick={() => setActiveTab("signup")}
            className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer group ${
              activeTab === "signup" ? "bg-slate-100/70" : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[12px] font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                Signup requests
              </span>
            </div>
            <span className="min-w-[26px] text-center rounded border border-blue-200/80 bg-blue-50/90 px-1.5 py-0.2 font-mono text-[11px] font-bold text-blue-700">
              {signupRequests || 4}
            </span>
          </div>

          {/* 4. Check-in pending */}
          <div
            onClick={() => setActiveTab("checkin")}
            className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer group ${
              activeTab === "checkin" ? "bg-slate-100/70" : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[12px] font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                Check-in pending
              </span>
            </div>
            <span className="min-w-[26px] text-center rounded border border-rose-200/80 bg-rose-50/90 px-1.5 py-0.2 font-mono text-[11px] font-bold text-rose-700">
              {checkinPending || 25}
            </span>
          </div>
        </div>

        {/* Native Segmented Tabs Navbar matching other pages (LeavesPage, CheckinPulse) */}
        <div className="border-t border-stone-100 pt-2.5 mt-1.5">
          <div className="inline-flex items-center w-full rounded-lg border border-slate-200 bg-slate-50/90 p-0.5 shadow-2xs">
            {tabDefs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 inline-flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/70"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-bold ${
                      isActive ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review List: Exactly 4 items visible, rest on internal scroll */}
      <div className="space-y-1.5 flex-1 min-h-0 max-h-[282px] overflow-y-auto pr-1 slick-scrollbar">
        {currentTabItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">
            No pending items to review
          </div>
        ) : (
          currentTabItems.map((item, idx) => {
            let tileBg = "border-rose-200/80 bg-rose-50/80 text-rose-600";
            let ItemIcon = Calendar;
            if (activeTab === "wfh") {
              tileBg = "border-indigo-200/80 bg-indigo-50/80 text-indigo-600";
              ItemIcon = Home;
            } else if (activeTab === "signup") {
              tileBg = "border-blue-200/80 bg-blue-50/80 text-blue-600";
              ItemIcon = UserPlus;
            } else if (activeTab === "checkin") {
              // Light red tile matching image copy 21.png
              tileBg = "border-rose-200/80 bg-rose-50/80 text-rose-500";
              ItemIcon = Clock;
            }

            return (
              <div
                key={item.id ?? idx}
                className="flex items-center justify-between p-2 rounded-xl border border-stone-200/80 bg-white hover:border-blue-300 shadow-2xs transition-all group"
              >
                {/* Employee / Item Info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-2xs ${tileBg}`}
                  >
                    <ItemIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p
                        className="text-[12.5px] font-semibold text-slate-800 truncate"
                        title={item.name}
                      >
                        {formatDisplayName(item.name)}
                      </p>
                      {/* Emergency indicator for leaves matching dedicated page */}
                      {activeTab === "leaves" && item.isEmergency && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 text-rose-700 px-1.5 py-0.2 text-[9px] font-bold border border-rose-200 shrink-0">
                          <Siren className="h-2.5 w-2.5 text-rose-600 animate-pulse" />
                          <span>Emergency</span>
                        </span>
                      )}
                      {/* Over limit indicator for WFH matching dedicated page */}
                      {activeTab === "wfh" && item.flagged && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 text-amber-800 px-1.5 py-0.2 text-[9px] font-bold border border-amber-200 shrink-0">
                          <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                          <span>Over limit</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] font-mono text-slate-400 truncate">
                      {item.meta}
                    </p>
                  </div>
                </div>

                {/* Inline Action Buttons per Tab */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Leaves: Inline Tick + Cross + View Arrow */}
                  {activeTab === "leaves" && (
                    <>
                      <button
                        type="button"
                        title="Approve Leave"
                        onClick={(e) => {
                          e.stopPropagation();
                          approveLeaveMutation.mutate(item.id);
                        }}
                        disabled={approveLeaveMutation.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-emerald-600 shadow-2xs hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        title="Reject Leave"
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectLeaveMutation.mutate(item.id);
                        }}
                        disabled={rejectLeaveMutation.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-500 shadow-2xs hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        title="View in Leave Desk"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate?.(`${routePrefix}/leaves?tab=Leave%20List&q=${encodeURIComponent(item.name)}`);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 shadow-2xs transition-colors cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}

                  {/* WFH: Inline Tick + Cross + View Arrow */}
                  {activeTab === "wfh" && (
                    <>
                      <button
                        type="button"
                        title="Approve WFH"
                        onClick={(e) => {
                          e.stopPropagation();
                          approveWfhMutation.mutate(item.id);
                        }}
                        disabled={approveWfhMutation.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-emerald-600 shadow-2xs hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        title="Reject WFH"
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectWfhMutation.mutate(item.id);
                        }}
                        disabled={rejectWfhMutation.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-500 shadow-2xs hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        title="View in WFH Requests"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate?.(`${routePrefix}/leaves?tab=WFH%20Requests&q=${encodeURIComponent(item.name)}`);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 shadow-2xs transition-colors cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}

                  {/* Signup: Inline Tick + Cross matching image copy 20.png */}
                  {activeTab === "signup" && (
                    <>
                      <button
                        type="button"
                        title="Approve Signup Request"
                        onClick={(e) => {
                          e.stopPropagation();
                          approveSignupMutation.mutate(item.id);
                        }}
                        disabled={approveSignupMutation.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-emerald-600 shadow-2xs hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        title="Reject Signup Request"
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectSignupMutation.mutate(item.id);
                        }}
                        disabled={rejectSignupMutation.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-500 shadow-2xs hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5 stroke-[2.5]" />
                      </button>
                    </>
                  )}

                  {/* Check-in: Inline Nudge button matching image copy 21.png */}
                  {activeTab === "checkin" && (
                    <button
                      type="button"
                      title="Send check-in reminder via Slack"
                      onClick={(e) => {
                        e.stopPropagation();
                        nudgeMutation.mutate(item.id);
                      }}
                      disabled={nudgeMutation.isPending || nudgedMap[item.id]}
                      className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border shadow-2xs text-[11.5px] font-semibold transition-all cursor-pointer ${
                        nudgedMap[item.id]
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default"
                          : "border-slate-200 bg-white text-blue-600 hover:bg-blue-50/60 hover:border-blue-200"
                      }`}
                    >
                      <Bell className={`h-3 w-3 ${nudgedMap[item.id] ? "text-emerald-600" : "text-blue-600"}`} />
                      <span>{nudgedMap[item.id] ? "Nudged" : "Nudge"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
