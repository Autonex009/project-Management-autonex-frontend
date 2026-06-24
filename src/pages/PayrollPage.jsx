import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi, payrollApi } from '../services/api';
import Spinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import {
    Download, CheckCircle2, XCircle, AlertTriangle, IndianRupee,
    Users, TrendingDown, Wallet, X, ChevronDown, ChevronRight, Edit2, Save, Lock
} from 'lucide-react';
import PageSearchBar from '../components/ui/PageSearchBar';

const LEAVE_LABELS = {
    paid: 'Paid', casual_sick: 'Casual/Sick', floater: 'Floater',
};

const fmt = (n) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtCurrency = (n) => `₹${fmt(n)}`;

const currentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const PayrollPage = () => {
    const queryClient = useQueryClient();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [month, setMonth] = useState(currentMonthStr());
    const [generated, setGenerated] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // leave_id → deduct (true/false)
    const [adjustments, setAdjustments] = useState({});

    // employee_id → editing base salary string
    const [salaryEdits, setSalaryEdits] = useState({});
    const [savingEmpId, setSavingEmpId] = useState(null);

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

    const empUpdateMutation = useMutation({
        mutationFn: ({ id, base_salary }) => employeeApi.update(id, { base_salary }),
        onSuccess: () => {
            toast.success('Base salary updated');
            setSavingEmpId(null);
            refetch();
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update salary'),
    });

    const handleGenerate = () => {
        refetch().then(({ data }) => {
            if (!data) return;
            setGenerated(true);
            // Seed per-leave UNPAID-day counts from the backend's auto classification
            // (annual paid-leave entitlement applied) or a finalized run's snapshot.
            const initial = {};
            data.employees?.forEach(emp => {
                emp.leaves.forEach(l => {
                    initial[l.leave_id] = l.unpaid_days ?? (l.deduct ? l.days_in_month : 0);
                });
            });
            setAdjustments(initial);
        });
    };

    // Admin override: set how many of a leave's days are unpaid (deducted).
    const setLeaveUnpaid = (leaveId, unpaidDays) => {
        setAdjustments(prev => ({ ...prev, [leaveId]: unpaidDays }));
    };

    // Recompute rows with current adjustments applied
    const rows = useMemo(() => {
        if (!preview?.employees) return [];
        return preview.employees.map(emp => {
            const perDay = emp.base_salary ? emp.base_salary / (preview.working_days || 22) : 0;
            let totalDeductedDays = 0;
            let totalPaidDays = 0;
            const leaves = emp.leaves.map(l => {
                const unpaidDays = Math.max(0, Math.min(adjustments[l.leave_id] ?? l.unpaid_days ?? 0, l.days_in_month));
                const paidDays = Math.max(l.days_in_month - unpaidDays, 0);
                const deductionAmount = unpaidDays * perDay;
                totalDeductedDays += unpaidDays;
                totalPaidDays += paidDays;
                const classification = unpaidDays <= 0
                    ? 'paid'
                    : (unpaidDays >= l.days_in_month ? 'unpaid' : 'partial');
                return { ...l, unpaidDays, paidDays, classification, deduct: unpaidDays > 0, deductionAmount };
            });
            const totalDeduction = totalDeductedDays * perDay;
            const finalSalary = Math.max((emp.base_salary || 0) - totalDeduction, 0);
            return {
                ...emp,
                leaves,
                per_day_rate: perDay,
                total_paid_days: totalPaidDays,
                total_deducted_days: totalDeductedDays,
                total_deduction: totalDeduction,
                final_salary: finalSalary,
            };
        });
    }, [preview, adjustments]);

    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return rows;
        const q = searchQuery.toLowerCase();
        return rows.filter(r =>
            (r.employee_name || '').toLowerCase().includes(q) ||
            (r.designation || '').toLowerCase().includes(q)
        );
    }, [rows, searchQuery]);

    const totals = useMemo(() => ({
        baseSalary: rows.reduce((s, r) => s + (r.base_salary || 0), 0),
        totalDeduction: rows.reduce((s, r) => s + r.total_deduction, 0),
        finalSalary: rows.reduce((s, r) => s + r.final_salary, 0),
        employeesWithSalary: rows.filter(r => r.base_salary).length,
    }), [rows]);

    const buildAdjustmentsPayload = () =>
        rows.flatMap(emp =>
            emp.leaves.map(l => ({
                employee_id: emp.employee_id,
                leave_id: l.leave_id,
                deduct: l.deduct,
                unpaid_days: l.unpaidDays,
            }))
        );

    const handleSave = (status) => {
        saveMutation.mutate({
            month,
            status,
            adjustments: buildAdjustmentsPayload(),
            processed_by: user.id,
        });
    };

    const handleExportCSV = () => {
        const headers = [
            'Employee', 'Designation', 'Type',
            'Base Salary (₹)', `Per Day (₹, ÷${preview?.working_days || 22})`,
            'Leave Days', 'Paid Days', 'Unpaid (Deducted) Days', 'Deduction (₹)', 'Final Salary (₹)', 'Notes'
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

    const saveSalary = (empId) => {
        const val = parseFloat(salaryEdits[empId]);
        if (!val || val <= 0) { toast.error('Enter a valid salary amount'); return; }
        setSavingEmpId(empId);
        empUpdateMutation.mutate({ id: empId, base_salary: val });
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
                    <Button type="submit" disabled={unlocking || !passcodeInput} isLoading={unlocking} className="w-full justify-center">
                        {!unlocking && 'Unlock'}
                    </Button>
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
                        onChange={e => { setMonth(e.target.value); setGenerated(false); setAdjustments({}); setSearchQuery(''); }}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                    <Button onClick={handleGenerate} disabled={isLoading} isLoading={isLoading}>
                        {!isLoading && 'Generate'}
                    </Button>
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Employees', value: totals.employeesWithSalary, suffix: `/ ${rows.length}`, icon: Users, color: 'text-slate-700', bg: 'bg-slate-100' },
                        { label: 'Total Base Salary', value: fmtCurrency(totals.baseSalary), icon: Wallet, color: 'text-indigo-700', bg: 'bg-indigo-100' },
                        { label: 'Total Deductions', value: fmtCurrency(totals.totalDeduction), icon: TrendingDown, color: 'text-red-700', bg: 'bg-red-100' },
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

            {/* Search filter */}
            {generated && (
                <div className="flex justify-between items-center mb-4">
                    <PageSearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search employees..."
                    />
                </div>
            )}

            {/* Main table */}
            {generated && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                    {filteredRows.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                            {searchQuery ? 'No employees match your search.' : 'No active employees found.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/80 border-b border-slate-100">
                                    <tr>
                                        {['Employee', 'Base Salary / Per Day', 'Leaves', 'Deducted', 'Final Salary', 'Actions'].map(h => (
                                            <th key={h} className={`px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${
                                                ['Base Salary / Per Day', 'Leaves', 'Deducted', 'Final Salary'].includes(h) ? 'text-right' : 'text-left'
                                            }`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRows.map(row => {
                                        const editing = salaryEdits[row.employee_id] !== undefined;
                                        return (
                                            <tr key={row.employee_id} className="hover:bg-slate-50/50 transition-colors">
                                                {/* Employee */}
                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-slate-800">{row.employee_name}</p>
                                                    <p className="text-xs text-slate-400">{row.designation} · {row.employee_type}</p>
                                                </td>

                                                {/* Base salary / per day */}
                                                <td className="px-5 py-4 text-right">
                                                    {row.salary_missing || editing ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <span className="text-slate-400">₹</span>
                                                            <input
                                                                type="number"
                                                                autoFocus={editing}
                                                                value={salaryEdits[row.employee_id] ?? ''}
                                                                onChange={e => setSalaryEdits(p => ({ ...p, [row.employee_id]: e.target.value }))}
                                                                placeholder="Enter salary"
                                                                className="w-32 px-2 py-1 border border-indigo-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                            />
                                                            <button
                                                                onClick={() => saveSalary(row.employee_id)}
                                                                disabled={savingEmpId === row.employee_id}
                                                                className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                                                title="Save salary"
                                                            >
                                                                <Save className="w-3.5 h-3.5" />
                                                            </button>
                                                            {editing && (
                                                                <button
                                                                    onClick={() => setSalaryEdits(p => { const n = {...p}; delete n[row.employee_id]; return n; })}
                                                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="text-right">
                                                                <p className="font-semibold text-slate-800">{fmtCurrency(row.base_salary)}</p>
                                                                <p className="text-xs text-slate-400">{fmtCurrency(row.per_day_rate)}/day</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSalaryEdits(p => ({ ...p, [row.employee_id]: row.base_salary }))}
                                                                className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-lg transition-colors"
                                                                title="Edit salary"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    {row.salary_missing && !editing && (
                                                        <p className="text-xs text-amber-600 flex items-center justify-end gap-1 mt-0.5">
                                                            <AlertTriangle className="w-3 h-3" />Not set
                                                        </p>
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
                            <Button variant="secondary" onClick={() => handleSave('draft')} disabled={saveMutation.isPending}>
                                Save Draft
                            </Button>
                            <Button variant="success" onClick={() => handleSave('finalized')} disabled={saveMutation.isPending} isLoading={saveMutation.isPending}>
                                {!saveMutation.isPending && 'Finalize Payroll'}
                            </Button>
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-2 py-4 sm:px-4 overflow-y-auto">
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
                                const auto = l.unpaid_days ?? 0;   // backend auto suggestion
                                const isAuto = l.unpaidDays === auto;
                                return (
                                    <div key={l.leave_id} className="px-6 py-4 flex items-center justify-between gap-4">
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
                                        {/* Override: Auto / All unpaid / All paid */}
                                        <div className="flex gap-1.5 shrink-0">
                                            <button
                                                onClick={() => setLeaveUnpaid(l.leave_id, auto)}
                                                title={`Auto (balance-based): ${auto}d unpaid`}
                                                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                                    isAuto ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
                                                }`}
                                            >
                                                Auto
                                            </button>
                                            <button
                                                onClick={() => setLeaveUnpaid(l.leave_id, l.days_in_month)}
                                                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                                    !isAuto && l.unpaidDays >= l.days_in_month ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600'
                                                }`}
                                            >
                                                All unpaid
                                            </button>
                                            <button
                                                onClick={() => setLeaveUnpaid(l.leave_id, 0)}
                                                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                                    !isAuto && l.unpaidDays <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                                                }`}
                                            >
                                                All paid
                                            </button>
                                        </div>
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
                                <Button onClick={() => setReviewModal(null)}>
                                    Done
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollPage;
