import React from 'react';
import { Users, BookOpen, Award, CheckCircle, HelpCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { onboardingApi } from '../../services/api';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/LoadingSpinner';
import { useAuthContext } from '../../context/AuthContext';

const PMOnboardingDashboard = ({ embedded = false }) => {
    const { user } = useAuthContext();
    const pmId = user?.id;
    const pmName = user?.name;

    const { data: menteesData, isLoading, error: fetchError } = useQuery({
        queryKey: ['pm-mentees', pmId],
        queryFn: async () => {
            try {
                return await onboardingApi.getMentees(pmId);
            } catch (err) {
                console.warn('getMentees API failed, trying fallback from reports:', err);
                const data = await onboardingApi.getReports();
                const filtered = data.filter(c => c.mentorName === pmName);
                return filtered.map(c => ({
                    id: c.userId,
                    name: c.name,
                    email: c.email,
                    department: c.department,
                    isActive: true,
                    completedModulesCount: (c.moduleStats || []).filter(m => m.progress === 100).length,
                    quizScorePercent: c.overallScore
                }));
            }
        },
        enabled: !!pmId && !!pmName
    });

    const mentees = menteesData || [];
    const loading = isLoading;
    const error = fetchError ? 'Could not load assigned candidates.' : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-slate-500 font-medium">
                <Spinner size="md" color="indigo" text="Loading your mentorship dashboard..." />
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
        <div className={embedded ? '' : 'space-y-8 animate-in fade-in duration-500'}>
            {/* Header section */}
            {!embedded && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">PM Portal</span>
                        <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
                            Mentorship & Onboarding
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Monitor training progression and quiz outcomes for your team.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white border border-slate-200/60 p-4 px-6 rounded-2xl shadow-sm w-full md:w-auto">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-500 shrink-0" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Assigned Candidates</p>
                                <p className="text-lg font-extrabold text-slate-800">{mentees.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mentees list container */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Your Candidates</h3>
                </div>

                <div>
                    {mentees.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center max-w-md mx-auto">
                            <Users className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="font-bold text-slate-500 text-base">No candidates assigned to you</p>
                            <p className="text-sm text-slate-400 text-center mt-1">
                                When administrator links employees to your supervision, their module checklist status and quiz averages will display here.
                            </p>
                        </div>
                    ) : (
                        <Table
                            variant="borderless"
                            columns={[
                                {
                                    key: 'name',
                                    label: 'Candidate',
                                    render: (value, m) => (
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-blue-600 to-cyan-500 shadow-sm uppercase flex-shrink-0">
                                                {value ? value.split(' ').map(n => n[0]).join('').substring(0, 2) : 'EM'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{value}</p>
                                                <p className="text-[10px] text-slate-400">{m.email}</p>
                                                <span className="inline-block mt-1 text-[9px] uppercase tracking-wider font-extrabold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {m.department || 'Annotator'}
                                                </span>
                                            </div>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'completedModulesCount',
                                    label: 'Modules Completed',
                                    align: 'center',
                                    render: (value) => (
                                        <div className="flex flex-col items-center">
                                            <span className="font-extrabold text-slate-800 text-base">{value}</span>
                                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Completed</span>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'quizScorePercent',
                                    label: 'Quiz Score Average',
                                    align: 'center',
                                    render: (value) => (
                                        <div className="inline-flex items-center gap-1 bg-blue-50/80 text-blue-700 font-extrabold px-3 py-1 rounded-full border border-blue-100 text-xs">
                                            {value}%
                                        </div>
                                    ),
                                },
                                {
                                    key: 'isActive',
                                    label: 'Status',
                                    align: 'center',
                                    render: (value) => (
                                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${value ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                            {value ? 'Active' : 'Inactive'}
                                        </span>
                                    ),
                                },
                            ]}
                            data={mentees}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PMOnboardingDashboard;
