import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, CheckCircle, Clock, GraduationCap, ChevronRight, Play } from 'lucide-react';
import { onboardingApi } from '../../services/api';

const OnboardingDashboard = () => {
    const navigate = useNavigate();
    const [modules, setModules] = useState([]);
    const [stats, setStats] = useState({
        overallProgress: 0,
        completedModules: 0,
        totalModules: 0,
        avgQuizScore: 0,
        mentorName: 'Unassigned'
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;

    useEffect(() => {
        if (!userId) return;

        onboardingApi.getCandidateDashboard(userId)
            .then((data) => {
                setModules(data.modules || []);
                setStats(data.stats || {
                    overallProgress: 0,
                    completedModules: 0,
                    totalModules: 0,
                    avgQuizScore: 0,
                    mentorName: 'Unassigned'
                });
            })
            .catch((err) => {
                console.error('Failed to fetch onboarding dashboard:', err);
                setError('Could not load onboarding training modules.');
            })
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-slate-500 font-medium">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-600 mr-2" />
                Loading your training portal...
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
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Onboarding & Training</span>
                    <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
                        Welcome, {user.name ? user.name.split(' ')[0] : 'Employee'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Complete your required courses to get certified.</p>
                </div>

                <div className="flex items-center gap-4 bg-white border border-slate-200/60 p-4 px-6 rounded-2xl shadow-sm w-full md:w-auto">
                    <div className="flex items-center gap-3">
                        <GraduationCap className="w-8 h-8 text-emerald-500 shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Primary Mentor</p>
                            <p className="text-sm font-bold text-slate-800 break-words">{stats.mentorName}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* alignment progress card */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-2xl shadow-lg relative overflow-hidden group text-white flex flex-col justify-between min-h-[160px]">
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full transition-all group-hover:scale-110"></div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Progression</p>
                        <h3 className="text-lg font-bold mt-1">Overall Alignment</h3>
                    </div>
                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold">Total Progress</span>
                            <span className="text-xs font-bold">{stats.overallProgress}%</span>
                        </div>
                        <div className="w-full bg-white/25 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-white h-full transition-all duration-1000" style={{ width: `${stats.overallProgress}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* module completion card */}
                <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm relative overflow-hidden group flex flex-col justify-between min-h-[160px]">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50/20 rounded-bl-full transition-all group-hover:scale-110"></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Modules Completed</p>
                        <div className="mt-4 flex items-end gap-1.5 text-slate-800">
                            <span className="text-4xl font-extrabold">{stats.completedModules}</span>
                            <span className="text-xl font-light text-slate-300 mb-0.5">/</span>
                            <span className="text-lg font-bold text-slate-400 mb-0.5">{stats.totalModules}</span>
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-400 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-slate-300" />
                        Required training frameworks
                    </div>
                </div>

                {/* quiz average card */}
                <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm relative overflow-hidden group flex flex-col justify-between min-h-[160px]">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-teal-50/20 rounded-bl-full transition-all group-hover:scale-110"></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assessment Average</p>
                        <div className="mt-4 flex items-end gap-1.5 text-slate-800">
                            <span className="text-4xl font-extrabold">{stats.avgQuizScore}</span>
                            <span className="text-lg font-bold text-slate-400 mb-0.5">%</span>
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        Verified Competency
                    </div>
                </div>
            </div>

            {/* Modules list container */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Your Learning Path</h3>
                    <span className="text-xs font-bold text-slate-400 uppercase">Phase 1</span>
                </div>

                <div>
                    {modules.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 italic">No onboarding modules published yet.</div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {modules.map((m, idx) => {
                                const isCompleted = m.progress === 100;
                                const isStarted = m.progress > 0 && m.progress < 100;

                                return (
                                    <li key={m.id} className="p-6 hover:bg-slate-50/60 transition-all duration-200 group">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
                                                    isCompleted 
                                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                                        : isStarted 
                                                            ? 'bg-emerald-50/30 border-emerald-100/50 text-emerald-600' 
                                                            : 'bg-slate-50 border-slate-100 text-slate-400'
                                                }`}>
                                                    <BookOpen className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Module {m.order || idx + 1}</p>
                                                    <h4 className="text-base font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{m.title}</h4>
                                                    <p className="text-sm text-slate-500 line-clamp-1 mt-0.5 max-w-2xl">{m.description}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 md:w-1/3 justify-end">
                                                <div className="hidden md:flex flex-col items-end gap-1 flex-1">
                                                    <div className="flex justify-between w-full max-w-[120px] text-[10px] font-bold text-slate-400 uppercase">
                                                        <span>Progress</span>
                                                        <span className="text-slate-700">{m.progress}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full max-w-[120px] bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${m.progress}%` }}></div>
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    onClick={() => navigate(`/employee/onboarding/${m.id}`)}
                                                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                                                        isCompleted 
                                                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                                                            : 'bg-emerald-600 text-white shadow-md hover:bg-emerald-700'
                                                    }`}
                                                >
                                                    {isCompleted ? 'Review' : isStarted ? 'Continue' : 'Start'}
                                                    {isCompleted ? <ChevronRight className="w-3.5 h-3.5" /> : <Play className="w-3 h-3 fill-current" />}
                                                </button>
                                            </div>
                                            
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingDashboard;
