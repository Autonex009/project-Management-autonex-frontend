import React, { useState, useEffect } from 'react';
import { Wifi, Save, Loader2, Settings, CheckCircle } from 'lucide-react';
import { companySettingsApi } from '../../services/api';
import toast from 'react-hot-toast';

const AdminCompanySettingsPage = () => {
    const [wifiName, setWifiName] = useState('');
    const [wifiPassword, setWifiPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        companySettingsApi.getAll()
            .then(settings => {
                const map = {};
                settings.forEach(s => { map[s.key] = s.value || ''; });
                setWifiName(map.wifi_name || '');
                setWifiPassword(map.wifi_password || '');
            })
            .catch(() => toast.error('Failed to load company settings'))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await Promise.all([
                companySettingsApi.upsert('wifi_name', { value: wifiName, updated_by: user.id }),
                companySettingsApi.upsert('wifi_password', { value: wifiPassword, updated_by: user.id }),
            ]);
            toast.success('WiFi settings saved successfully!');
        } catch {
            toast.error('Failed to save WiFi settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex items-center gap-3 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Loading settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-indigo-500" />
                    Company Settings
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Manage company-wide settings visible to all employees on the Company Info page.
                </p>
            </div>

            {/* WiFi Configuration Card */}
            <form onSubmit={handleSave} className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/60 px-6 py-4">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Wifi className="w-5 h-5 text-blue-500" />
                        WiFi Configuration
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        These credentials will be displayed to all employees on the Company Information → Office & Connectivity tab.
                    </p>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label htmlFor="wifi-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                            WiFi Network Name (SSID)
                        </label>
                        <input
                            id="wifi-name"
                            type="text"
                            value={wifiName}
                            onChange={(e) => setWifiName(e.target.value)}
                            placeholder="e.g. Autonex-Office-5G"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label htmlFor="wifi-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                            WiFi Password
                        </label>
                        <input
                            id="wifi-password"
                            type="text"
                            value={wifiPassword}
                            onChange={(e) => setWifiPassword(e.target.value)}
                            placeholder="Enter WiFi password"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            This password will be visible in plain text to all logged-in employees.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Changes take effect immediately
                    </p>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save WiFi Settings
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminCompanySettingsPage;
