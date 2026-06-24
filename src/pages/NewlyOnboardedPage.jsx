import React, { useState, useMemo } from 'react';
import { Users, Award, Sparkles, UserPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { onboardingApi, allocationApi, subProjectApi, parentProjectApi } from '../services/api';
import SearchInput from '../components/ui/SearchInput';
import AllocationModalV2 from '../components/AllocationModalV2';
import CandidateAllocationsPopover from '../components/CandidateAllocationsPopover';
import { getPmSubProjects, getPmEmployeeId } from '../utils/pmScope';

const scoreBadgeClass = (score) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-red-50 text-red-700 border-red-100';
};

const NewlyOnboardedPage = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [allocatingCandidate, setAllocatingCandidate] = useState(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isPm = (localStorage.getItem('role') || 'employee') === 'pm';

    const { data: candidates = [], isLoading, isError } = useQuery({
        queryKey: ['newly-onboarded'],
        queryFn: onboardingApi.getNewlyOnboarded,
    });

    // Project options for the allocation modal.
    const { data: subProjects = [] } = useQuery({ queryKey: ['sub-projects'], queryFn: subProjectApi.getAll });
    const { data: parentProjects = [] } = useQuery({ queryKey: ['parent-projects'], queryFn: parentProjectApi.getAll, enabled: isPm });
    const { data: allocations = [] } = useQuery({ queryKey: ['allocations'], queryFn: allocationApi.getAll, enabled: isPm });

    const projectOptions = useMemo(() => {
        if (isPm) {
            return getPmSubProjects(subProjects, parentProjects, getPmEmployeeId(user), allocations) || [];
        }
        return subProjects;
    }, [isPm, subProjects, parentProjects, allocations, user]);

    const allocateMutation = useMutation({
        mutationFn: allocationApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['newly-onboarded'] });
            queryClient.invalidateQueries({ queryKey: ['allocations'] });
            toast.success('Candidate allocated to project.');
            setAllocatingCandidate(null);
        },
        onError: (err) => {
            const detail = err?.response?.data?.detail;
            const msg = (detail && (detail.message || (typeof detail === 'string' ? detail : null))) || 'Failed to allocate candidate.';
            toast.error(msg);
        },
    });

    const handleAllocate = (formData) => {
        allocateMutation.mutate({
            employee_id: formData.employee_id,
            sub_project_id: formData.project_id,
            total_daily_hours: formData.total_daily_hours,
            active_start_date: formData.active_start_date || null,
            active_end_date: formData.active_end_date || null,
            role_tags: formData.role_tags || [],
            time_distribution: formData.time_distribution || {},
            override_flag: formData.override_flag || false,
            override_reason: formData.override_reason || null,
        });
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return candidates;
        return candidates.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.designation || c.department || '').toLowerCase().includes(q)
        );
    }, [candidates, search]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-slate-500 font-medium">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-600 mr-2" />
                Loading newly onboarded candidates...
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 text-center font-medium">
                Could not load the newly onboarded pool.
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Onboarding</span>
                    <h1 className="text-3xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                        <Sparkles className="w-7 h-7 text-indigo-500" /> Newly Onboarded
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Annotation employees not yet assigned to a project, ranked by assessment performance. Allocate the best fits straight from here.
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-white border border-slate-200/60 p-4 px-6 rounded-2xl shadow-sm w-full md:w-auto">
                    <Users className="w-8 h-8 text-indigo-500 shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Available Candidates</p>
                        <p className="text-lg font-extrabold text-slate-800">{candidates.length}</p>
                    </div>
                </div>
            </div>

            {/* List container */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-900">Unassigned Pool</h3>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, role..." clearable className="w-full sm:w-72" />
                </div>

                {filtered.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center max-w-md mx-auto">
                        <Users className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="font-bold text-slate-500 text-base">No unassigned annotation candidates</p>
                        <p className="text-sm text-slate-400 text-center mt-1">
                            Annotation employees appear here until they're allocated to a project. New hires show up automatically.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[720px]">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
                                    <th className="py-4 px-6">Candidate</th>
                                    <th className="py-4 px-6 text-center">Modules Completed</th>
                                    <th className="py-4 px-6 text-center">Overall Progress</th>
                                    <th className="py-4 px-6 text-center">Quiz Avg</th>
                                    <th className="py-4 px-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filtered.map((c) => (
                                    <tr key={c.userId} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-indigo-600 to-blue-500 shadow-sm uppercase">
                                                    {c.name ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'EM'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                                                    <p className="text-[10px] text-slate-400">{c.email}</p>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                        <span className="text-[9px] uppercase tracking-wider font-extrabold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                                            {c.designation || c.department || 'Annotator'}
                                                        </span>
                                                        {(c.allocations?.length || 0) > 0 ? (
                                                            <CandidateAllocationsPopover allocations={c.allocations} candidateName={c.name} />
                                                        ) : (
                                                            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                                                                New
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="font-extrabold text-slate-800 text-base">{c.completedModules ?? 0}</span>
                                            <span className="text-slate-300 font-light"> / {c.totalModules ?? 0}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-xs font-bold text-slate-600">{c.overallProgress ?? 0}%</span>
                                                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${c.overallProgress ?? 0}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center gap-1 font-extrabold px-3 py-1 rounded-full border text-xs ${scoreBadgeClass(c.overallScore ?? 0)}`}>
                                                <Award className="w-3.5 h-3.5" /> {c.overallScore ?? 0}%
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => setAllocatingCandidate(c)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" /> Allocate
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {allocatingCandidate && (
                <AllocationModalV2
                    isOpen={true}
                    onClose={() => setAllocatingCandidate(null)}
                    onSubmit={handleAllocate}
                    projects={projectOptions}
                    presetEmployeeId={allocatingCandidate.employeeId}
                    presetEmployeeName={allocatingCandidate.name}
                    hideOverride={true}
                />
            )}
        </div>
    );
};

export default NewlyOnboardedPage;
