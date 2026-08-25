import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wifi,
  Plus,
  Trash2,
  Loader2,
  Settings,
  Save,
  Edit2,
  Building2,
  MapPin,
  Sparkles,
} from "lucide-react";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { wifiNetworksApi, companySettingsApi } from "../../services/api";
import toast from "react-hot-toast";

const AdminCompanySettingsPage = () => {
  const queryClient = useQueryClient();

  // General Settings state
  const [generalSettings, setGeneralSettings] = useState({
    office_address: "",
    google_maps_link: "",
    company_perks: "",
  });

  const { data: networks = [], isLoading: networksLoading } = useQuery({
    queryKey: ["wifiNetworks"],
    queryFn: wifiNetworksApi.getAll,
  });

  const { data: settingsData = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["companySettings"],
    queryFn: companySettingsApi.getAll,
  });

  // WiFi Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", password: "" });
  const [deletingId, setDeletingId] = useState(null);
  const [wifiDeleteConfirm, setWifiDeleteConfirm] = useState(null);

  useEffect(() => {
    if (settingsData && settingsData.length > 0) {
      const settingsMap = {};
      settingsData.forEach((s) => {
        settingsMap[s.key] = s.value || "";
      });
      setGeneralSettings({
        office_address: settingsMap.office_address || "",
        google_maps_link: settingsMap.google_maps_link || "",
        company_perks: settingsMap.company_perks || "",
      });
    }
  }, [settingsData]);

  const loading = networksLoading || settingsLoading;

  // --- General Settings Logic ---
  const SETTINGS_LABELS = {
    office_address: "Office address",
    google_maps_link: "Google Maps link",
    company_perks: "Company perks",
  };

  const saveGeneralMutation = useMutation({
    mutationFn: async (settings) => {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const keys = ["office_address", "google_maps_link", "company_perks"];

      const results = await Promise.allSettled(
        keys.map((key) =>
          companySettingsApi.upsert(key, {
            value: settings[key],
            updated_by: user.id,
          }),
        ),
      );

      const succeeded = [];
      const failed = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") succeeded.push(keys[i]);
        else failed.push(keys[i]);
      });

      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      // Refresh local state if anything actually wrote
      if (succeeded.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["companySettings"] });
      }

      if (failed.length === 0) {
        toast.success("General company settings saved!");
        return;
      }

      if (succeeded.length === 0) {
        toast.error("Failed to save general settings");
        return;
      }

      // Partial save — be explicit so the admin knows what stuck
      const ok = succeeded.map((k) => SETTINGS_LABELS[k]).join(", ");
      const bad = failed.map((k) => SETTINGS_LABELS[k]).join(", ");
      toast.error(`Partially saved (${ok}). Failed: ${bad}. Try again for the failed fields.`);
    },
    onError: () => {
      toast.error("Failed to save general settings");
    },
  });

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    saveGeneralMutation.mutate(generalSettings);
  };
  const savingGeneral = saveGeneralMutation.isPending;

  // --- WiFi Logic ---
  const openAddForm = () => {
    setEditingId(null);
    setFormData({ name: "", password: "" });
    setIsFormOpen(true);
  };

  const openEditForm = (network) => {
    setEditingId(network.id);
    setFormData({ name: network.name, password: network.password || "" });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormData({ name: "", password: "" });
    setEditingId(null);
  };

  const saveWifiMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingId) {
        await wifiNetworksApi.update(editingId, payload);
      } else {
        await wifiNetworksApi.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wifiNetworks"] });
      toast.success(
        editingId
          ? "WiFi network updated successfully!"
          : "WiFi network added successfully!",
      );
      closeForm();
    },
    onError: () => {
      toast.error(
        editingId ? "Failed to update network" : "Failed to add network",
      );
    },
  });

  const handleSaveWifi = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Network name is required");
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    saveWifiMutation.mutate({ ...formData, updated_by: user.id });
  };
  const savingWifi = saveWifiMutation.isPending;

  const deleteWifiMutation = useMutation({
    mutationFn: (id) => wifiNetworksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wifiNetworks"] });
      toast.success("WiFi network deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete WiFi network");
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const handleDeleteWifi = (id) => {
    setDeletingId(id);
    deleteWifiMutation.mutate(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-stone-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 w-full">


        {/* General Information Card */}
        <form
          onSubmit={handleSaveGeneral}
          className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="bg-stone-50/50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-display font-bold text-stone-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                General Information
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Update the office location and company perks displayed to employees.
              </p>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={savingGeneral}
              isLoading={savingGeneral}
            >
              {!savingGeneral && <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Location Details */}
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    Office Address
                  </label>
                  <textarea
                    value={generalSettings.office_address}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        office_address: e.target.value,
                      })
                    }
                    placeholder="Enter full office address..."
                    rows={4}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-stone-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-2">
                    Google Maps Link
                  </label>
                  <input
                    type="text"
                    value={generalSettings.google_maps_link}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        google_maps_link: e.target.value,
                      })
                    }
                    placeholder="https://maps.google.com/..."
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-stone-400"
                  />
                </div>
              </div>

              {/* Right Column: Perks */}
              <div className="flex flex-col">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Employee Perks & Benefits
                </label>
                <textarea
                  value={generalSettings.company_perks}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      company_perks: e.target.value,
                    })
                  }
                  placeholder="Flexible working hours&#10;Health insurance coverage&#10;..."
                  className="w-full flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-stone-400 resize-none min-h-[140px]"
                />
                <p className="text-[10px] font-medium text-stone-400 mt-1.5 ml-1">
                  Enter one perk per line. Displayed as a list to employees.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* WiFi Networks List Card */}
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-stone-50/50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-display font-bold text-stone-800 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-600" />
                Office WiFi Networks
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Manage multiple wireless networks available at the office.
              </p>
            </div>
            {!isFormOpen && (
              <Button variant="primary" size="sm" onClick={openAddForm}>
                <Plus className="w-4 h-4" />
                Add Network
              </Button>
            )}
          </div>

          {isFormOpen ? (
            <div className="p-6 bg-stone-50 border-b border-stone-100">
              <form
                onSubmit={handleSaveWifi}
                className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm"
              >
                <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                  {editingId ? "Edit WiFi Network" : "Add New WiFi Network"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Network Name (SSID) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g. Autonex-5G"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Password
                    </label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Leave blank for open network"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                  <Button
                    type="button"
                    variant="cancel"
                    onClick={closeForm}
                    disabled={savingWifi}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingWifi}
                    isLoading={savingWifi}
                  >
                    {!savingWifi && <Save className="w-4 h-4" />}
                    {editingId ? "Save Changes" : "Add Network"}
                  </Button>
                </div>
              </form>
            </div>
          ) : null}

          <div className="divide-y divide-stone-100">
            {networks.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm">
                No WiFi networks configured yet.
              </div>
            ) : (
              networks.map((network) => (
                <div
                  key={network.id}
                  className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                      <Wifi className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-800">
                        {network.name}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5 font-mono">
                        {network.password
                          ? `Password: ${network.password}`
                          : "Open Network (No Password)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditForm(network)}
                      className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                      disabled={isFormOpen}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setWifiDeleteConfirm(network.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        onConfirm={() => {
          handleDeleteWifi(wifiDeleteConfirm);
          setWifiDeleteConfirm(null);
        }}
        title="Delete WiFi Network"
        message="Are you sure you want to delete this WiFi network? This action cannot be undone."
        isPending={deletingId !== null}
      />
    </>
  );
};

export default AdminCompanySettingsPage;
