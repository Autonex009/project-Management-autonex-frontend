import React, { useState, useEffect } from 'react';
import { Wifi, Plus, Trash2, Loader2, Settings, Save, Edit2, Building2, MapPin, Sparkles } from 'lucide-react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { wifiNetworksApi, companySettingsApi } from '../../services/api';
import toast from 'react-hot-toast';

const AdminCompanySettingsPage = () => {
    // WiFi state
    const [networks, setNetworks] = useState([]);
    
    // General Settings state
    const [generalSettings, setGeneralSettings] = useState({
        office_address: '',
        google_maps_link: '',
        company_perks: '',
    });

    const [loading, setLoading] = useState(true);
    const [savingGeneral, setSavingGeneral] = useState(false);
    
    // WiFi Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', password: '' });
    const [savingWifi, setSavingWifi] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [wifiDeleteConfirm, setWifiDeleteConfirm] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [networksData, settingsData] = await Promise.all([
                wifiNetworksApi.getAll(),
                companySettingsApi.getAll()
            ]);
            
            setNetworks(networksData);
            
            const settingsMap = {};
            settingsData.forEach(s => { settingsMap[s.key] = s.value || ''; });
            setGeneralSettings({
                office_address: settingsMap.office_address || '',
                google_maps_link: settingsMap.google_maps_link || '',
                company_perks: settingsMap.company_perks || '',
            });

        } catch (err) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    // --- General Settings Logic ---
    const handleSaveGeneral = async (e) => {
        e.preventDefault();
        setSavingGeneral(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await Promise.all([
                companySettingsApi.upsert('office_address', { value: generalSettings.office_address, updated_by: user.id }),
                companySettingsApi.upsert('google_maps_link', { value: generalSettings.google_maps_link, updated_by: user.id }),
                companySettingsApi.upsert('company_perks', { value: generalSettings.company_perks, updated_by: user.id }),
            ]);
            toast.success('General company settings saved!');
        } catch (err) {
            toast.error('Failed to save general settings');
        } finally {
            setSavingGeneral(false);
        }
    };


    // --- WiFi Logic ---
    const openAddForm = () => {
        setEditingId(null);
        setFormData({ name: '', password: '' });
        setIsFormOpen(true);
    };

    const openEditForm = (network) => {
        setEditingId(network.id);
        setFormData({ name: network.name, password: network.password || '' });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setFormData({ name: '', password: '' });
        setEditingId(null);
    };

    const handleSaveWifi = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Network name is required');
            return;
        }

        setSavingWifi(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const payload = { ...formData, updated_by: user.id };

            if (editingId) {
                await wifiNetworksApi.update(editingId, payload);
                toast.success('WiFi network updated successfully!');
            } else {
                await wifiNetworksApi.create(payload);
                toast.success('WiFi network added successfully!');
            }
            const networksData = await wifiNetworksApi.getAll();
            setNetworks(networksData);
            closeForm();
        } catch (err) {
            toast.error(editingId ? 'Failed to update network' : 'Failed to add network');
        } finally {
            setSavingWifi(false);
        }
    };

    const handleDeleteWifi = async (id) => {
        setDeletingId(id);
        try {
            await wifiNetworksApi.delete(id);
            toast.success('WiFi network deleted successfully');
            const networksData = await wifiNetworksApi.getAll();
            setNetworks(networksData);
        } catch (err) {
            toast.error('Failed to delete WiFi network');
        } finally {
            setDeletingId(null);
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
        <>
        <div className="space-y-6 max-w-4xl">
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

            {/* General Information Card */}
            <form onSubmit={handleSaveGeneral} className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100/60 px-6 py-4">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-500" />
                        General Information
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Update the office location and company perks displayed to employees.
                    </p>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
                            <MapPin className="w-4 h-4 text-rose-500" />
                            Office Address
                        </label>
                        <textarea
                            value={generalSettings.office_address}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, office_address: e.target.value })}
                            placeholder="Enter full office address..."
                            rows={3}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Google Maps Link
                        </label>
                        <input
                            type="text"
                            value={generalSettings.google_maps_link}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, google_maps_link: e.target.value })}
                            placeholder="https://maps.google.com/..."
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                            Employee Perks & Benefits (One per line)
                        </label>
                        <textarea
                            value={generalSettings.company_perks}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, company_perks: e.target.value })}
                            placeholder="Flexible working hours&#10;Health insurance coverage&#10;..."
                            rows={6}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                        />
                        <p className="text-xs text-slate-400 mt-1">Put each perk on a new line to display them as a list.</p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                    <Button type="submit" variant="success" size="lg" disabled={savingGeneral} isLoading={savingGeneral}>
                        {!savingGeneral && <Save className="w-4 h-4" />}
                        Save General Settings
                    </Button>
                </div>
            </form>

            {/* WiFi Networks List Card */}
            <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/60 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Wifi className="w-5 h-5 text-blue-500" />
                            Office WiFi Networks
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage multiple wireless networks available at the office.
                        </p>
                    </div>
                    {!isFormOpen && (
                        <Button variant="blue" onClick={openAddForm}>
                            <Plus className="w-4 h-4" />
                            Add Network
                        </Button>
                    )}
                </div>

                {isFormOpen ? (
                    <div className="p-6 bg-slate-50 border-b border-slate-100">
                        <form onSubmit={handleSaveWifi} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                {editingId ? 'Edit WiFi Network' : 'Add New WiFi Network'}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Network Name (SSID) *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Autonex-5G"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                                    <input
                                        type="text"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Leave blank for open network"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="cancel"
                                    onClick={closeForm}
                                    disabled={savingWifi}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={savingWifi} isLoading={savingWifi} className="bg-blue-600 hover:bg-blue-700">
                                    {!savingWifi && <Save className="w-4 h-4" />}
                                    {editingId ? 'Save Changes' : 'Add Network'}
                                </Button>
                            </div>
                        </form>
                    </div>
                ) : null}

                <div className="divide-y divide-slate-100">
                    {networks.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No WiFi networks configured yet.
                        </div>
                    ) : (
                        networks.map(network => (
                            <div key={network.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                        <Wifi className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{network.name}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                            {network.password ? `Password: ${network.password}` : 'Open Network (No Password)'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEditForm(network)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit"
                                        disabled={isFormOpen}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setWifiDeleteConfirm(network.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                        disabled={deletingId === network.id || isFormOpen}
                                    >
                                        {deletingId === network.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
        <ConfirmDialog
            isOpen={wifiDeleteConfirm !== null}
            onClose={() => setWifiDeleteConfirm(null)}
            onConfirm={() => { handleDeleteWifi(wifiDeleteConfirm); setWifiDeleteConfirm(null); }}
            title="Delete WiFi Network"
            message="Are you sure you want to delete this WiFi network? This action cannot be undone."
            isPending={deletingId !== null}
        />
        </>
    );
};

export default AdminCompanySettingsPage;
