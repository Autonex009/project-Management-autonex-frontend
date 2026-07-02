import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import { employeeApi, allocationApi, parentProjectApi, subProjectApi, performanceReviewApi } from '../../services/api';
import { getPmEmployeeId, getPmSubProjects } from '../../utils/pmScope';
import { ChevronDown, ChevronUp, MessageSquare, Star, ClipboardList, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Dropdown from '../../components/ui/Dropdown';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const REVIEW_TYPES = [
    { value: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'performance_review', label: 'Performance Review', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'comment', label: 'Comment', icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const typeInfo = (value) => REVIEW_TYPES.find(t => t.value === value) || REVIEW_TYPES[2];

const StarRating = ({ value, onChange, readOnly = false }) => (
    <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
            <button
                key={star}
                type="button"
                disabled={readOnly}
                onClick={() => !readOnly && onChange && onChange(star === value ? null : star)}
                className={`text-xl transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} ${star <= (value || 0) ? 'text-amber-400' : 'text-slate-200'}`}
            >
                ★
            </button>
        ))}
    </div>
);

const EMPTY_FORM = { review_type: 'feedback', title: '', content: '', rating: null, period: '' };

const ReviewForm = ({ initial = EMPTY_FORM, onSubmit, onCancel, loading }) => {
    const [form, setForm] = useState(initial);
    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
    const reviewTypeOptions = REVIEW_TYPES.map(t => ({ value: t.value, label: t.label }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) {
            toast.error('Title and content are required');
            return;
        }
        onSubmit({ ...form, period: form.period || null, rating: form.review_type === 'performance_review' ? form.rating : null });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Type</label>
                    <Dropdown
                        options={reviewTypeOptions}
                        value={form.review_type}
                        onChange={(val) => set('review_type', val)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Period (optional)</label>
                    <input
                        type="text"
                        placeholder="e.g. Q1 2025, May 2026"
                        value={form.period}
                        onChange={e => set('period', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Title</label>
                <input
                    type="text"
                    placeholder="Short title for this entry"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                />
            </div>

            <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Content</label>
                <textarea
                    placeholder="Write your feedback, review, or comment here…"
                    value={form.content}
                    onChange={e => set('content', e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                    required
                />
            </div>

            {form.review_type === 'performance_review' && (
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Rating (optional)</label>
                    <StarRating value={form.rating} onChange={val => set('rating', val)} />
                </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="cancel" onClick={onCancel}><X className="w-3.5 h-3.5" /> Cancel</Button>
                <Button type="submit" variant="blue" disabled={loading} isLoading={loading}>
                    {!loading && <Check className="w-3.5 h-3.5" />} {loading ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </form>
    );
};

const ReviewCard = ({ review, onEdit, onDelete }) => {
    const info = typeInfo(review.review_type);
    const Icon = info.icon;
    return (
        <div className={`rounded-2xl border ${info.border} bg-white p-4`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${info.badge}`}>
                        <Icon className="w-3 h-3" /> {info.label}
                    </span>
                    {review.period && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">{review.period}</span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onEdit(review)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(review.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <h4 className="mt-3 text-sm font-semibold text-slate-800">{review.title}</h4>
            <p className="mt-1.5 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{review.content}</p>

            {review.rating && (
                <div className="mt-2">
                    <StarRating value={review.rating} readOnly />
                </div>
            )}

            <p className="mt-3 text-xs text-slate-400">
                {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
        </div>
    );
};

const EmployeePanel = ({ employee, reviews, reviewerId, onReviewCreated }) => {
    const [expanded, setExpanded] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (data) => performanceReviewApi.create({ ...data, employee_id: employee.id, reviewer_id: reviewerId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
            setShowForm(false);
            toast.success('Review added');
            onReviewCreated?.();
        },
        onError: () => toast.error('Failed to save review'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => performanceReviewApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
            setEditing(null);
            toast.success('Review updated');
        },
        onError: () => toast.error('Failed to update review'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => performanceReviewApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
            toast.success('Review deleted');
        },
        onError: () => toast.error('Failed to delete review'),
    });

    const handleDelete = (id) => {
        setDeleteConfirm(id);
    };

    return (
        <article className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
            <button
                onClick={() => { setExpanded(e => !e); setShowForm(false); setEditing(null); }}
                className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-slate-50/60 transition-colors"
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
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {reviews.length} {reviews.length === 1 ? 'entry' : 'entries'}
                    </span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </button>

            {expanded && (
                <div className="border-t border-slate-100 p-5 space-y-5">
                    {/* New review form */}
                    {showForm && !editing && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-4">New Entry</h4>
                            <ReviewForm
                                onSubmit={(data) => createMutation.mutate(data)}
                                onCancel={() => setShowForm(false)}
                                loading={createMutation.isPending}
                            />
                        </div>
                    )}

                    {/* Edit form */}
                    {editing && (
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-4">Edit Entry</h4>
                            <ReviewForm
                                initial={{ review_type: editing.review_type, title: editing.title, content: editing.content, rating: editing.rating, period: editing.period || '' }}
                                onSubmit={(data) => updateMutation.mutate({ id: editing.id, data })}
                                onCancel={() => setEditing(null)}
                                loading={updateMutation.isPending}
                            />
                        </div>
                    )}

                    {/* Existing reviews */}
                    {reviews.length === 0 && !showForm && (
                        <p className="text-sm text-slate-400 text-center py-4">No entries yet — add the first one below.</p>
                    )}
                    {reviews.length > 0 && (
                        <div className="space-y-3">
                            {reviews.map(r => (
                                <ReviewCard
                                    key={r.id}
                                    review={r}
                                    onEdit={(rev) => { setEditing(rev); setShowForm(false); }}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}

                    {!showForm && !editing && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add Entry
                        </button>
                    )}
                </div>
            )}
            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => { deleteMutation.mutate(deleteConfirm); setDeleteConfirm(null); }}
                title="Delete Review"
                message="Are you sure you want to delete this review? This action cannot be undone."
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
        queryKey: ['performance-reviews'],
        queryFn: () => performanceReviewApi.getAll(),
    });

    const scopedProjects = getPmSubProjects(projects, parentProjects, pmEmployeeId, allocations);
    const scopedProjectIds = new Set(scopedProjects.map(p => p.id));
    const scopedAllocations = allocations.filter(a => scopedProjectIds.has(a.sub_project_id));
    const teamEmployeeIds = new Set(scopedAllocations.map(a => a.employee_id));
    const teamMembers = employees.filter(e => teamEmployeeIds.has(e.id)).sort((a, b) => a.name.localeCompare(b.name));

    const reviewsByEmployee = (employeeId) => allReviews.filter(r => r.employee_id === employeeId);

    const totalEntries = allReviews.filter(r => teamEmployeeIds.has(r.employee_id)).length;

    const isLoading = empLoading || reviewsLoading;

    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(255,255,255,0.94)_42%,rgba(239,246,255,1))] p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-700">Performance</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Employee Performance Reviews</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">
                            Add feedback, performance reviews, and comments for your team members. All entries are visible to admins and the respective PM.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Team Members</p>
                            <p className="text-xl font-semibold text-slate-900">{teamMembers.length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Total Entries</p>
                            <p className="text-xl font-semibold text-slate-900">{totalEntries}</p>
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
                    {teamMembers.map(member => (
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
