import React, { useState, useEffect } from 'react';
import { Send, Calendar, Building2, ShieldCheck, Sparkles, MapPin, Wifi, Copy, Check, Globe, Cpu, Bot, Layers } from 'lucide-react';
import { companySettingsApi } from '../../services/api';
import toast from 'react-hot-toast';

const CompanyInfoPage = () => {
    const [activeTab, setActiveTab] = useState('about');
    const [wifiInfo, setWifiInfo] = useState({ wifi_name: '', wifi_password: '' });
    const [copied, setCopied] = useState(false);
    const [wifiLoading, setWifiLoading] = useState(true);

    useEffect(() => {
        companySettingsApi.getAll()
            .then(settings => {
                const map = {};
                settings.forEach(s => { map[s.key] = s.value || ''; });
                setWifiInfo({ wifi_name: map.wifi_name || '', wifi_password: map.wifi_password || '' });
            })
            .catch(() => {})
            .finally(() => setWifiLoading(false));
    }, []);

    const handleCopyPassword = () => {
        if (!wifiInfo.wifi_password) return;
        navigator.clipboard.writeText(wifiInfo.wifi_password);
        setCopied(true);
        toast.success('WiFi password copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const tabs = [
        { id: 'about', label: 'About Autonex', icon: Sparkles },
        { id: 'slack', label: 'Slack Guidelines', icon: Send },
        { id: 'leaves', label: 'Leaves Policy', icon: Calendar },
        { id: 'office', label: 'Office & Connectivity', icon: Building2 },
    ];

    const focusAreas = [
        { icon: Layers, label: 'AI Data Annotation & Labeling' },
        { icon: Bot, label: 'Robotics & Autonomous Systems Datasets' },
        { icon: Cpu, label: 'Industrial AI & Predictive Intelligence' },
        { icon: Globe, label: 'Digital Twins & IIoT' },
        { icon: Layers, label: 'Sensor Fusion & Multimodal AI Datasets' },
        { icon: Bot, label: 'Physical AI Infrastructure & Deployment' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'about':
                return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Company Description */}
                        <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-100/60 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-500" />
                                What is Autonex AI?
                            </h3>
                            <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                                <p>
                                    <strong className="text-slate-800">Autonex AI 360 Pvt. Ltd.</strong> is an India-based AI and data infrastructure company focused on building solutions for Physical AI, industrial automation, robotics, and high-quality AI data annotation services. The company was incorporated in 2025 and is headquartered in Maharashtra, with operations centered around AI, industrial systems, and data services.
                                </p>
                                <p>
                                    The company provides domain-expert annotation services for high-stakes AI applications, particularly in robotics, manufacturing, automation, and sensor-heavy environments where accuracy is critical.
                                </p>
                            </div>
                        </div>

                        {/* Focus Areas */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Focus Areas</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {focusAreas.map((area, idx) => {
                                    const AreaIcon = area.icon;
                                    return (
                                        <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-indigo-200 transition-colors">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                <AreaIcon className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <span className="text-sm text-slate-700 font-medium">{area.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Address */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-rose-500" />
                                Office Address
                            </h3>
                            <div className="text-sm text-slate-600 space-y-2">
                                <p className="leading-relaxed">
                                    <strong className="text-slate-800">703, Lodha Supremus</strong><br />
                                    Saki Vihar Road, Opposite L&T Gate No. 6<br />
                                    Powai, Mumbai, Maharashtra – 400072<br />
                                    India
                                </p>
                                <a
                                    href="https://maps.google.com/?q=703+Lodha+Supremus+Saki+Vihar+Road+Powai+Mumbai"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-2 text-indigo-600 hover:text-indigo-700 text-xs font-semibold transition-colors"
                                >
                                    <MapPin className="w-3.5 h-3.5" />
                                    View on Google Maps →
                                </a>
                            </div>
                        </div>
                    </div>
                );
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
                        {/* 1. Allotments Grid */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-emerald-500" />
                                Leave Entitlements & Allotments
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-emerald-250 transition-colors">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Annual Paid Leave (APL)</p>
                                    <p className="text-3xl font-extrabold text-emerald-600 mt-1">12 Days</p>
                                    <p className="text-xs text-slate-500 mt-1">Granted per calendar year</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-emerald-250 transition-colors">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">National Holidays</p>
                                    <p className="text-3xl font-extrabold text-indigo-600 mt-1">8 Days</p>
                                    <p className="text-xs text-slate-500 mt-1">Fixed cultural & religious days</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-emerald-250 transition-colors">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Floater Leave</p>
                                    <p className="text-3xl font-extrabold text-amber-600 mt-1">2 Days</p>
                                    <p className="text-xs text-slate-500 mt-1">For personal observances</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-emerald-250 transition-colors">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Earned Leave Accrual</p>
                                    <p className="text-3xl font-extrabold text-rose-650 mt-1">1 / 20</p>
                                    <p className="text-xs text-slate-500 mt-1">1 day per 20 completed workdays</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Leave Application Process callout */}
                        <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 space-y-3">
                            <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-amber-600" />
                                NOTE: Leave Application & Approval Process
                            </h4>
                            <ul className="list-disc list-inside text-sm text-amber-900/80 space-y-1.5 pl-1">
                                <li>All leave and Work From Home (WFH) requests must be applied and tracked through the <strong>PM Portal</strong>.</li>
                                <li>Leave shall be considered approved only after <strong>prior approval</strong> from the reporting manager.</li>
                                <li>Employees are required to apply for leave <strong>1 week in advance</strong>, except in cases of unforeseen emergencies.</li>
                            </ul>
                        </div>

                        {/* 3. Intern and Clubbing Policies */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                                <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Leave Policy for Interns 🎓</h4>
                                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5">
                                    <li>Interns are eligible to avail <strong>1 leave per month</strong>.</li>
                                    <li>Any leave exceeding <strong>1 leave per month</strong> will be considered as <strong>unpaid leave</strong>.</li>
                                    <li>Additional leave requests may be considered only under exceptional circumstances and subject to management approval.</li>
                                </ul>
                            </div>
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                                <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Leave Clubbing Policy 🤝</h4>
                                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5">
                                    <li>Full-time employees may choose to <strong>club or combine</strong> their leaves together if required.</li>
                                    <li>Employees cannot avail more than <strong>5 consecutive leaves</strong> at a time without special management approval.</li>
                                    <li>Employees are encouraged to utilize leaves responsibly and avoid planning that impacts workflow and team operations.</li>
                                </ul>
                            </div>
                        </div>

                        {/* 4. Core Availability and Commitment */}
                        <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-2xl p-5 space-y-3">
                            <h4 className="font-bold text-indigo-850 text-sm">Working Hours & Weekend Support 🕒</h4>
                            <div className="text-sm text-indigo-900/80 space-y-2.5">
                                <p>
                                    <strong>Core Working Hours:</strong> Employees are expected to be available between <strong>9:00 AM and 8:00 PM IST</strong>. While continuous online presence throughout these hours is not required, you are expected to remain responsive, attend team calls, and actively collaborate during this window.
                                </p>
                                <p>
                                    <strong>Weekend Contributions:</strong> From time to time, the organization may require support on weekends for business needs. While weekend availability is not mandatory, your willingness to contribute during such times is highly appreciated. Any such contributions will be duly compensated in accordance with company policy.
                                </p>
                                <p className="text-xs text-indigo-800/70 italic">
                                    Proactive participation and flexibility, including occasional weekend contributions, demonstrate ownership and commitment. Such efforts are recognized and contribute positively to individual growth, increased responsibilities, and future opportunities within the organization.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 'office':
                return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Office Hours */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-emerald-500" />
                                Office Details
                            </h3>
                            <div className="space-y-4 text-sm text-slate-600">
                                <div>
                                    <strong className="text-slate-800 block mb-1">Physical Address:</strong>
                                    <p>703, Lodha Supremus, Saki Vihar Road, Opposite L&T Gate No. 6, Powai, Mumbai 400072</p>
                                </div>
                                <hr className="border-slate-200/60" />
                                <div>
                                    <strong className="text-slate-800 block mb-1">Office Hours:</strong>
                                    <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                                    <p className="text-slate-400 text-xs mt-0.5">Flexible logging available for engineering and annotation teams.</p>
                                </div>
                            </div>
                        </div>

                        {/* WiFi Information — Dynamic */}
                        <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-100/60 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Wifi className="w-5 h-5 text-blue-500" />
                                WiFi Information
                            </h3>
                            {wifiLoading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                                    Loading WiFi details...
                                </div>
                            ) : wifiInfo.wifi_name ? (
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500 font-medium w-32">Network Name:</span>
                                        <span className="text-slate-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-slate-200">{wifiInfo.wifi_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500 font-medium w-32">Password:</span>
                                        <span className="text-slate-800 font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200">{wifiInfo.wifi_password}</span>
                                        <button
                                            onClick={handleCopyPassword}
                                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">WiFi information has not been configured yet. Please contact your administrator.</p>
                            )}
                        </div>

                        {/* Employee Perks & Benefits */}
                        <div className="bg-emerald-50/40 border border-emerald-100/60 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-emerald-500" />
                                Employee Perks & Benefits
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    'Flexible working hours with remote work options',
                                    'Health insurance coverage for employees',
                                    'Professional development & learning budget',
                                    'Festival and performance-based bonuses',
                                    'Paid national holidays and floater leaves',
                                    'Weekend contribution compensation',
                                ].map((perk, idx) => (
                                    <div key={idx} className="flex items-center gap-2.5 bg-white border border-emerald-100 rounded-xl px-4 py-3 text-sm text-slate-700">
                                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400" />
                                        {perk}
                                    </div>
                                ))}
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
            <div className="flex border-b border-slate-200 overflow-x-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-all -mb-px cursor-pointer whitespace-nowrap ${
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
