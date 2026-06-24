import React, { useState, useEffect, useMemo } from 'react';
import { Users, Award, Sparkles } from 'lucide-react';
import { onboardingApi } from '../services/api';
import SearchInput from '../components/ui/SearchInput';

const scoreBadgeClass = (score) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-red-50 text-red-700 border-red-100';
};

const NewlyOnboardedPage = () => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        setLoading(true);
        setError(null);
        onboardingApi.getNewlyOnboarded()
            .then((data) => setCandidates(Array.isArray(data) ? data : []))
            .catch((err) => {
                console.error('Failed to load newly onboarded candidates:', err);
                setError('Could not load the newly onboarded pool.');
            })
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return candidates;
        return candidates.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.designation || c.department || '').toLowerCase().includes(q)
        );
    }, [candidates, search]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-slate-500 font-medium">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-600 mr-2" />
                Loading newly onboarded candidates...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 text-center font-medium">
                {error}
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
                        Annotation employees not yet assigned to a project, ranked by assessment performance. Use this to decide who to allocate.
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
                        <table className="w-full text-left border-collapse min-w-[640px]">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
                                    <th className="py-4 px-6">Candidate</th>
                                    <th className="py-4 px-6 text-center">Modules Completed</th>
                                    <th className="py-4 px-6 text-center">Overall Progress</th>
                                    <th className="py-4 px-6 text-center">Quiz Avg</th>
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
                                                    <span className="inline-block mt-1 text-[9px] uppercase tracking-wider font-extrabold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                                        {c.designation || c.department || 'Annotator'}
                                                    </span>
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewlyOnboardedPage;
