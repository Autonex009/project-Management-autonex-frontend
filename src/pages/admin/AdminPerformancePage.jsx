import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi, perfReviewApi } from '../../services/api';
import { ChevronDown, ChevronUp, ClipboardList, Plus, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import PerfReviewForm from '../../components/perf/PerfReviewForm';
import PerfReviewCard from '../../components/perf/PerfReviewCard';
import PerfRatingPopover from '../../components/perf/PerfRatingPopover';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const isPmDesignation = (d) => (d || '').toLowerCase().includes('program manager') || (d || '').toLowerCase().includes('project manager');

const EmployeePanel = ({ employee, reviews, reviewerId }) => {
    const [expanded, setExpanded] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const queryClient = useQueryClient();
    const isPm = isPmDesignation(employee.designation);

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['perf-reviews'] });

    const createMutation = useMutation({
        mutationFn: (data) => perfReviewApi.create({ ...data, employee_id: employee.id, reviewer_id: reviewerId, reviewer_role: 'admin' }),
        onSuccess: () => { invalidate(); setShowForm(false); toast.success('Review saved'); },
        onError: () => toast.error('Failed to save review'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => perfReviewApi.update(id, data),
        onSuccess: () => { invalidate(); setEditing(null); toast.success('Review updated'); },
        onError: () => toast.error('Failed to update review'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => perfReviewApi.delete(id),
        onSuccess: () => { invalidate(); setConfirmId(null); toast.success('Review deleted'); },
        onError: () => toast.error('Failed to delete review'),
    });

    const sorted = [...reviews].sort((a, b) => (b.period || '').localeCompare(a.period || ''));
    const latestReview = sorted.length > 0 ? sorted[0] : null;

    return (
        <article className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
            <button
                onClick={() => { setExpanded((e) => !e); setShowForm(false); setEditing(null); }}
                className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-slate-50/60"
            >
                <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold shrink-0 ${isPm ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                        {(employee.name || 'U').charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{employee.name}</p>
                            {isPm && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">PM</span>}
                        </div>
                        <p className="text-xs text-slate-400">{employee.designation || 'Team Member'} · {employee.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {latestReview ? (
                        <PerfRatingPopover review={latestReview}>
                            <span className="cursor-default rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100">
                                ★ {Number(latestReview.average).toFixed(2)} / 5
                            </span>
                        </PerfRatingPopover>
                    ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">No Reviews</span>
                    )}
                    {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
            </button>

            {expanded && (
                <div className="space-y-5 border-t border-slate-100 p-5">
                    {showForm && !editing && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                            <h4 className="mb-4 text-sm font-semibold text-slate-700">New Monthly Review</h4>
                            <PerfReviewForm
                                onSubmit={(data) => createMutation.mutate(data)}
                                onCancel={() => setShowForm(false)}
                                loading={createMutation.isPending}
                            />
                        </div>
                    )}

                    {editing && (
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                            <h4 className="mb-4 text-sm font-semibold text-slate-700">Edit Review</h4>
                            <PerfReviewForm
                                initial={editing}
                                onSubmit={(data) => updateMutation.mutate({ id: editing.id, data })}
                                onCancel={() => setEditing(null)}
                                loading={updateMutation.isPending}
                            />
                        </div>
                    )}

                    {sorted.length === 0 && !showForm && (
                        <p className="py-4 text-center text-sm text-slate-400">No reviews yet.</p>
                    )}
                    {sorted.length > 0 && (
                        <div className="space-y-3">
                            {sorted.map((r) => (
                                <PerfReviewCard
                                    key={r.id}
                                    review={r}
                                    onEdit={(rev) => { setEditing(rev); setShowForm(false); }}
                                    onDelete={(id) => setConfirmId(id)}
                                />
                            ))}
                        </div>
                    )}

                    {!showForm && !editing && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 py-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                        >
                            <Plus className="h-4 w-4" /> Add Monthly Review
                        </button>
                    )}
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmId != null}
                onClose={() => setConfirmId(null)}
                onConfirm={() => deleteMutation.mutate(confirmId)}
                title="Delete review"
                message="Delete this monthly performance review? This cannot be undone."
                confirmText="Delete"
                isPending={deleteMutation.isPending}
            />
        </article>
    );
};

const AdminPerformancePage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const { data: employees = [], isLoading: empLoading } = useQuery({ queryKey: ['employees'], queryFn: employeeApi.getAll });
    const { data: allReviews = [], isLoading: reviewsLoading } = useQuery({
        queryKey: ['perf-reviews'],
        queryFn: () => perfReviewApi.getAll(),
    });

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all | pm | employee
    const [ratingFilter, setRatingFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    const reviewsByEmployee = (employeeId) => allReviews.filter((r) => r.employee_id === employeeId);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return employees
            .filter((e) => e.status !== 'archived')
            .filter((e) => {
                if (filter === 'pm') return isPmDesignation(e.designation);
                if (filter === 'employee') return !isPmDesignation(e.designation);
                return true;
            })
            .filter((e) => !term || (e.name || '').toLowerCase().includes(term))
            .filter((employee) => {
                if (ratingFilter === 'all') return true;

                const reviews = reviewsByEmployee(employee.id);

                if (reviews.length === 0) return false;

                const latest = [...reviews].sort(
                    (a, b) => (b.period || '').localeCompare(a.period || '')
                )[0];

                const avg = Number(latest.average);

                switch (ratingFilter) {
                    case '5':
                        return avg >= 4.5;
                    case '4':
                        return avg >= 3.5 && avg < 4.5;
                    case '3':
                        return avg >= 2.5 && avg < 3.5;
                    case '2':
                        return avg >= 1.5 && avg < 2.5;
                    case '1':
                        return avg < 1.5;
                    default:
                        return true;
                }
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, search, filter, ratingFilter, allReviews]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filter, ratingFilter]);
    
    const totalEmployees = filtered.length;

    const totalPages = Math.ceil(totalEmployees / rowsPerPage);

    const startIndex = (currentPage - 1) * rowsPerPage;

    const endIndex = Math.min(
        startIndex + rowsPerPage,
        totalEmployees
    );

    const paginatedEmployees = filtered.slice(
        startIndex,
        endIndex
    );

    const pmCount = employees.filter((e) => isPmDesignation(e.designation) && e.status !== 'archived').length;
    const isLoading = empLoading || reviewsLoading;

    const maxVisiblePages = 5;

    let startPage = Math.max(
        1,
        Math.min(currentPage - 2, totalPages - maxVisiblePages + 1)
    );

    let endPage = Math.min(
        totalPages,
        startPage + maxVisiblePages - 1
    );
    
    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-[28px] border border-indigo-100 bg-[linear-gradient(135deg,rgba(79,70,229,0.12),rgba(255,255,255,0.94)_42%,rgba(238,242,255,1))] p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-700">Performance</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Employee & PM Performance</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">
                            View every employee's monthly reviews and rate Program Managers across five criteria.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Employees</p>
                            <p className="text-xl font-semibold text-slate-900">{employees.filter((e) => e.status !== 'archived').length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Program Managers</p>
                            <p className="text-xl font-semibold text-slate-900">{pmCount}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Total Reviews</p>
                            <p className="text-xl font-semibold text-slate-900">{allReviews.length}</p>
                        </div>
                    </div>
                </div>
            </section>

            {!isLoading && employees.length > 0 && (
                <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="all">All people</option>
                            <option value="pm">Program Managers</option>
                            <option value="employee">Employees</option>
                        </select>
                        <select
                            value={ratingFilter}
                            onChange={(e) => setRatingFilter(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="all">All Ratings</option>
                            <option value="5">Outstanding (5)</option>
                            <option value="4">Exceeds Expectations (4)</option>
                            <option value="3">Meets Expectations (3)</option>
                            <option value="2">Needs Improvement (2)</option>
                            <option value="1">Poor (1)</option>
                        </select>
                        {(search || filter !== 'all'|| ratingFilter !== 'all') && (
                            <button
                                type="button"
                                onClick={() => { setSearch(''); setFilter('all'); setRatingFilter('all');}}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                                <X className="h-4 w-4" /> Clear
                            </button>
                        )}
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-400">Showing {filtered.length} of {employees.filter((e) => e.status !== 'archived').length} people</p>
                </section>
            )}

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
                    Loading performance data…
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                    <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-800">No people match your filters</h2>
                    <p className="mt-2 text-sm text-slate-500">Try adjusting your search or clearing the filters.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {paginatedEmployees.map((emp) => (
                        <EmployeePanel
                            key={emp.id}
                            employee={emp}
                            reviews={reviewsByEmployee(emp.id)}
                            reviewerId={user.id}
                        />
                    ))}
                </div> 
            )}
            <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-5 lg:flex-row lg:items-center lg:justify-between">

                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Showing</span>

                    <span className="font-medium">
                        {startIndex + 1}
                    </span>

                    <span>–</span>

                    <select
                        value={rowsPerPage}
                        onChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>

                    <span>of</span>

                    <span className="font-medium">
                        {totalEmployees}
                    </span>

                    <span>employees</span>
                </div>

                <div className="flex items-center gap-2">

                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
                    >
                        Prev
                    </button>

                    {Array.from(
                        { length: endPage - startPage + 1 },
                        (_, i) => startPage + i
                    ).map((page) => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`h-9 w-9 rounded-lg ${
                                currentPage === page
                                    ? 'bg-indigo-600 text-white'
                                    : 'border'
                            }`}
                        >
                            {page}
                        </button>
                    ))}

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
                    >
                        Next
                    </button>

                </div>

            </div>
        </div>
    );
};

export default AdminPerformancePage;
