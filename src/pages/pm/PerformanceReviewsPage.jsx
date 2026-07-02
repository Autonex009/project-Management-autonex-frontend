import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi, allocationApi, parentProjectApi, subProjectApi, perfReviewApi } from '../../services/api';
import { getPmEmployeeId, getPmSubProjects } from '../../utils/pmScope';
import { ChevronDown, ChevronUp, ClipboardList, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import PerfReviewForm from '../../components/perf/PerfReviewForm';
import PerfReviewCard from '../../components/perf/PerfReviewCard';
import PerfRatingPopover from '../../components/perf/PerfRatingPopover';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const EmployeePanel = ({ employee, reviews, reviewerId }) => {
    const [expanded, setExpanded] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const queryClient = useQueryClient();

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['perf-reviews'] });

    const createMutation = useMutation({
        mutationFn: (data) => perfReviewApi.create({ ...data, employee_id: employee.id, reviewer_id: reviewerId, reviewer_role: 'pm' }),
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-base font-bold text-blue-700 shrink-0">
                        {(employee.name || 'U').charAt(0)}
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900">{employee.name}</p>
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
                        <p className="py-4 text-center text-sm text-slate-400">No reviews yet — add the first one below.</p>
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

const PerformanceReviewsPage = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const pmEmployeeId = getPmEmployeeId(user);

    const { data: parentProjects = [] } = useQuery({ queryKey: ['parent-projects'], queryFn: parentProjectApi.getAll });
    const { data: projects = [] } = useQuery({ queryKey: ['sub-projects'], queryFn: subProjectApi.getAll });
    const { data: employees = [], isLoading: empLoading } = useQuery({ queryKey: ['employees'], queryFn: employeeApi.getAll });
    const { data: allocations = [] } = useQuery({ queryKey: ['allocations'], queryFn: allocationApi.getAll });
    const { data: allReviews = [], isLoading: reviewsLoading } = useQuery({
        queryKey: ['perf-reviews'],
        queryFn: () => perfReviewApi.getAll(),
    });

    const scopedProjects = getPmSubProjects(projects, parentProjects, pmEmployeeId, allocations);
    const scopedProjectIds = new Set(scopedProjects.map((p) => p.id));
    const scopedAllocations = allocations.filter((a) => scopedProjectIds.has(a.sub_project_id));
    const teamEmployeeIds = new Set(scopedAllocations.map((a) => a.employee_id));
    const teamMembers = employees.filter((e) => teamEmployeeIds.has(e.id)).sort((a, b) => a.name.localeCompare(b.name));

    const reviewsByEmployee = (employeeId) => allReviews.filter((r) => r.employee_id === employeeId);
    const totalReviews = allReviews.filter((r) => teamEmployeeIds.has(r.employee_id)).length;

    const isLoading = empLoading || reviewsLoading;

    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(255,255,255,0.94)_42%,rgba(239,246,255,1))] p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-700">Performance</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Monthly Performance Reviews</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">
                            Rate your team members each month across five criteria. Reviews are visible to admins.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Team Members</p>
                            <p className="text-xl font-semibold text-slate-900">{teamMembers.length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Total Reviews</p>
                            <p className="text-xl font-semibold text-slate-900">{totalReviews}</p>
                        </div>
                    </div>
                </div>
            </section>

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
                    Loading performance data…
                </div>
            ) : teamMembers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                    <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-800">No team members found</h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Team members appear once employees are allocated to your scoped projects.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {teamMembers.map((member) => (
                        <EmployeePanel
                            key={member.id}
                            employee={member}
                            reviews={reviewsByEmployee(member.id)}
                            reviewerId={user.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PerformanceReviewsPage;
