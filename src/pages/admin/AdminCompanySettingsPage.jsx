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
  Utensils,
  ShieldCheck,
  Globe,
  Radio,
} from "lucide-react";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { wifiNetworksApi, companySettingsApi, canteenMenuApi } from "../../services/api";
import toast from "react-hot-toast";

const AdminCompanySettingsPage = () => {
  const queryClient = useQueryClient();

  // General Settings state
  const [generalSettings, setGeneralSettings] = useState({
    office_address: "",
    google_maps_link: "",
    company_perks: "",
  });

  // Office Wi-Fi / IP Restriction State
  const [checkinIpList, setCheckinIpList] = useState("");
  const [isIpRestrictionEnabled, setIsIpRestrictionEnabled] = useState(true);
  const [detectingIp, setDetectingIp] = useState(false);
  const [detectedIp, setDetectedIp] = useState(null);

  const { data: networks = [], isLoading: networksLoading } = useQuery({
    queryKey: ["wifiNetworks"],
    queryFn: () => wifiNetworksApi.getAll(),
  });

  const { data: settingsData = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["companySettings"],
    queryFn: () => companySettingsApi.getAll(),
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
      setCheckinIpList(settingsMap.checkin_ip_list || "");
      const toggleVal = (settingsMap.checkin_ip_restriction_enabled || "true").toLowerCase();
      setIsIpRestrictionEnabled(toggleVal !== "false" && toggleVal !== "0" && toggleVal !== "off");
    }
  }, [settingsData]);

  // --- Canteen Menu State & Logic ---
  const { data: canteenMenuData = [], isLoading: canteenMenuLoading } = useQuery({
    queryKey: ["canteenMenu"],
    queryFn: () => canteenMenuApi.getMenu(),
    staleTime: 5 * 60 * 1000,
  });

  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    if (canteenMenuData && canteenMenuData.length > 0) {
      setMenuItems(canteenMenuData);
    } else {
      setMenuItems([
        { id: "item-1", name: "Veg Thali", is_veg: true, extra_charge: 0 },
      ]);
    }
  }, [canteenMenuData]);

  const saveMenuMutation = useMutation({
    mutationFn: (items) => canteenMenuApi.updateMenu(items),
    onSuccess: (savedItems) => {
      // Pure RAM Cache Surgery (Law 3: Zero-Network Follow-Up)
      queryClient.setQueryData(["canteenMenu"], savedItems);
      toast.success("Canteen lunch menu saved successfully!");
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Failed to save canteen menu. Please try again.";
      toast.error(typeof msg === "string" ? msg : "Failed to save canteen menu.");
    },
  });

  const handleAddMenuItem = () => {
    const uniqueId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setMenuItems((prev) => [
      ...prev,
      { id: uniqueId, name: "", is_veg: true, extra_charge: 0 },
    ]);
  };

  const handleRemoveMenuItem = (index) => {
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMenuItem = (index, field, value) => {
    setMenuItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveMenu = () => {
    if (menuItems.length === 0) {
      toast.error("Please add at least one menu item.");
      return;
    }
    for (let i = 0; i < menuItems.length; i++) {
      if (!menuItems[i].name.trim()) {
        toast.error(`Item #${i + 1} name cannot be empty.`);
        return;
      }
      if (menuItems[i].extra_charge < 0) {
        toast.error(`Item #${i + 1} extra charge cannot be negative.`);
        return;
      }
    }
    saveMenuMutation.mutate(menuItems);
  };

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

  // --- Office Wi-Fi / IP Restriction Logic ---
  const saveIpSettingsMutation = useMutation({
    mutationFn: async ({ ipList, isEnabled }) => {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await companySettingsApi.upsert("checkin_ip_list", {
        value: ipList,
        updated_by: user.id,
      });
      await companySettingsApi.upsert("checkin_ip_restriction_enabled", {
        value: isEnabled ? "true" : "false",
        updated_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companySettings"] });
      toast.success("Office Wi-Fi & IP restriction settings saved!");
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Failed to save IP settings";
      toast.error(typeof msg === "string" ? msg : "Failed to save IP settings");
    },
  });

  const handleSaveIpSettings = (e) => {
    e?.preventDefault();
    saveIpSettingsMutation.mutate({
      ipList: checkinIpList,
      isEnabled: isIpRestrictionEnabled,
    });
  };

  const handleDetectMyIp = async () => {
    try {
      setDetectingIp(true);
      const res = await companySettingsApi.getMyIp();
      if (res?.ip) {
        setDetectedIp(res.ip);
        toast.success(`Detected current IP: ${res.ip}`);
      }
    } catch (err) {
      toast.error("Failed to detect current public IP.");
    } finally {
      setDetectingIp(false);
    }
  };

  const handleAddDetectedIp = () => {
    if (!detectedIp) return;
    const currentList = checkinIpList.trim();
    if (currentList.includes(detectedIp)) {
      toast("This IP is already in the whitelist.", { icon: "ℹ️" });
      return;
    }
    const updated = currentList ? `${currentList}\n${detectedIp}` : detectedIp;
    setCheckinIpList(updated);
    toast.success(`Added ${detectedIp} to the whitelist.`);
  };

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

        {/* Office Wi-Fi / IP Restriction Card */}
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-stone-50/50 border-b border-stone-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-display font-bold text-stone-800">
                    Office Wi-Fi & Check-in IP Whitelist (WFO Only)
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isIpRestrictionEnabled
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isIpRestrictionEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                      }`}
                    />
                    {isIpRestrictionEnabled ? "Enforced" : "Emergency Mode: OFF"}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Restricts Work From Office (WFO) check-ins strictly to authorized office Wi-Fi / public IPs.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveIpSettings}
                disabled={saveIpSettingsMutation.isPending}
                isLoading={saveIpSettingsMutation.isPending}
                className="flex items-center gap-1.5"
              >
                {!saveIpSettingsMutation.isPending && <Save className="w-4 h-4" />}
                Save IP Policy
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Emergency Toggle Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Radio className={`w-4 h-4 ${isIpRestrictionEnabled ? "text-emerald-600" : "text-amber-500"}`} />
                  <span className="text-sm font-bold text-stone-800">
                    Master IP Restriction Toggle
                  </span>
                </div>
                <p className="text-xs text-stone-500 max-w-xl">
                  Turn <span className="font-semibold text-rose-600">OFF</span> during office Wi-Fi or ISP outages to allow all employees to check in for WFO from any network. Turn <span className="font-semibold text-emerald-600">ON</span> for normal operations.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isIpRestrictionEnabled}
                onClick={() => setIsIpRestrictionEnabled(!isIpRestrictionEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isIpRestrictionEnabled ? "bg-emerald-600" : "bg-stone-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isIpRestrictionEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* IP Whitelist & Detection Section */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  Allowed Office Public IPs & Subnets (One per line or comma-separated)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDetectMyIp}
                    disabled={detectingIp}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-all shadow-2xs"
                  >
                    {detectingIp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3 text-blue-500" />}
                    Detect My Current IP
                  </button>
                  {detectedIp && (
                    <button
                      type="button"
                      onClick={handleAddDetectedIp}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      Add ({detectedIp})
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={checkinIpList}
                onChange={(e) => setCheckinIpList(e.target.value)}
                placeholder="e.g.&#10;103.54.189.22&#10;103.54.189.0/28"
                rows={5}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono text-stone-800 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-stone-400"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-stone-500">
                <span>Supports individual IPv4 addresses or CIDR blocks (e.g. <code>103.54.189.22</code>).</span>
                {checkinIpList.trim() && (
                  <span className="text-stone-400 font-mono">
                    {checkinIpList.split(/[\n,]/).filter((s) => s.trim()).length} IP(s) configured
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Canteen Lunch Menu Management Card */}
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-stone-50/50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-display font-bold text-stone-800">Daily Canteen Lunch Menu</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Manage today's meal options, dietary categories, and extra charges shown to employees during check-in.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddMenuItem}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveMenu}
                isLoading={saveMenuMutation.isPending}
                className="flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Save Menu
              </Button>
            </div>
          </div>

          <div className="p-6">
            {menuItems.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-sm">
                No menu items configured. Click "+ Add Item" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-16">Sr.</th>
                      <th className="py-2.5 px-3 min-w-[240px]">Menu Option</th>
                      <th className="py-2.5 px-3 w-44">Dietary Type</th>
                      <th className="py-2.5 px-3 w-40">Extra Charge (₹)</th>
                      <th className="py-2.5 px-3 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {menuItems.map((item, index) => (
                      <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-3 font-semibold text-stone-500">
                          {index + 1}.
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateMenuItem(index, "name", e.target.value)}
                            placeholder="e.g. Veg Thali, Pav Bhaji, Egg Biryani..."
                            className="w-full px-3 py-1.5 rounded-lg border border-stone-200 text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-100">
                            <button
                              type="button"
                              onClick={() => handleUpdateMenuItem(index, "is_veg", true)}
                              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                item.is_veg
                                  ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                                  : "text-stone-500 hover:text-stone-800"
                              }`}
                            >
                              🟢 Veg
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateMenuItem(index, "is_veg", false)}
                              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                !item.is_veg
                                  ? "bg-white text-rose-700 shadow-xs border border-rose-200"
                                  : "text-stone-500 hover:text-stone-800"
                              }`}
                            >
                              🔴 Non-Veg
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-stone-400 font-semibold">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={item.extra_charge}
                              onChange={(e) => handleUpdateMenuItem(index, "extra_charge", Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-stone-200 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveMenuItem(index)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
