import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payrollApi } from "../services/api";
import Button from "../components/ui/Button";
import toast from "react-hot-toast";
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Users,
  TrendingDown,
  Wallet,
  Lock,
  Unlock,
  Gift,
  PlusCircle,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  Sparkles,
  Minus,
  ChevronDown,
} from "lucide-react";
import { usePayrollStore } from "../store/usePayrollStore";
import SearchBar from "../components/ui/SearchBar";
import Table from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import DatePicker from "../components/ui/DatePicker";
import Dropdown from "../components/ui/Dropdown";
import UserAvatar from "../components/ui/UserAvatar";
import { formatDisplayName, getNameInitials } from "../utils/displayName";

const LEAVE_LABELS = {
  paid: "Paid",
  casual_sick: "Casual/Sick",
  floater: "Floater",
};

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
const fmtCurrency = (n) => `₹${fmt(n)}`;

// Format an ISO date 'YYYY-MM-DD' as e.g. '23 Apr' without timezone shifts.
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const fmtDay = (iso) => {
  const [, m, d] = (iso || "").split("-");
  return m && d
    ? `${parseInt(d, 10)} ${MONTHS_SHORT[parseInt(m, 10) - 1]}`
    : iso;
};

// Render a UTC audit timestamp (…Z from the API) in the viewer's local time.
const fmtStamp = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : `on ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} at ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
};

const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Extracted column builder to top-level to avoid recreating on every render.
// `locked` = the month's run is finalized. Editable cells become read-only text
// so a finalized payroll can't be silently altered; Undo (reopen) unlocks it.
const getColumns = ({
  bonuses,
  setBonuses,
  additionalPayments,
  setAdditionalPayments,
  setReviewModal,
  locked,
}) => [
  {
    key: "employee",
    label: "Employee",
    render: (_, row) => {
      const shortName = formatDisplayName(row.employee_name) || row.employee_name;
      return (
        <div className="flex items-center gap-3">
          <UserAvatar
            src={row.avatar_url}
            name={shortName}
            size="sm"
            className="w-8 h-8"
          />
          <div className="group relative min-w-0">
            <div className="font-semibold truncate text-slate-800">
              {shortName}
            </div>
            {row.employee_name !== shortName && (
              <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                <div className="px-2.5 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg shadow-lg border border-slate-200 whitespace-nowrap">
                  {row.employee_name}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    },
  },

  {
    key: "salary",
    label: "Base Salary / Per Day",
    align: "right",
    render: (_, row) =>
      row.salary_missing ? (
        <p className="text-xs text-amber-600 flex items-center justify-end gap-1">
          <AlertTriangle className="w-3 h-3" />
          Set in Pay tab
        </p>
      ) : (
        <div className="text-right">
          <p className="font-semibold">{fmtCurrency(row.base_salary)}</p>
          <p className="text-xs text-slate-400">
            {fmtCurrency(row.per_day_rate)}/day
          </p>
        </div>
      ),
  },

  {
    key: "leave",
    label: "Leaves",
    align: "right",
    render: (_, row) =>
      row.total_leave_days > 0 ? (
        <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
          {row.total_leave_days}d
        </span>
      ) : (
        <span className="text-slate-300 text-xs">—</span>
      ),
  },

  {
    key: "deduction",
    label: "Deducted",
    align: "right",
    render: (_, row) =>
      row.total_deduction > 0 ? (
        <span className="text-red-600 font-medium">
          −{fmtCurrency(row.total_deduction)}
        </span>
      ) : (
        <span className="text-slate-300 text-xs">—</span>
      ),
  },

  {
    key: "bonus",
    label: "Bonus",
    align: "right",
    render: (_, row) => {
      if (row.salary_missing || row.bonus_limit <= 0)
        return <span className="text-slate-300 text-xs">—</span>;
      if (locked)
        return row.bonus > 0 ? (
          <span className="font-medium text-amber-700">
            {fmtCurrency(row.bonus)}
          </span>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        );
      return (
        <div className="flex items-center justify-end gap-2">
          <input
            type="checkbox"
            checked={row.bonus > 0}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              setBonuses((p) => ({
                ...p,
                [row.employee_id]: e.target.checked ? row.bonus_limit : 0,
              }))
            }
          />
          {row.bonus > 0 ? (
            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                <span className="text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  min={0}
                  max={row.bonus_limit}
                  value={bonuses[row.employee_id] ?? row.bonus}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    setBonuses((p) => ({
                      ...p,
                      [row.employee_id]: e.target.value,
                    }))
                  }
                  onWheel={(e) => e.target.blur()}
                  className="w-24 px-2 py-1 border border-indigo-300 rounded-lg text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                max {fmtCurrency(row.bonus_limit)}
              </p>
            </div>
          ) : (
            <span className="text-xs text-slate-400">
              up to {fmtCurrency(row.bonus_limit)}
            </span>
          )}
        </div>
      );
    },
  },

  {
    key: "additional",
    label: "Additional Payments",
    align: "right",
    render: (_, row) =>
      row.salary_missing ? (
        <span className="text-slate-300 text-xs">—</span>
      ) : locked ? (
        row.additional_payment > 0 ? (
          <span className="font-medium text-sky-700">
            {fmtCurrency(row.additional_payment)}
          </span>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )
      ) : (
        <div className="flex items-center justify-end gap-1">
          <span className="text-slate-400 text-xs">₹</span>
          <input
            type="number"
            min={0}
            value={
              additionalPayments[row.employee_id] ??
              (row.additional_payment || "")
            }
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              setAdditionalPayments((p) => ({
                ...p,
                [row.employee_id]: e.target.value,
              }))
            }
            onWheel={(e) => e.target.blur()}
            placeholder="0"
            className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      ),
  },

  {
    key: "final",
    label: "Final Salary",
    align: "right",
    render: (_, row) => (
      <span
        className={`font-bold text-base ${row.salary_missing ? "text-slate-300" : "text-emerald-700"}`}
      >
        {row.salary_missing ? "—" : fmtCurrency(row.final_salary)}
      </span>
    ),
  },

  {
    key: "actions",
    label: "Actions",
    render: (_, row) =>
      row.leaves.length > 0 && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setReviewModal(row.employee_id)}
        >
          {locked ? "View Leaves" : "Review Leaves"}
          <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-indigo-200 text-[10px] font-bold">
            {row.leaves.length}
          </span>
        </Button>
      ),
  },
];

const PayrollPage = () => {
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const {
    month,
    generated,
    autoGenerate,
    adjustments,
    bonuses,
    additionalPayments,
    setMonth,
    setGenerated,
    setAutoGenerate,
    setAdjustments,
    setBonuses,
    setAdditionalPayments,
    payrollSearch: search,
    setPayrollSearch: setSearch,
    payrollTypeFilter: typeFilter,
    setPayrollTypeFilter: setTypeFilter,
    payrollPage: page,
    setPayrollPage: setPage,
  } = usePayrollStore();

  const filterRef = useRef(null);
  const [filterOpen, setFilterOpen] = useState(false);

  // Close filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!month) {
      setMonth(currentMonthStr());
    }
  }, [month, setMonth]);

  // Which employee's leave modal is open
  const [reviewModal, setReviewModal] = useState(null); // employee row object

  // Discarding a run deletes its adjustments, so it sits behind a typed confirm.
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discardConfirmText, setDiscardConfirmText] = useState("");

  // ── Payroll passcode gate ──────────────────────────────────────────
  const [unlocked, setUnlocked] = useState(
    !!sessionStorage.getItem("payroll_passcode"),
  );
  const [passcodeInput, setPasscodeInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  const handleUnlock = async (e) => {
    e.preventDefault();
    setUnlocking(true);
    setUnlockError("");
    sessionStorage.setItem("payroll_passcode", passcodeInput);
    try {
      // Validate the passcode against the server (also no-op if the gate is disabled).
      await payrollApi.getPreview(currentMonthStr());
      setUnlocked(true);
      setPasscodeInput("");
    } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.removeItem("payroll_passcode");
        setUnlockError("Incorrect payroll passcode.");
      } else {
        // Non-auth error (e.g. network) — passcode itself was accepted.
        setUnlocked(true);
        setPasscodeInput("");
      }
    } finally {
      setUnlocking(false);
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem("payroll_passcode");
    setUnlocked(false);
  };

  const {
    data: preview,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["payroll-preview", month],
    queryFn: () => payrollApi.getPreview(month),
    enabled: generated && !!month,
    staleTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: (body) => payrollApi.save(body),
    onSuccess: (data) => {
      toast.success(
        data.status === "finalized" ? "Payroll finalized!" : "Draft saved",
      );
      queryClient.invalidateQueries(["payroll-preview", month]);
      // The query is manual (enabled: false), so invalidation alone won't refetch —
      // pull the run's new status so the lock state on screen is correct.
      refetch();
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to save payroll"),
  });

  // Undo a finalize. Keeps every saved figure — only the lock is removed, so the
  // same numbers come back for editing and re-finalizing.
  const reopenMutation = useMutation({
    mutationFn: () => payrollApi.reopen(month, user.id),
    onSuccess: () => {
      toast.success("Payroll unlocked — adjustments kept. Edit and re-finalize.");
      queryClient.invalidateQueries(["payroll-preview", month]);
      refetch();
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to unlock payroll"),
  });

  // Discard the run outright. Destructive — clears local edits too so the screen
  // reflects the freshly auto-computed month rather than stale overrides.
  const discardMutation = useMutation({
    mutationFn: () => payrollApi.discardRun(month),
    onSuccess: () => {
      toast.success("Payroll run discarded — recomputed from scratch.");
      setAdjustments({});
      setBonuses({});
      setAdditionalPayments({});
      setConfirmDiscard(false);
      queryClient.invalidateQueries(["payroll-preview", month]);
      refetch();
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to discard payroll run"),
  });

  // A finalized run is locked: no edits, no re-finalize until it's reopened.
  const isFinalized = generated && preview?.run_status === "finalized";
  // Draft but previously finalized → this month was finalized and then undone.
  const wasReopened =
    generated && !isFinalized && !!preview?.reopened_at && !!preview?.run_id;

  const handleGenerate = () => {
    refetch().then(({ data }) => {
      if (!data) return;
      setGenerated(true);
      // No seeding needed: the backend returns each leave's per-date paid/unpaid
      // (auto classification, or a finalized run's snapshot). `adjustments` only
      // holds the admin's overrides; absent = use the backend's per-date default.
      setAdjustments({});
    });
  };

  useEffect(() => {
    if (autoGenerate && month) {
      setAutoGenerate(false);
      handleGenerate();
    }
  }, [autoGenerate, month, setAutoGenerate]);

  // Admin override: set the exact list of UNPAID dates (ISO strings) for a leave.
  // No-op while the run is finalized — the month is locked until it's reopened.
  const setLeaveDates = (leaveId, unpaidDates) => {
    if (isFinalized) return;
    setAdjustments((prev) => ({ ...prev, [leaveId]: unpaidDates }));
  };

  // Flip a single day of a leave between paid and unpaid; rest stay as-is.
  const toggleLeaveDay = (leaf, date) => {
    if (isFinalized) return;
    const current = leaf.dates.filter((d) => d.unpaid).map((d) => d.date);
    const set = new Set(current);
    if (set.has(date)) set.delete(date);
    else set.add(date);
    setLeaveDates(leaf.leave_id, Array.from(set));
  };

  // Recompute rows with current adjustments applied
  const rows = useMemo(() => {
    if (!preview?.employees) return [];
    return preview.employees.map((emp) => {
      const rawPerDay = emp.base_salary
        ? emp.base_salary / (preview.working_days || 22)
        : 0;
      const perDay = Math.round(rawPerDay * 100) / 100;

      let totalDeductedDays = 0;
      let totalPaidDays = 0;
      const leaves = emp.leaves.map((l) => {
        const backendDates = l.dates || [];
        // Effective unpaid dates: admin override if any, else the backend's per-date default.
        const override = adjustments[l.leave_id];
        const unpaidSet = new Set(
          override ?? backendDates.filter((d) => d.unpaid).map((d) => d.date),
        );
        const dates = backendDates.map((d) => ({
          ...d,
          unpaid: unpaidSet.has(d.date),
        }));
        
        const weight = l.is_half_day ? 0.5 : 1.0;
        const unpaidDays = dates.filter((d) => d.unpaid).length * weight;
        const paidDays = Math.max(l.days_in_month - unpaidDays, 0);
        const deductionAmount = Math.round(unpaidDays * perDay * 100) / 100;
        
        totalDeductedDays += unpaidDays;
        totalPaidDays += paidDays;
        const classification =
          unpaidDays <= 0
            ? "paid"
            : unpaidDays >= l.days_in_month
              ? "unpaid"
              : "partial";
        return {
          ...l,
          dates,
          unpaidDays,
          paidDays,
          classification,
          deduct: unpaidDays > 0,
          deductionAmount,
        };
      });
      
      const totalDeduction = Math.round(totalDeductedDays * perDay * 100) / 100;
      
      // Bonus: capped at the employee's limit; uses the in-progress edit if any,
      // else the saved/default amount from the preview.
      const bonusLimit = emp.bonus_limit || 0;
      const rawBonus = bonuses[emp.employee_id] ?? emp.bonus ?? 0;
      const bonus = Math.round(Math.max(0, Math.min(Number(rawBonus) || 0, bonusLimit)) * 100) / 100;
      
      // Additional payment: free-form, no cap (just non-negative).
      const rawAdditional =
        additionalPayments[emp.employee_id] ?? emp.additional_payment ?? 0;
      const additional = Math.round(Math.max(0, Number(rawAdditional) || 0) * 100) / 100;
      
      const finalSalary = Math.round(
        (Math.max((emp.base_salary || 0) - totalDeduction, 0) +
        bonus +
        additional) * 100
      ) / 100;
      
      return {
        ...emp,
        leaves,
        per_day_rate: perDay,
        total_paid_days: totalPaidDays,
        total_deducted_days: totalDeductedDays,
        total_deduction: totalDeduction,
        bonus_limit: bonusLimit,
        bonus,
        additional_payment: additional,
        final_salary: finalSalary,
      };
    });
  }, [preview, adjustments, bonuses, additionalPayments]);

  const totals = useMemo(
    () => ({
      baseSalary: rows.reduce((s, r) => s + (r.base_salary || 0), 0),
      totalDeduction: rows.reduce((s, r) => s + r.total_deduction, 0),
      totalBonus: rows.reduce((s, r) => s + (r.bonus || 0), 0),
      totalAdditional: rows.reduce(
        (s, r) => s + (r.additional_payment || 0),
        0,
      ),
      finalSalary: rows.reduce((s, r) => s + r.final_salary, 0),
      employeesWithSalary: rows.filter((r) => r.base_salary).length,
    }),
    [rows],
  );

  const PAGE_SIZE = 12;

  const typeOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.employee_type).filter(Boolean))),
    [rows]
  );

  const filtered = useMemo(() => {
    let result = rows;
    
    if (typeFilter) {
      result = result.filter(r => r.employee_type === typeFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          (r.employee_name || "").toLowerCase().includes(q) ||
          (r.designation || "").toLowerCase().includes(q) ||
          (r.employee_type || "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [rows, search, typeFilter]);

  const onSearch = (v) => {
    setSearch(v);
    setPage(1);
  };

  const columns = useMemo(
    () =>
      getColumns({
        bonuses,
        setBonuses,
        additionalPayments,
        setAdditionalPayments,
        setReviewModal,
        locked: isFinalized,
      }),
    [bonuses, additionalPayments, isFinalized],
  );

  const buildAdjustmentsPayload = () =>
    rows.flatMap((emp) =>
      emp.leaves.map((l) => ({
        employee_id: emp.employee_id,
        leave_id: l.leave_id,
        deduct: l.deduct,
        unpaid_days: l.unpaidDays,
        unpaid_dates: (l.dates || [])
          .filter((d) => d.unpaid)
          .map((d) => d.date),
      })),
    );

  const buildBonusesPayload = () =>
    rows
      .filter((r) => (r.bonus || 0) > 0)
      .map((r) => ({ employee_id: r.employee_id, amount: r.bonus }));

  const buildAdditionalPaymentsPayload = () =>
    rows
      .filter((r) => (r.additional_payment || 0) > 0)
      .map((r) => ({
        employee_id: r.employee_id,
        amount: r.additional_payment,
      }));

  const handleSave = (status) => {
    saveMutation.mutate({
      month,
      status,
      adjustments: buildAdjustmentsPayload(),
      bonuses: buildBonusesPayload(),
      additional_payments: buildAdditionalPaymentsPayload(),
      processed_by: user.id,
    });
  };

  const handleExportCSV = () => {
    window.location.href = payrollApi.exportCsvUrl(month);
  };

  const modalRow = reviewModal
    ? rows.find((r) => r.employee_id === reviewModal)
    : null;

  // ── Locked: require the payroll passcode before showing anything ──
  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50">
              <Lock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Payroll is protected
              </h2>
              <p className="text-sm text-slate-500">
                Enter the payroll passcode to continue.
              </p>
            </div>
          </div>
          <input
            type="password"
            autoFocus
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder="Payroll passcode"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {unlockError && <p className="text-sm text-red-600">{unlockError}</p>}
          <Button
            type="submit"
            disabled={unlocking || !passcodeInput}
            isLoading={unlocking}
            className="w-full justify-center"
          >
            {!unlocking && "Unlock"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {isFinalized && (
            <div className="group relative">
               <div className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[13px] font-medium cursor-help">
                 <CheckCircle2 className="w-4 h-4" />
                 Finalized
                 <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
               </div>
               <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50 w-72">
                  <div className="p-3 bg-white rounded-xl shadow-xl border border-slate-200 text-sm">
                    <p className="text-slate-800 font-medium mb-1">
                      Payroll for {month} is finalized and locked.
                      {preview?.finalized_at ? ` Finalized ${fmtStamp(preview.finalized_at)}.` : ""}
                    </p>
                    <p className="text-slate-500 text-xs mb-3">
                      Undo to unlock it for editing — all deductions, bonuses and additional payments are kept exactly as they are.
                    </p>
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => reopenMutation.mutate()} disabled={reopenMutation.isPending} isLoading={reopenMutation.isPending}>
                      {!reopenMutation.isPending && (
                        <><RotateCcw className="w-3.5 h-3.5 mr-1" /> Undo Finalize</>
                      )}
                    </Button>
                  </div>
               </div>
            </div>
          )}

          {wasReopened && (
            <div className="group relative">
               <div className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[13px] font-medium cursor-help">
                 <Unlock className="w-4 h-4" />
                 Reopened
                 <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
               </div>
               <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50 w-72">
                  <div className="p-3 bg-white rounded-xl shadow-xl border border-slate-200 text-sm">
                    <p className="text-slate-800 font-medium mb-1">
                      Payroll for {month} was reopened
                      {preview?.reopened_at ? ` ${fmtStamp(preview.reopened_at)}` : ""}.
                    </p>
                    <p className="text-slate-500 text-xs">
                      Your previously finalized figures are loaded and editable — re-finalize when you're done.
                    </p>
                  </div>
               </div>
            </div>
          )}

          <DatePicker
            type="month"
            value={month || ""}
            onChange={(e) => setMonth(e.target.value)}
            className="w-40"
          />
          <Button
            onClick={handleGenerate}
            disabled={isFetching}
            isLoading={isFetching}
            className="h-9 px-4 font-semibold rounded-lg shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-95"
          >
            {!isFetching && (
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-100" />
                Generate Payroll
              </span>
            )}
          </Button>

        </div>
      </div>

      {/* Toolbar */}
      {(generated || isFetching) && (
        <div className="flex items-center justify-between w-full px-1">
          {/* Left: Search */}
          <div className="flex items-center gap-3">
            {rows.length > 0 && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => onSearch(e.target.value)}
                  placeholder="Search by name or type…"
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                />
              </div>
            )}
          </div>

          {/* Right: Filter + Stats Pill */}
          <div className="flex items-center gap-3">
            {/* Filter */}
            {rows.length > 0 && (
              <div ref={filterRef} className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen((o) => !o)}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Filter className="w-4 h-4 text-slate-500" />
                  Filters
                  {typeFilter && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold">
                      1
                    </span>
                  )}
                </button>
    
                {filterOpen && (
                  <div className="absolute right-0 mt-1.5 z-40 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-3">
                    <div className="flex flex-col gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Employment Type
                        </label>
                        <Dropdown
                          options={[
                            { value: "", label: "All Types" },
                            ...typeOptions.map((t) => ({ value: t, label: t })),
                          ]}
                          value={typeFilter}
                          onChange={(val) => setTypeFilter(val)}
                          placeholder="All Types"
                          optionsClassName="w-full"
                        />
                      </div>
                    </div>
                    {typeFilter && (
                      <button
                        type="button"
                        onClick={() => setTypeFilter("")}
                        className="w-full text-center mt-2.5 pt-2.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 border-t border-slate-100"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Stats Pill */}
            {preview && (
            <div className="inline-flex items-center h-9 rounded-lg border border-slate-200 bg-white text-[13px] whitespace-nowrap">
              <div className="group relative flex items-center gap-1.5 px-3 border-r border-slate-200">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">{totals.employeesWithSalary}/{rows.length}</span>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                  <div className="px-2.5 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg shadow-lg border border-slate-200 whitespace-nowrap">
                    Employees
                  </div>
                </div>
              </div>
              <div className="group relative flex items-center gap-1.5 px-3 border-r border-slate-200">
                <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-semibold text-indigo-600">{fmtCurrency(totals.baseSalary)}</span>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                  <div className="px-2.5 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg shadow-lg border border-slate-200 whitespace-nowrap">
                    Total Base Salary
                  </div>
                </div>
              </div>
              <div className="group relative flex items-center gap-1.5 px-3 border-r border-slate-200">
                <Gift className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-amber-600">{fmtCurrency(totals.totalBonus)}</span>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                  <div className="px-2.5 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg shadow-lg border border-slate-200 whitespace-nowrap">
                    Total Bonus
                  </div>
                </div>
              </div>
              <div className="group relative flex items-center gap-1.5 px-3 border-r border-slate-200">
                <Minus className="w-4 h-4 text-red-500" />
                <span className="font-semibold text-red-600">{fmtCurrency(totals.totalDeduction)}</span>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                  <div className="px-2.5 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg shadow-lg border border-slate-200 whitespace-nowrap">
                    Total Deductions
                  </div>
                </div>
              </div>
              <div className="group relative flex items-center gap-1.5 px-3 border-r border-slate-200">
                <PlusCircle className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-semibold text-sky-600">{fmtCurrency(totals.totalAdditional)}</span>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                  <div className="px-2.5 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg shadow-lg border border-slate-200 whitespace-nowrap">
                    Total Additional
                  </div>
                </div>
              </div>
              <div className="group relative flex items-center gap-1.5 px-3">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold text-emerald-600">{fmtCurrency(totals.finalSalary)}</span>
                <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                  <div className="px-2.5 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg shadow-lg border border-slate-200 whitespace-nowrap">
                    Total Payable
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Main table */}
      {generated && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          {rows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              No active employees found.
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              No people match “{search}”.
            </div>
          ) : (
            <Table
              columns={columns}
              data={filtered}
              loading={isFetching}
              currentPage={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              variant="untitled"
              tableLayout="auto"
              emptyState={{
                title: "No employees found",
                description: "Try adjusting your search.",
              }}
            />
          )}

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end flex-wrap gap-3 rounded-b-2xl">
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleExportCSV}>
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              {isFinalized ? (
                <>
                  {/* Locked: the only ways forward are unlock (safe) or start over
                      (destructive). Saving is disabled until one is chosen. */}
                  <Button
                    variant="secondary"
                    onClick={() => reopenMutation.mutate()}
                    disabled={reopenMutation.isPending}
                    isLoading={reopenMutation.isPending}
                  >
                    {!reopenMutation.isPending && (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        Undo Finalize
                      </>
                    )}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setDiscardConfirmText("");
                      setConfirmDiscard(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Discard Run
                  </Button>
                </>
              ) : (
                <>
                  {/* An existing draft run can also be thrown away to get back to
                      the auto-computed figures. */}
                  {preview?.run_id ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setDiscardConfirmText("");
                        setConfirmDiscard(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Discard Run
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    onClick={() => handleSave("draft")}
                    disabled={saveMutation.isPending}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => handleSave("finalized")}
                    disabled={saveMutation.isPending}
                    isLoading={saveMutation.isPending}
                  >
                    {!saveMutation.isPending && "Finalize Payroll"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state before generate */}
      {!generated && !isFetching && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center py-20 text-slate-400">
          <IndianRupee className="w-12 h-12 mb-4 text-slate-200" />
          <p className="font-medium text-slate-500">
            Select a month and click Generate
          </p>
          <p className="text-sm mt-1">Salary calculations will appear here</p>
        </div>
      )}

      {/* Leave Review Modal */}
      {reviewModal && modalRow && (
        <Modal isOpen onClose={() => setReviewModal(null)} size="lg">
          <Modal.Header onClose={() => setReviewModal(null)}>
            <h3 className="font-bold text-lg text-slate-800">
              {isFinalized ? "Leave Adjustments (locked)" : "Leave Adjustments"}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {modalRow.employee_name} · {month}
              {isFinalized && " · finalized — undo to edit"}
            </p>
          </Modal.Header>

          <Modal.Body className="!p-0">
            {/* Annual paid-leave balances (computed locally; Razorpay has no balance API) */}
            {modalRow.leave_balances && (
              <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap gap-2">
                {Object.entries(modalRow.leave_balances).map(([type, b]) => (
                  <span
                    key={type}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600"
                  >
                    {LEAVE_LABELS[type] || type}:{" "}
                    <span
                      className={`font-semibold ${b.remaining > 0 ? "text-emerald-700" : "text-red-600"}`}
                    >
                      {b.remaining}
                    </span>
                    <span className="text-slate-400">
                      {" "}
                      left of {b.quota} ({b.period === "month" ? "mo" : "yr"})
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Leave list */}
            <div className="divide-y divide-slate-100">
              {modalRow.leaves.map((l) => {
                const badge =
                  l.classification === "paid"
                    ? { txt: "Paid", cls: "bg-emerald-100 text-emerald-700" }
                    : l.classification === "unpaid"
                      ? { txt: "Unpaid", cls: "bg-red-100 text-red-700" }
                      : {
                          txt: "Partly unpaid",
                          cls: "bg-amber-100 text-amber-700",
                        };
                const dateList = l.dates || [];
                const allDates = dateList.map((d) => d.date);
                const autoUnpaid = dateList
                  .filter((d) => d.auto_unpaid)
                  .map((d) => d.date);
                const curUnpaid = dateList
                  .filter((d) => d.unpaid)
                  .map((d) => d.date);
                const isAuto =
                  curUnpaid.length === autoUnpaid.length &&
                  curUnpaid.every((x) => autoUnpaid.includes(x));
                return (
                  <div key={l.leave_id} className="px-6 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">
                            {LEAVE_LABELS[l.leave_type] || l.leave_type}
                          </span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {l.days_in_month}d
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.cls}`}
                          >
                            {badge.txt}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {l.start_date} → {l.end_date}
                          {l.reason && ` · ${l.reason}`}
                        </p>
                        <p className="text-xs font-medium mt-0.5 text-slate-600">
                          {l.paidDays > 0 && (
                            <span className="text-emerald-600">
                              {l.paidDays}d paid
                            </span>
                          )}
                          {l.paidDays > 0 && l.unpaidDays > 0 && " · "}
                          {l.unpaidDays > 0 && (
                            <span className="text-red-600">
                              {l.unpaidDays}d unpaid −
                              {fmtCurrency(l.deductionAmount)}
                            </span>
                          )}
                          {l.unpaidDays <= 0 &&
                            l.paidDays === l.days_in_month && (
                              <span className="text-emerald-600">
                                {" "}
                                — no deduction
                              </span>
                            )}
                        </p>
                      </div>
                      {/* Quick set: Auto / All unpaid / All paid. Hidden while the
                          run is finalized — the modal is read-only until undo. */}
                      {!isFinalized && (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => setLeaveDates(l.leave_id, autoUnpaid)}
                            title={`Auto (balance-based): ${autoUnpaid.length}d unpaid`}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              isAuto
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                            }`}
                          >
                            Auto
                          </button>
                          <button
                            onClick={() => setLeaveDates(l.leave_id, allDates)}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              !isAuto && l.unpaidDays >= l.days_in_month
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            }`}
                          >
                            All unpaid
                          </button>
                          <button
                            onClick={() => setLeaveDates(l.leave_id, [])}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              !isAuto && l.unpaidDays <= 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                            }`}
                          >
                            All paid
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Per-day toggles — click a day to flip paid/unpaid; the rest stay as-is */}
                    {dateList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {dateList.map((d) => (
                          <button
                            key={d.date}
                            onClick={() => toggleLeaveDay(l, d.date)}
                            disabled={isFinalized}
                            title={
                              isFinalized
                                ? d.unpaid
                                  ? "Unpaid (locked)"
                                  : "Paid (locked)"
                                : d.unpaid
                                  ? "Unpaid — click to mark paid"
                                  : "Paid — click to mark unpaid"
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              d.unpaid
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700"
                            } ${isFinalized ? "cursor-default opacity-80" : d.unpaid ? "hover:bg-red-100" : "hover:bg-emerald-100"} ${d.unpaid !== d.auto_unpaid ? "ring-1 ring-indigo-300" : ""}`}
                          >
                            {fmtDay(d.date)} · {d.unpaid ? "Unpaid" : "Paid"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Modal.Body>

          {/* Modal summary */}
          <Modal.Footer align="between">
            <div className="space-y-0.5 text-sm">
              <p className="text-slate-500">
                Deducted:{" "}
                <span className="font-semibold text-red-600">
                  −{fmtCurrency(modalRow.total_deduction)}
                </span>
              </p>
              <p className="text-slate-500">
                Final salary:{" "}
                <span className="font-bold text-emerald-700">
                  {fmtCurrency(modalRow.final_salary)}
                </span>
              </p>
            </div>
            <Button onClick={() => setReviewModal(null)}>Done</Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Discard confirmation — destructive, so it needs the month typed out.
          This is NOT the undo: it deletes the saved run and its adjustments. */}
      {confirmDiscard && (
        <Modal isOpen onClose={() => setConfirmDiscard(false)} size="md">
          <Modal.Header onClose={() => setConfirmDiscard(false)}>
            <h3 className="font-bold text-lg text-slate-800">
              Discard payroll run?
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">{month}</p>
          </Modal.Header>

          <Modal.Body className="space-y-3">
            <div className="flex gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-800">
                This deletes the saved run for {month} — every leave override,
                bonus and additional payment on it. The month will recompute from
                the automatic leave classification. This can't be undone.
              </p>
            </div>
            <p className="text-sm text-slate-500">
              Want to keep the figures and just unlock the month?{" "}
              <span className="font-medium text-slate-700">
                Use Undo Finalize instead.
              </span>
            </p>
            <div>
              <label className="text-xs font-medium text-slate-500">
                Type <span className="font-mono text-slate-700">{month}</span> to
                confirm
              </label>
              <input
                autoFocus
                value={discardConfirmText}
                onChange={(e) => setDiscardConfirmText(e.target.value)}
                placeholder={month}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
          </Modal.Body>

          <Modal.Footer align="between">
            <Button
              variant="secondary"
              onClick={() => setConfirmDiscard(false)}
              disabled={discardMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => discardMutation.mutate()}
              disabled={
                discardConfirmText.trim() !== month || discardMutation.isPending
              }
              isLoading={discardMutation.isPending}
            >
              {!discardMutation.isPending && (
                <>
                  <Trash2 className="w-4 h-4" />
                  Discard Run
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default PayrollPage;
