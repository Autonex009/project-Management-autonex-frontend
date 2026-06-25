import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '../services/api';
import toast from 'react-hot-toast';
import {
    Download, CheckCircle2, XCircle, AlertTriangle, IndianRupee,
    Users, TrendingDown, Wallet, X, ChevronDown, ChevronRight, ChevronLeft, Lock, Gift, PlusCircle, Search
} from 'lucide-react';

const LEAVE_LABELS = {
    paid: 'Paid', casual_sick: 'Casual/Sick', floater: 'Floater',
};

const fmt = (n) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtCurrency = (n) => `₹${fmt(n)}`;

// Format an ISO date 'YYYY-MM-DD' as e.g. '23 Apr' without timezone shifts.
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (iso) => {
    const [, m, d] = (iso || '').split('-');
    return m && d ? `${parseInt(d, 10)} ${MONTHS_SHORT[parseInt(m, 10) - 1]}` : iso;
};

const currentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const PayrollPage = () => {
    const queryClient = useQueryClient();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [month, setMonth] = useState(currentMonthStr());
    const [generated, setGenerated] = useState(false);

    // leave_id → deduct (true/false)
    const [adjustments, setAdjustments] = useState({});

    // employee_id → bonus amount (number). Absent = use the saved/default value.
    const [bonuses, setBonuses] = useState({});

    // employee_id → additional payment amount (number). Absent = use the saved/default value.
    const [additionalPayments, setAdditionalPayments] = useState({});

    // Search + pagination (display only — totals/save/CSV use the full `rows`).
    const PAGE_SIZE = 12;
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);


    // Which employee's leave modal is open
    const [reviewModal, setReviewModal] = useState(null); // employee row object

    // ── Payroll passcode gate ──────────────────────────────────────────
    const [unlocked, setUnlocked] = useState(!!sessionStorage.getItem('payroll_passcode'));
    const [passcodeInput, setPasscodeInput] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const [unlockError, setUnlockError] = useState('');

    const handleUnlock = async (e) => {
        e.preventDefault();
        setUnlocking(true);
        setUnlockError('');
        sessionStorage.setItem('payroll_passcode', passcodeInput);
        try {
            // Validate the passcode against the server (also no-op if the gate is disabled).
            await payrollApi.getPreview(currentMonthStr());
            setUnlocked(true);
            setPasscodeInput('');
        } catch (err) {
            if (err.response?.status === 401) {
                sessionStorage.removeItem('payroll_passcode');
                setUnlockError('Incorrect payroll passcode.');
            } else {
                // Non-auth error (e.g. network) — passcode itself was accepted.
                setUnlocked(true);
                setPasscodeInput('');
            }
        } finally {
            setUnlocking(false);
        }
    };

    const handleLock = () => {
        sessionStorage.removeItem('payroll_passcode');
        setUnlocked(false);
    };

    const { data: preview, isLoading, refetch } = useQuery({
        queryKey: ['payroll-preview', month],
        queryFn: () => payrollApi.getPreview(month),
        enabled: false,
        staleTime: 0,
    });

    const saveMutation = useMutation({
        mutationFn: (body) => payrollApi.save(body),
        onSuccess: (data) => {
            toast.success(data.status === 'finalized' ? 'Payroll finalized!' : 'Draft saved');
            queryClient.invalidateQueries(['payroll-preview', month]);
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to save payroll'),
    });


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

    // Admin override: set the exact list of UNPAID dates (ISO strings) for a leave.
    const setLeaveDates = (leaveId, unpaidDates) => {
        setAdjustments(prev => ({ ...prev, [leaveId]: unpaidDates }));
    };

    // Flip a single day of a leave between paid and unpaid; rest stay as-is.
    const toggleLeaveDay = (leaf, date) => {
        const current = leaf.dates.filter(d => d.unpaid).map(d => d.date);
        const set = new Set(current);
        if (set.has(date)) set.delete(date); else set.add(date);
        setLeaveDates(leaf.leave_id, Array.from(set));
    };

    // Recompute rows with current adjustments applied
    const rows = useMemo(() => {
        if (!preview?.employees) return [];
        return preview.employees.map(emp => {
            const perDay = emp.base_salary ? emp.base_salary / (preview.working_days || 22) : 0;
            let totalDeductedDays = 0;
            let totalPaidDays = 0;
            const leaves = emp.leaves.map(l => {
                const backendDates = l.dates || [];
                // Effective unpaid dates: admin override if any, else the backend's per-date default.
                const override = adjustments[l.leave_id];
                const unpaidSet = new Set(
                    override ?? backendDates.filter(d => d.unpaid).map(d => d.date)
                );
                const dates = backendDates.map(d => ({ ...d, unpaid: unpaidSet.has(d.date) }));
                const unpaidDays = dates.filter(d => d.unpaid).length;
                const paidDays = Math.max(l.days_in_month - unpaidDays, 0);
                const deductionAmount = unpaidDays * perDay;
                totalDeductedDays += unpaidDays;
                totalPaidDays += paidDays;
                const classification = unpaidDays <= 0
                    ? 'paid'
                    : (unpaidDays >= l.days_in_month ? 'unpaid' : 'partial');
                return { ...l, dates, unpaidDays, paidDays, classification, deduct: unpaidDays > 0, deductionAmount };
            });
            const totalDeduction = totalDeductedDays * perDay;
            // Bonus: capped at the employee's limit; uses the in-progress edit if any,
            // else the saved/default amount from the preview.
            const bonusLimit = emp.bonus_limit || 0;
            const rawBonus = bonuses[emp.employee_id] ?? emp.bonus ?? 0;
            const bonus = Math.max(0, Math.min(Number(rawBonus) || 0, bonusLimit));
            // Additional payment: free-form, no cap (just non-negative).
            const rawAdditional = additionalPayments[emp.employee_id] ?? emp.additional_payment ?? 0;
            const additional = Math.max(0, Number(rawAdditional) || 0);
            const finalSalary = Math.max((emp.base_salary || 0) - totalDeduction, 0) + bonus + additional;
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

    const totals = useMemo(() => ({
        baseSalary: rows.reduce((s, r) => s + (r.base_salary || 0), 0),
        totalDeduction: rows.reduce((s, r) => s + r.total_deduction, 0),
        totalBonus: rows.reduce((s, r) => s + (r.bonus || 0), 0),
        totalAdditional: rows.reduce((s, r) => s + (r.additional_payment || 0), 0),
        finalSalary: rows.reduce((s, r) => s + r.final_salary, 0),
        employeesWithSalary: rows.filter(r => r.base_salary).length,
    }), [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r =>
            (r.employee_name || '').toLowerCase().includes(q) ||
            (r.designation || '').toLowerCase().includes(q) ||
            (r.employee_type || '').toLowerCase().includes(q)
        );
    }, [rows, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const onSearch = (v) => { setSearch(v); setPage(1); };

    const buildAdjustmentsPayload = () =>
        rows.flatMap(emp =>
            emp.leaves.map(l => ({
                employee_id: emp.employee_id,
                leave_id: l.leave_id,
                deduct: l.deduct,
                unpaid_days: l.unpaidDays,
                unpaid_dates: (l.dates || []).filter(d => d.unpaid).map(d => d.date),
            }))
        );

    const buildBonusesPayload = () =>
        rows
            .filter(r => (r.bonus || 0) > 0)
            .map(r => ({ employee_id: r.employee_id, amount: r.bonus }));

    const buildAdditionalPaymentsPayload = () =>
        rows
            .filter(r => (r.additional_payment || 0) > 0)
            .map(r => ({ employee_id: r.employee_id, amount: r.additional_payment }));

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
        const headers = [
            'Employee', 'Designation', 'Type',
            'Base Salary (₹)', `Per Day (₹, ÷${preview?.working_days || 22})`,
            'Leave Days', 'Paid Days', 'Unpaid (Deducted) Days', 'Deduction (₹)', 'Bonus (₹)', 'Additional Payments (₹)', 'Final Salary (₹)', 'Notes'
        ];
        const csvRows = [
            headers.join(','),
            ...rows.map(r => [
                `"${r.employee_name}"`,
                `"${r.designation || ''}"`,
                `"${r.employee_type}"`,
                r.base_salary || 0,
                r.per_day_rate.toFixed(2),
                r.total_leave_days,
                r.total_paid_days,
                r.total_deducted_days,
                r.total_deduction.toFixed(2),
                (r.bonus || 0).toFixed(2),
                (r.additional_payment || 0).toFixed(2),
                r.final_salary.toFixed(2),
                r.salary_missing ? '"Salary not set"' : '',
            ].join(','))
        ];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll_${month}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const modalRow = reviewModal ? rows.find(r => r.employee_id === reviewModal) : null;

    // ── Locked: require the payroll passcode before showing anything ──
    if (!unlocked) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <form onSubmit={handleUnlock} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50"><Lock className="w-5 h-5 text-indigo-600" /></div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Payroll is protected</h2>
                            <p className="text-sm text-slate-500">Enter the payroll passcode to continue.</p>
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
                    <button
                        type="submit"
                        disabled={unlocking || !passcodeInput}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {unlocking ? 'Checking…' : 'Unlock'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Salary Calculation</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {generated && preview ? `${preview.working_days} working-day` : 'Working-day'} payroll — review leaves, adjust deductions, export to Excel.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        value={month}
                        onChange={e => { setMonth(e.target.value); setGenerated(false); setAdjustments({}); }}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
                    >
                        {isLoading ? 'Loading...' : 'Generate'}
                    </button>
                    <button
                        onClick={handleLock}
                        title="Lock payroll"
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <Lock className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            {generated && preview && (
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Employees', value: totals.employeesWithSalary, suffix: `/ ${rows.length}`, icon: Users, color: 'text-slate-700', bg: 'bg-slate-100' },
                        { label: 'Total Base Salary', value: fmtCurrency(totals.baseSalary), icon: Wallet, color: 'text-indigo-700', bg: 'bg-indigo-100' },
                        { label: 'Total Deductions', value: fmtCurrency(totals.totalDeduction), icon: TrendingDown, color: 'text-red-700', bg: 'bg-red-100' },
                        { label: 'Total Bonus', value: fmtCurrency(totals.totalBonus), icon: Gift, color: 'text-amber-700', bg: 'bg-amber-100' },
                        { label: 'Total Additional', value: fmtCurrency(totals.totalAdditional), icon: PlusCircle, color: 'text-sky-700', bg: 'bg-sky-100' },
                        { label: 'Total Payable', value: fmtCurrency(totals.finalSalary), icon: IndianRupee, color: 'text-emerald-700', bg: 'bg-emerald-100' },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
                            <div className={`inline-flex p-2 rounded-xl ${s.bg} mb-3`}>
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                            <p className={`text-xl font-bold ${s.color}`}>{s.value}{s.suffix ? <span className="text-sm font-normal text-slate-400 ml-1">{s.suffix}</span> : null}</p>
                            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Payroll status banner */}
            {generated && preview?.run_status === 'finalized' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="text-sm text-emerald-800 font-medium">
                        Payroll for {month} has been finalized. You can still adjust and re-finalize.
                    </p>
                </div>
            )}

            {/* Search */}
            {generated && rows.length > 0 && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="Search by name, designation or type…"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                </div>
            )}

            {/* Main table */}
            {generated && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                    {rows.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                            No active employees found.
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                            No people match “{search}”.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/80 border-b border-slate-100">
                                    <tr>
                                        {['Employee', 'Base Salary / Per Day', 'Leaves', 'Deducted', 'Bonus', 'Additional Payments', 'Final Salary', 'Actions'].map(h => (
                                            <th key={h} className={`px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${
                                                ['Base Salary / Per Day', 'Leaves', 'Deducted', 'Bonus', 'Additional Payments', 'Final Salary'].includes(h) ? 'text-right' : 'text-left'
                                            }`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pagedRows.map(row => {
                                        return (
                                            <tr key={row.employee_id} className="hover:bg-slate-50/50 transition-colors">
                                                {/* Employee */}
                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-slate-800">{row.employee_name}</p>
                                                    <p className="text-xs text-slate-400">{row.designation} · {row.employee_type}</p>
                                                </td>

                                                {/* Base salary / per day — sourced from the Pay tab (read-only here) */}
                                                <td className="px-5 py-4 text-right">
                                                    {row.salary_missing ? (
                                                        <p className="text-xs text-amber-600 flex items-center justify-end gap-1">
                                                            <AlertTriangle className="w-3 h-3" />Set in Pay tab
                                                        </p>
                                                    ) : (
                                                        <div className="text-right">
                                                            <p className="font-semibold text-slate-800">{fmtCurrency(row.base_salary)}</p>
                                                            <p className="text-xs text-slate-400">{fmtCurrency(row.per_day_rate)}/day</p>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Leave days */}
                                                <td className="px-5 py-4 text-right">
                                                    {row.total_leave_days > 0 ? (
                                                        <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                            {row.total_leave_days}d
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">—</span>
                                                    )}
                                                </td>

                                                {/* Deducted */}
                                                <td className="px-5 py-4 text-right">
                                                    {row.total_deduction > 0 ? (
                                                        <span className="text-red-600 font-medium">
                                                            −{fmtCurrency(row.total_deduction)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">—</span>
                                                    )}
                                                </td>

                                                {/* Bonus — granted up to the employee's limit (from the Pay tab) */}
                                                <td className="px-5 py-4 text-right">
                                                    {row.salary_missing || row.bonus_limit <= 0 ? (
                                                        <span className="text-slate-300 text-xs">—</span>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={row.bonus > 0}
                                                                onChange={(e) => setBonuses(p => ({ ...p, [row.employee_id]: e.target.checked ? row.bonus_limit : 0 }))}
                                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200 cursor-pointer"
                                                                title={row.bonus > 0 ? 'Remove bonus' : 'Grant bonus'}
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
                                                                            onChange={(e) => setBonuses(p => ({ ...p, [row.employee_id]: e.target.value }))}
                                                                            className="w-24 px-2 py-1 border border-indigo-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                                        />
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-400 mt-0.5">max {fmtCurrency(row.bonus_limit)}</p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-400">up to {fmtCurrency(row.bonus_limit)}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Additional payments — free-form extra amount */}
                                                <td className="px-5 py-4 text-right">
                                                    {row.salary_missing ? (
                                                        <span className="text-slate-300 text-xs">—</span>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span className="text-slate-400 text-xs">₹</span>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={additionalPayments[row.employee_id] ?? (row.additional_payment || '')}
                                                                onChange={(e) => setAdditionalPayments(p => ({ ...p, [row.employee_id]: e.target.value }))}
                                                                placeholder="0"
                                                                className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                                                            />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Final salary */}
                                                <td className="px-5 py-4 text-right">
                                                    <span className={`font-bold text-base ${row.salary_missing ? 'text-slate-300' : 'text-emerald-700'}`}>
                                                        {row.salary_missing ? '—' : fmtCurrency(row.final_salary)}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-5 py-4">
                                                    {row.leaves.length > 0 && (
                                                        <button
                                                            onClick={() => setReviewModal(row.employee_id)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                                                        >
                                                            Review Leaves
                                                            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-indigo-200 text-[10px] font-bold">
                                                                {row.leaves.length}
                                                            </span>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {/* Pagination */}
                            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
                                <span>
                                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(safePage - 1)}
                                        disabled={safePage <= 1}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                        title="Previous page"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs font-medium text-slate-600">Page {safePage} / {totalPages}</span>
                                    <button
                                        onClick={() => setPage(safePage + 1)}
                                        disabled={safePage >= totalPages}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                        title="Next page"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer actions */}
                    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
                        <div className="text-sm text-slate-500">
                            Total payable: <span className="font-bold text-emerald-700">{fmtCurrency(totals.finalSalary)}</span>
                            {' '}across <span className="font-semibold">{totals.employeesWithSalary}</span> employees
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExportCSV}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                            <button
                                onClick={() => handleSave('draft')}
                                disabled={saveMutation.isPending}
                                className="px-4 py-2 text-sm font-medium border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                Save Draft
                            </button>
                            <button
                                onClick={() => handleSave('finalized')}
                                disabled={saveMutation.isPending}
                                className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                {saveMutation.isPending ? 'Saving...' : 'Finalize Payroll'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state before generate */}
            {!generated && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center py-20 text-slate-400">
                    <IndianRupee className="w-12 h-12 mb-4 text-slate-200" />
                    <p className="font-medium text-slate-500">Select a month and click Generate</p>
                    <p className="text-sm mt-1">Salary calculations will appear here</p>
                </div>
            )}

            {/* Leave Review Modal */}
            {reviewModal && modalRow && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-full sm:max-w-lg my-2 sm:my-4">
                        {/* Modal header */}
                        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Leave Adjustments</h3>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {modalRow.employee_name} · {month}
                                </p>
                            </div>
                            <button onClick={() => setReviewModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Annual paid-leave balances (computed locally; Razorpay has no balance API) */}
                        {modalRow.leave_balances && (
                            <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap gap-2">
                                {Object.entries(modalRow.leave_balances).map(([type, b]) => (
                                    <span key={type} className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
                                        {LEAVE_LABELS[type] || type}:{' '}
                                        <span className={`font-semibold ${b.remaining > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                            {b.remaining}
                                        </span>
                                        <span className="text-slate-400"> left of {b.quota} ({b.period === 'month' ? 'mo' : 'yr'})</span>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Leave list */}
                        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                            {modalRow.leaves.map(l => {
                                const badge = l.classification === 'paid'
                                    ? { txt: 'Paid', cls: 'bg-emerald-100 text-emerald-700' }
                                    : l.classification === 'unpaid'
                                        ? { txt: 'Unpaid', cls: 'bg-red-100 text-red-700' }
                                        : { txt: 'Partly unpaid', cls: 'bg-amber-100 text-amber-700' };
                                const dateList = l.dates || [];
                                const allDates = dateList.map(d => d.date);
                                const autoUnpaid = dateList.filter(d => d.auto_unpaid).map(d => d.date);
                                const curUnpaid = dateList.filter(d => d.unpaid).map(d => d.date);
                                const isAuto = curUnpaid.length === autoUnpaid.length && curUnpaid.every(x => autoUnpaid.includes(x));
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
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.cls}`}>
                                                        {badge.txt}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {l.start_date} → {l.end_date}
                                                    {l.reason && ` · ${l.reason}`}
                                                </p>
                                                <p className="text-xs font-medium mt-0.5 text-slate-600">
                                                    {l.paidDays > 0 && <span className="text-emerald-600">{l.paidDays}d paid</span>}
                                                    {l.paidDays > 0 && l.unpaidDays > 0 && ' · '}
                                                    {l.unpaidDays > 0 && <span className="text-red-600">{l.unpaidDays}d unpaid −{fmtCurrency(l.deductionAmount)}</span>}
                                                    {l.unpaidDays <= 0 && l.paidDays === l.days_in_month && <span className="text-emerald-600"> — no deduction</span>}
                                                </p>
                                            </div>
                                            {/* Quick set: Auto / All unpaid / All paid */}
                                            <div className="flex gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => setLeaveDates(l.leave_id, autoUnpaid)}
                                                    title={`Auto (balance-based): ${autoUnpaid.length}d unpaid`}
                                                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                                        isAuto ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
                                                    }`}
                                                >
                                                    Auto
                                                </button>
                                                <button
                                                    onClick={() => setLeaveDates(l.leave_id, allDates)}
                                                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                                        !isAuto && l.unpaidDays >= l.days_in_month ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600'
                                                    }`}
                                                >
                                                    All unpaid
                                                </button>
                                                <button
                                                    onClick={() => setLeaveDates(l.leave_id, [])}
                                                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                                        !isAuto && l.unpaidDays <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                                                    }`}
                                                >
                                                    All paid
                                                </button>
                                            </div>
                                        </div>
                                        {/* Per-day toggles — click a day to flip paid/unpaid; the rest stay as-is */}
                                        {dateList.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {dateList.map(d => (
                                                    <button
                                                        key={d.date}
                                                        onClick={() => toggleLeaveDay(l, d.date)}
                                                        title={d.unpaid ? 'Unpaid — click to mark paid' : 'Paid — click to mark unpaid'}
                                                        className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                                            d.unpaid
                                                                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                                        } ${d.unpaid !== d.auto_unpaid ? 'ring-1 ring-indigo-300' : ''}`}
                                                    >
                                                        {fmtDay(d.date)} · {d.unpaid ? 'Unpaid' : 'Paid'}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Modal summary */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                            <div className="flex items-center justify-between text-sm">
                                <div className="space-y-0.5">
                                    <p className="text-slate-500">
                                        Deducted: <span className="font-semibold text-red-600">
                                            −{fmtCurrency(modalRow.total_deduction)}
                                        </span>
                                    </p>
                                    <p className="text-slate-500">
                                        Final salary: <span className="font-bold text-emerald-700">
                                            {fmtCurrency(modalRow.final_salary)}
                                        </span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setReviewModal(null)}
                                    className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollPage;
