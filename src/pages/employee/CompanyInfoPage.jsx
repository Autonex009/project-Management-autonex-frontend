import React, { useState } from 'react';
import { Send, Calendar, Building2, ExternalLink, ShieldCheck } from 'lucide-react';

const CompanyInfoPage = () => {
    const [activeTab, setActiveTab] = useState('slack');

    const tabs = [
        { id: 'slack', label: 'Slack Guidelines', icon: Send },
        { id: 'leaves', label: 'Leaves Policy', icon: Calendar },
        { id: 'office', label: 'Office Details', icon: Building2 },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'slack':
                return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Send className="w-5 h-5 text-emerald-500" />
                                Professional Slack Etiquette
                            </h3>
                            <ul className="space-y-4 text-sm text-slate-600">
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">1</span>
                                    <div>
                                        <strong className="text-slate-800 block">Add Clear Context Upfront 📝</strong>
                                        Don't just drop a link. Mention what it is, why it matters, and the expected action.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">2</span>
                                    <div>
                                        <strong className="text-slate-800 block">Clean Hyperlinking 🔗</strong>
                                        Hyperlink docs cleanly instead of pasting raw URLs. Use meaningful link text like <span className="italic text-indigo-600 font-medium">"VIGIL Installation Checklist"</span>.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">3</span>
                                    <div>
                                        <strong className="text-slate-800 block">Tag the Right People 🎯</strong>
                                        Avoid tagging large groups unnecessarily; tag owners and action-takers directly.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">4</span>
                                    <div>
                                        <strong className="text-slate-800 block">Add a "So What?" Line 💡</strong>
                                        Clearly state why the team should care, what has changed, or what decision is needed.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">5</span>
                                    <div>
                                        <strong className="text-slate-800 block">Structured Formatting 📂</strong>
                                        Use bullets, spacing, and short paragraphs. Large text walls reduce response and reading quality.
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">6</span>
                                    <div>
                                        <strong className="text-slate-800 block">Use Emojis Intentionally 🔴</strong>
                                        Create quick visual scanning by using intentional status emojis (e.g. 🔴 <span className="text-xs text-slate-500 font-semibold">blocker</span>, 🟡 <span className="text-xs text-slate-500 font-semibold">pending</span>, ✅ <span className="text-xs text-slate-500 font-semibold">done</span>, 🚀 <span className="text-xs text-slate-500 font-semibold">launch</span>, ⚠️ <span className="text-xs text-slate-500 font-semibold">urgent</span>).
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">7</span>
                                    <div>
                                        <strong className="text-slate-800 block">Clearly Mention Ownership + Timelines ⏳</strong>
                                        Provide explicit ownership and delivery timelines (e.g., <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 text-xs font-semibold">@User to review by EOD</code> or <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 text-xs font-semibold">@User to share inputs tomorrow morning</code>).
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">8</span>
                                    <div>
                                        <strong className="text-slate-800 block">End with Explicit Next Steps or Asks 🏁</strong>
                                        Don't leave messages open-ended. Clearly outline action-items (e.g., review, approve, comment, test, deploy).
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                );
            case 'leaves':
                return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-emerald-500" />
                                Standard Leave Allotments
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sick Leave</p>
                                    <p className="text-3xl font-extrabold text-slate-800 mt-1">12 Days</p>
                                    <p className="text-xs text-slate-500 mt-1">Annual allotment</p>
                                </div>
                                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Casual Leave</p>
                                    <p className="text-3xl font-extrabold text-slate-800 mt-1">12 Days</p>
                                    <p className="text-xs text-slate-500 mt-1">For personal matters</p>
                                </div>
                                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Holidays</p>
                                    <p className="text-3xl font-extrabold text-slate-800 mt-1">10 Days</p>
                                    <p className="text-xs text-slate-500 mt-1">Declared calendar holidays</p>
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm mb-2">Policy Highlights:</h4>
                            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2">
                                <li>All leaves should be requested at least <strong>48 hours in advance</strong> via the Leaves portal.</li>
                                <li>Emergency medical leaves must be accompanied by doctor certifications if exceeding 3 consecutive days.</li>
                                <li>Unused leaves expire at the end of the calendar year and do not carry forward.</li>
                            </ul>
                        </div>
                    </div>
                );
            case 'office':
                return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-emerald-500" />
                                Autonex HQ Office Details
                            </h3>
                            <div className="space-y-4 text-sm text-slate-600">
                                <div>
                                    <strong className="text-slate-800 block mb-1">Physical Address:</strong>
                                    <p>Autonex AI Innovation Hub, Floor 4, Cyber Towers, Sector 62, Noida, UP - 201301</p>
                                </div>
                                <hr className="border-slate-200/60" />
                                <div>
                                    <strong className="text-slate-800 block mb-1">Office Hours:</strong>
                                    <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                                    <p className="text-slate-400 text-xs mt-0.5">Flexible logging available for engineering and annotation teams.</p>
                                </div>
                                <hr className="border-slate-200/60" />
                                <div>
                                    <strong className="text-slate-800 block mb-1">Facility Rules:</strong>
                                    <ul className="list-disc list-inside space-y-1 mt-1 text-slate-600">
                                        <li>Access cards must be worn and visible at all times.</li>
                                        <li>Cafeteria services are available from 8:30 AM to 7:00 PM.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Company Information</h1>
                <p className="text-slate-500 text-sm mt-1">General reference handbook, policies, and guidelines</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-all -mb-px cursor-pointer ${
                                isActive
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Panel Content */}
            <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default CompanyInfoPage;
