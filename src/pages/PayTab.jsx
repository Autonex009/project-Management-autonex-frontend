import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Edit2,
  Save,
  X,
  Search,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Filter,
  Check,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import { payrollApi } from "../services/api";
import { usePayrollStore } from "../store/usePayrollStore";
import { Table } from "../components/ui/Table";
import Dropdown from "../components/ui/Dropdown";
import { formatDisplayName, getNameInitials } from "../utils/displayName";

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name A → Z" },
  { value: "name-desc", label: "Name Z → A" },
  { value: "base-high", label: "Base Pay: High → Low" },
  { value: "base-low", label: "Base Pay: Low → High" },
];

const toNum = (s) => Number(String(s ?? "").replace(/[^0-9.]/g, "")) || 0;
const isActive = (status) => (status || "").trim().toLowerCase() !== "inactive";
const rowKey = (row) =>
  row.id != null ? `s-${row.id}` : `e-${row.employee_id}`;

const PayTab = () => {
  const queryClient = useQueryClient();

  const {
    payTabEdits: edits,
    setPayTabEdits: setEdits,
    payTabSearch: search,
    setPayTabSearch: setSearch,
    payTabSortBy: sortBy,
    setPayTabSortBy: setSortBy,
    payTabTypeFilter: typeFilter,
    setPayTabTypeFilter: setTypeFilter,
    payTabStatusFilter: statusFilter,
    setPayTabStatusFilter: setStatusFilter,
    payTabPage: page,
    setPayTabPage: setPage,
  } = usePayrollStore();

  const [savingKey, setSavingKey] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["salary-records"],
    queryFn: () => payrollApi.getSalaryRecords(),
    staleTime: 0,
  });

  const salaries = data?.salaries || [];

  const invalidate = () => {
    queryClient.invalidateQueries(["salary-records"]);
    queryClient.invalidateQueries(["payroll-preview"]);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, baseMonthly, bonusMonthly }) =>
      payrollApi.updateSalaryRecord(id, { baseMonthly, bonusMonthly }),
    onSuccess: (_res, vars) => {
      setEdits((p) => {
        const n = { ...p };
        delete n[vars.key];
        return n;
      });
      setSavingKey(null);
      invalidate();
    },
    onError: (err) => {
      setSavingKey(null);
      toast.error(err.response?.data?.detail || "Failed to save salary");
    },
  });

  const createMutation = useMutation({
    mutationFn: ({ employeeId, baseMonthly, bonusMonthly }) =>
      payrollApi.createSalaryRecord(employeeId, { baseMonthly, bonusMonthly }),
    onSuccess: (_res, vars) => {
      setEdits((p) => {
        const n = { ...p };
        delete n[vars.key];
        return n;
      });
      setSavingKey(null);
      invalidate();
    },
    onError: (err) => {
      setSavingKey(null);
      toast.error(err.response?.data?.detail || "Failed to save salary");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      payrollApi.setSalaryRecordStatus(id, status),
    onSuccess: (_res, vars) => {
      toast.success(
        vars.status === "Active"
          ? "Marked active"
          : "Marked inactive — excluded from Monthly Pay",
      );
      invalidate();
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to update status"),
  });

  const totals = useMemo(() => {
    const active = salaries.filter((r) => isActive(r.status)).length;
    return {
      total: salaries.length,
      active,
      inactive: salaries.length - active,
    };
  }, [salaries]);

  const PAGE_SIZE = 12;
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const sortRef = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const typeOptions = useMemo(() => {
    const types = new Set(salaries.map((r) => r.employment_type).filter(Boolean));
    return [...types].sort();
  }, [salaries]);

  const activeFilterCount = [typeFilter, statusFilter].filter(Boolean).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = salaries;

    // text search
    if (q) {
      result = result.filter(
        (r) =>
          (r.full_name || "").toLowerCase().includes(q) ||
          (r.employment_type || "").toLowerCase().includes(q),
      );
    }

    // type filter
    if (typeFilter) {
      result = result.filter((r) => r.employment_type === typeFilter);
    }

    // status filter
    if (statusFilter === "Active") {
      result = result.filter((r) => isActive(r.status));
    } else if (statusFilter === "Inactive") {
      result = result.filter((r) => !isActive(r.status));
    }

    // sort: active first within each sort order
    result = [...result].sort((a, b) => {
      const aActive = isActive(a.status) ? 0 : 1;
      const bActive = isActive(b.status) ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;

      switch (sortBy) {
        case "name-desc":
          return (b.full_name || "").localeCompare(a.full_name || "");
        case "base-high":
          return (toNum(b.base_pay_monthly) || 0) - (toNum(a.base_pay_monthly) || 0);
        case "base-low":
          return (toNum(a.base_pay_monthly) || 0) - (toNum(b.base_pay_monthly) || 0);
        case "name-asc":
        default:
          return (a.full_name || "").localeCompare(b.full_name || "");
      }
    });

    return result;
  }, [salaries, search, sortBy, typeFilter, statusFilter]);

  const startEdit = (row) =>
    setEdits((p) => ({
      ...p,
      [rowKey(row)]: {
        base: toNum(row.base_pay_monthly) || "",
        bonus: toNum(row.opt_bonus_monthly) || "",
      },
    }));
    
  const cancelEdit = (row) =>
    setEdits((p) => {
      const n = { ...p };
      delete n[rowKey(row)];
      return n;
    });

  const saveEdit = (row) => {
    const key = rowKey(row);
    const e = edits[key];
    const base = parseFloat(e.base);
    if (!base || base <= 0) {
      toast.error("Enter a valid base pay");
      return;
    }
    const bonus = e.bonus === "" ? null : parseFloat(e.bonus);
    setSavingKey(key);
    if (row.id != null) {
      updateMutation.mutate(
        { id: row.id, key, baseMonthly: base, bonusMonthly: bonus },
        { onSuccess: () => toast.success("Salary saved") }
      );
    } else {
      createMutation.mutate(
        { employeeId: row.employee_id, key, baseMonthly: base, bonusMonthly: bonus },
        { onSuccess: () => toast.success("Salary saved") }
      );
    }
  };

  const saveAllEdits = async () => {
    const keys = Object.keys(edits);
    if (keys.length === 0) return;

    const invalidKeys = keys.filter(key => {
      const base = parseFloat(edits[key].base);
      return !base || base <= 0;
    });

    if (invalidKeys.length > 0) {
      toast.error("Please ensure all base pays are valid numbers greater than 0");
      return;
    }

    const toastId = toast.loading("Saving all edits...");

    try {
      for (const key of keys) {
        const e = edits[key];
        const base = parseFloat(e.base);
        const bonus = e.bonus === "" ? null : parseFloat(e.bonus);
        
        const row = salaries.find(r => rowKey(r) === key);
        if (!row) continue;
        
        if (row.id != null) {
          await payrollApi.updateSalaryRecord(row.id, { baseMonthly: base, bonusMonthly: bonus });
        } else {
          await payrollApi.createSalaryRecord(row.employee_id, { baseMonthly: base, bonusMonthly: bonus });
        }
      }
      toast.success("All edits saved successfully", { id: toastId });
      setEdits({});
      invalidate();
    } catch (err) {
      toast.error("Failed to save some edits", { id: toastId });
    }
  };

  const toggleStatus = (row) => {
    if (row.id == null) return;
    statusMutation.mutate({
      id: row.id,
      status: isActive(row.status) ? "Inactive" : "Active",
    });
  };

  const columns = [
    {
      key: "employee",
      label: (
        <button
          type="button"
          onClick={() => setSortBy(sortBy === "name-asc" ? "name-desc" : "name-asc")}
          className="inline-flex items-center gap-1 hover:text-slate-900"
          title="Sort by name"
        >
          Employee
          {sortBy === "name-asc" ? (
            <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
          ) : sortBy === "name-desc" ? (
            <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      ),
      width: "w-[24%]",
      render: (_, row) => {
        const active = isActive(row.status);
        const shortName = formatDisplayName(row.full_name) || row.full_name;
        return (
          <div className="flex items-center gap-3">
            {row.avatar_url ? (
              <img
                src={row.avatar_url}
                alt={shortName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600 text-[13px] font-semibold">
                {getNameInitials(row.full_name)}
              </div>
            )}
            <div className="group relative min-w-0">
              <div 
                className={`font-semibold truncate ${active ? "text-slate-800" : "text-slate-500"}`}
              >
                {shortName}
              </div>
              {row.full_name !== shortName && (
                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                  <div className="px-2.5 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg shadow-lg border border-slate-200 whitespace-nowrap">
                    {row.full_name}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: "employment_type",
      label: "Employment Type",
      width: "w-[16%]",
      render: (_, row) => (
        <span className="text-slate-600">
          {row.employment_type || "—"}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      width: "w-[12%]",
      render: (_, row) => {
        const active = isActive(row.status);
        const unset = row.id == null;
        if (unset) {
          return (
            <span
              title="Save a base pay below to create this person's salary record"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-400"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              Not set
            </span>
          );
        }
        return (
          <button
            onClick={() => toggleStatus(row)}
            disabled={statusMutation.isPending}
            title={active ? "Click to mark Inactive" : "Click to mark Active"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
              active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-200 text-slate-500 hover:bg-slate-300"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
            {active ? "Active" : "Inactive"}
          </button>
        );
      }
    },
    {
      key: "base_pay",
      label: "Base Pay (Monthly)",
      align: "right",
      width: "w-[18%]",
      render: (_, row) => {
        const key = rowKey(row);
        const editing = edits[key] !== undefined;
        const unset = row.id == null;
        if (editing) {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-slate-400">₹</span>
              <input
                type="number"
                autoFocus
                value={edits[key].base}
                onChange={(e) =>
                  setEdits((p) => ({
                    ...p,
                    [key]: { ...p[key], base: e.target.value },
                  }))
                }
                onWheel={(e) => e.target.blur()}
                placeholder="Base pay"
                className="w-28 px-2 py-1 border border-indigo-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          );
        }
        if (unset) {
          return (
            <span className="inline-flex items-center justify-end gap-1 text-xs font-medium text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              Not set
            </span>
          );
        }
        return (
          <span 
            className="font-mono text-slate-700 cursor-pointer select-none inline-block w-full text-right"
            onDoubleClick={() => startEdit(row)}
            title="Double click to edit"
          >
            {row.base_pay_monthly ?? "—"}
          </span>
        );
      }
    },
    {
      key: "bonus",
      label: "Bonus (Monthly)",
      align: "right",
      width: "w-[16%]",
      render: (_, row) => {
        const key = rowKey(row);
        const editing = edits[key] !== undefined;
        if (editing) {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-slate-400">₹</span>
              <input
                type="number"
                value={edits[key].bonus}
                onChange={(e) =>
                  setEdits((p) => ({
                    ...p,
                    [key]: { ...p[key], bonus: e.target.value },
                  }))
                }
                onWheel={(e) => e.target.blur()}
                placeholder="0"
                className="w-24 px-2 py-1 border border-indigo-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          );
        }
        return (
          <span 
            className="font-mono text-slate-500 cursor-pointer select-none inline-block w-full text-right"
            onDoubleClick={() => startEdit(row)}
            title="Double click to edit"
          >
            {row.opt_bonus_monthly ?? "—"}
          </span>
        );
      }
    },
    {
      key: "actions",
      label: "Actions",
      align: "center",
      width: "w-[14%]",
      render: (_, row) => {
        const key = rowKey(row);
        const editing = edits[key] !== undefined;
        if (editing) {
          return (
            <div className="flex items-center justify-center gap-1.5">
              <button
                onClick={() => saveEdit(row)}
                disabled={savingKey === key}
                className="px-2.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-50 text-xs font-semibold"
                title="Save"
              >
                Save
              </button>
              <button
                onClick={() => cancelEdit(row)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-center">
            <button
              onClick={() => startEdit(row)}
              className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-lg transition-colors"
              title="Edit pay"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between w-full px-1">
        {/* Left: Search + Save All */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or type…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
            />
          </div>

          {Object.keys(edits).length > 1 && (
            <button
              onClick={saveAllEdits}
              className="flex items-center gap-1.5 h-9 px-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors text-[13px] font-semibold border border-indigo-100/50"
            >
              <Save className="w-3.5 h-3.5" /> Save All
            </button>
          )}
        </div>

        {/* Right: Filter + Sort + Stats */}
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-4 h-4 text-slate-500" />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold">
                  {activeFilterCount}
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Status
                    </label>
                    <Dropdown
                      options={[
                        { value: "", label: "All" },
                        { value: "Active", label: "Active" },
                        { value: "Inactive", label: "Inactive" },
                      ]}
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val)}
                      placeholder="All"
                      optionsClassName="w-full"
                    />
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter("");
                      setStatusFilter("");
                    }}
                    className="w-full text-center mt-2.5 pt-2.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 border-t border-slate-100"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sort Menu */}
          <div ref={sortRef} className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">
                Sort: {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${sortOpen ? "rotate-180" : ""}`}
              />
            </button>

            {sortOpen && (
              <div className="absolute right-0 mt-1.5 z-40 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {opt.label}
                    {sortBy === opt.value && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats pills */}
          <div className="inline-flex items-center h-9 rounded-lg border border-slate-200 bg-white overflow-hidden text-[13px]">
            <div className="flex items-center gap-1.5 px-3 border-r border-slate-200">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-700">{totals.total}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 border-r border-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold text-emerald-600">{totals.active}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3">
              <UserX className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-semibold text-rose-500">{totals.inactive}</span>
            </div>
          </div>
        </div>
      </div>

      <Table 
        columns={columns}
        data={filtered}
        currentPage={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={isLoading}
        variant="untitled"
        emptyState={
          isError ? (
            <div className="flex items-center justify-center py-16 text-red-400 text-sm">Failed to load salary records.</div>
          ) : (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">No records found.</div>
          )
        }
      />
    </div>
  );
};

export default PayTab;
