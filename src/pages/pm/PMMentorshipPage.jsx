import React, { useState } from 'react';
import { GraduationCap, Sparkles, Users } from 'lucide-react';
import NewlyOnboardedPage from '../NewlyOnboardedPage';
import PMOnboardingDashboard from './PMOnboardingDashboard';

const TABS = [
 { key: 'mentees', label: 'My Mentees', icon: Users },
 { key: 'newly', label: 'Newly Onboarded', icon: Sparkles },
];

const PMMentorshipPage = () => {
 const [tab, setTab] = useState('mentees');

 return (
 <div className="space-y-6 animate-in fade-in duration-500">
 {/* Section header */}
 <div>
 <h1 className="text-lg font-semibold text-slate-900">Mentorship</h1>
 <p className="text-slate-500 text-[13px] mt-0.5">
 Pick from newly onboarded annotators and track the onboarding progress of your team.
 </p>
 </div>

 {/* Tabs */}
 <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 w-fit">
 {TABS.map(({ key, label, icon: Icon }) => (
 <button
 key={key}
 onClick={() => setTab(key)}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all whitespace-nowrap ${
 tab === key
 ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70'
 : 'text-slate-500 hover:text-slate-800'
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
