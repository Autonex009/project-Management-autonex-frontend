import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { IndianRupee, Users, UserCheck, UserX, Edit2, Save, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { payrollApi } from '../services/api';

/**
 * Pay — salary records sourced from the `salary` table.
 * Each row's monthly pay can be edited, and its Active/Inactive status toggled.
 * Inactive rows are excluded from the Monthly Pay run; active rows feed it their pay.
 */
const toNum = (s) => Number(String(s ?? '').replace(/[^0-9.]/g, '')) || 0;
const isActive = (status) => (status || '').trim().toLowerCase() !== 'inactive';

const PayTab = () => {
    const queryClient = useQueryClient();

    // record id → { base, bonus } while editing (undefined = not editing)
    const [edits, setEdits] = useState({});
    const [savingId, setSavingId] = useState(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['salary-records'],
        queryFn: () => payrollApi.getSalaryRecords(),
        staleTime: 0,
    });

    const salaries = data?.salaries || [];

    const invalidate = () => {
        queryClient.invalidateQueries(['salary-records']);
        // Monthly Pay derives from these rows — refresh it on next view.
        queryClient.invalidateQueries(['payroll-preview']);
    };

    const updateMutation = useMutation({
        mutationFn: ({ id, baseMonthly, bonusMonthly }) => payrollApi.updateSalaryRecord(id, { baseMonthly, bonusMonthly }),
        onSuccess: (_res, vars) => {
            toast.success('Salary saved');
            setEdits((p) => { const n = { ...p }; delete n[vars.id]; return n; });
            setSavingId(null);
            invalidate();
        },
        onError: (err) => {
            setSavingId(null);
            toast.error(err.response?.data?.detail || 'Failed to save salary');
        },
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }) => payrollApi.setSalaryRecordStatus(id, status),
        onSuccess: (_res, vars) => {
            toast.success(vars.status === 'Active' ? 'Marked active' : 'Marked inactive — excluded from Monthly Pay');
            invalidate();
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update status'),
    });

    const totals = useMemo(() => {
        const active = salaries.filter((r) => isActive(r.status)).length;
        return { total: salaries.length, active, inactive: salaries.length - active };
    }, [salaries]);

    // Search + pagination (display only — totals above use the full list).
    const PAGE_SIZE = 12;
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return salaries;
        return salaries.filter((r) =>
            (r.full_name || '').toLowerCase().includes(q) ||
            (r.employment_type || '').toLowerCase().includes(q)
        );
    }, [salaries, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const onSearch = (v) => { setSearch(v); setPage(1); };

    const startEdit = (row) => setEdits((p) => ({
        ...p,
        [row.id]: { base: toNum(row.base_pay_monthly) || '', bonus: toNum(row.opt_bonus_monthly) || '' },
    }));
    const cancelEdit = (id) => setEdits((p) => { const n = { ...p }; delete n[id]; return n; });

    const saveEdit = (id) => {
        const e = edits[id];
        const base = parseFloat(e.base);
        if (!base || base <= 0) { toast.error('Enter a valid base pay'); return; }
        const bonus = e.bonus === '' ? null : parseFloat(e.bonus);
        setSavingId(id);
        updateMutation.mutate({ id, baseMonthly: base, bonusMonthly: bonus });
    };

    const toggleStatus = (row) => {
        statusMutation.mutate({ id: row.id, status: isActive(row.status) ? 'Inactive' : 'Active' });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Pay</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Salary records for everyone. Edit monthly pay here, and toggle Active/Inactive — inactive people are left out of the Monthly Pay run.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Records', value: totals.total, icon: Users, color: 'text-slate-700', bg: 'bg-slate-100' },
                    { label: 'Active', value: totals.active, icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-100' },
                    { label: 'Inactive', value: totals.inactive, icon: UserX, color: 'text-slate-500', bg: 'bg-slate-100' },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
                        <div className={`inline-flex p-2 rounded-xl ${s.bg} mb-3`}>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Search by name or type…"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading salaries…</div>
                ) : isError ? (
                    <div className="flex items-center justify-center py-16 text-red-400 text-sm">Failed to load salary records.</div>
                ) : salaries.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">No salary records found.</div>
                ) : filtered.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">No people match “{search}”.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50/80 border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Base Pay (Monthly)</th>
                                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Bonus (Monthly)</th>
                                    <th className="px-5 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paged.map((row) => {
                                    const editing = edits[row.id] !== undefined;
                                    const active = isActive(row.status);
                                    return (
                                        <tr key={row.id} className={`transition-colors ${active ? 'hover:bg-slate-50/50' : 'bg-slate-50/40 text-slate-400'}`}>
                                            <td className="px-5 py-4">
                                                <p className={`font-semibold ${active ? 'text-slate-800' : 'text-slate-500'}`}>{row.full_name}</p>
                                                <p className="text-xs text-slate-400">{row.employment_type}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <button
                                                    onClick={() => toggleStatus(row)}
                                                    disabled={statusMutation.isPending}
                                                    title={active ? 'Click to mark Inactive' : 'Click to mark Active'}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                                                        active
                                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                                    }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                    {active ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>

                                            {/* Base Pay */}
                                            <td className="px-5 py-4 text-right">
                                                {editing ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span className="text-slate-400">₹</span>
                                                        <input
                                                            type="number"
                                                            autoFocus
                                                            value={edits[row.id].base}
                                                            onChange={(e) => setEdits((p) => ({ ...p, [row.id]: { ...p[row.id], base: e.target.value } }))}
                                                            placeholder="Base pay"
                                                            className="w-28 px-2 py-1 border border-indigo-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="font-mono text-slate-700">{row.base_pay_monthly ?? '—'}</span>
                                                )}
                                            </td>

                                            {/* Bonus */}
                                            <td className="px-5 py-4 text-right">
                                                {editing ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span className="text-slate-400">₹</span>
                                                        <input
                                                            type="number"
                                                            value={edits[row.id].bonus}
                                                            onChange={(e) => setEdits((p) => ({ ...p, [row.id]: { ...p[row.id], bonus: e.target.value } }))}
                                                            placeholder="0"
                                                            className="w-24 px-2 py-1 border border-indigo-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="font-mono text-slate-500">{row.opt_bonus_monthly ?? '—'}</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4">
                                                {editing ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => saveEdit(row.id)}
                                                            disabled={savingId === row.id}
                                                            className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-50"
                                                            title="Save"
                                                        >
                                                            <Save className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => cancelEdit(row.id)}
                                                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center">
                                                        <button
                                                            onClick={() => startEdit(row)}
                                                            className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-lg transition-colors"
                                                            title="Edit pay"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
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
            </div>
        </div>
    );
};

export default PayTab;
