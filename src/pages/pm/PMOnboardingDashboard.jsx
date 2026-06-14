import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Award, CheckCircle, HelpCircle } from 'lucide-react';
import { onboardingApi } from '../../services/api';

const PMOnboardingDashboard = () => {
    const [mentees, setMentees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const pmId = user.id;

    useEffect(() => {
        if (!pmId) return;

        setLoading(true);
        setError(null);

        onboardingApi.getMentees(pmId)
            .then((menteesList) => {
                setMentees(menteesList);
            })
            .catch(async (err) => {
                console.warn('getMentees API failed, trying fallback from reports:', err);
                try {
                    const data = await onboardingApi.getReports();
                    const filtered = data.filter(c => c.mentorName === user.name);
                    setMentees(filtered.map(c => ({
                        id: c.userId,
                        name: c.name,
                        email: c.email,
                        department: c.department,
                        isActive: true,
                        completedModulesCount: (c.moduleStats || []).filter(m => m.progress === 100).length,
                        quizScorePercent: c.overallScore
                    })));
                } catch (fallbackErr) {
                    console.error('Failed to load mentees and reports:', fallbackErr);
                    setError('Could not load assigned candidates.');
                }
            })
            .finally(() => setLoading(false));
    }, [pmId, user.name]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-slate-500 font-medium">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-600 mr-2" />
                Loading your mentorship dashboard...
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
            {/* Header section */}
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
                                        <th className="py-4 px-6">Candidate</th>
                                        <th className="py-4 px-6 text-center">Modules Completed</th>
                                        <th className="py-4 px-6 text-center">Quiz Score Average</th>
                                        <th className="py-4 px-6 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {mentees.map((m) => (
                                        <tr key={m.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-blue-600 to-cyan-500 shadow-sm uppercase">
                                                        {m.name ? m.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'EM'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{m.name}</p>
                                                        <p className="text-[10px] text-slate-400">{m.email}</p>
                                                        <span className="inline-block mt-1 text-[9px] uppercase tracking-wider font-extrabold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                                            {m.department || 'Annotator'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-extrabold text-slate-800 text-base">{m.completedModulesCount}</span>
                                                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Completed</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="inline-flex items-center gap-1 bg-blue-50/80 text-blue-700 font-extrabold px-3 py-1 rounded-full border border-blue-100 text-xs">
                                                    {m.quizScorePercent}%
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                                    m.isActive 
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                                                }`}>
                                                    {m.isActive ? 'Active' : 'Inactive'}
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
        </div>
    );
};

export default PMOnboardingDashboard;
