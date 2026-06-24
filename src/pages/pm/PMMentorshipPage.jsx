import React, { useState } from 'react';
import { GraduationCap, Sparkles, Users } from 'lucide-react';
import NewlyOnboardedPage from '../NewlyOnboardedPage';
import PMOnboardingDashboard from './PMOnboardingDashboard';

const TABS = [
    { key: 'newly', label: 'Newly Onboarded', icon: Sparkles },
    { key: 'mentees', label: 'My Mentees', icon: Users },
];

const PMMentorshipPage = () => {
    const [tab, setTab] = useState('newly');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Section header */}
            <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600">PM Portal</span>
                <h1 className="text-3xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                    <GraduationCap className="w-7 h-7 text-blue-500" /> Mentorship
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Pick from newly onboarded annotators and track the onboarding progress of your team.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-1.5 pb-3 text-sm font-bold transition-all ${
                            tab === key
                                ? 'border-b-2 border-blue-500 text-blue-600'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Icon className="w-4 h-4" /> {label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'newly' ? (
                <NewlyOnboardedPage embedded />
            ) : (
                <PMOnboardingDashboard embedded />
            )}
        </div>
    );
};

export default PMMentorshipPage;
