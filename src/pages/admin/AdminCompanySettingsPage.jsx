import React, { useState, useEffect, useMemo } from "react";
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
  Globe,
  ShieldCheck,
} from "lucide-react";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { wifiNetworksApi, companySettingsApi, officeIpsApi } from "../../services/api";
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
    queryFn: () => wifiNetworksApi.getAll(),
  });

  const { data: settingsData = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["companySettings"],
    queryFn: () => companySettingsApi.getAll(),
  });

  const { data: officeIps = [], isLoading: officeIpsLoading } = useQuery({
    queryKey: ["officeIps"],
    queryFn: () => officeIpsApi.getAll(),
  });

  // WiFi Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", password: "" });
  const [deletingId, setDeletingId] = useState(null);
  const [wifiDeleteConfirm, setWifiDeleteConfirm] = useState(null);

  // Office IP Form state
  const [isIpFormOpen, setIsIpFormOpen] = useState(false);
  const [editingIpId, setEditingIpId] = useState(null);
  const [ipFormData, setIpFormData] = useState({ ip_address: "", label: "", floor: "" });
  const [isCustomFloor, setIsCustomFloor] = useState(false);
  const [deletingIpId, setDeletingIpId] = useState(null);
  const [ipDeleteConfirm, setIpDeleteConfirm] = useState(null);

  // Extract unique existing floors from configured office IPs
  const existingFloors = useMemo(() => {
    const floorsSet = new Set(["Floor 7", "Floor 9", "Floor 17"]);
    (officeIps || []).forEach((ip) => {
      if (ip.floor && ip.floor.trim()) {
        const flr = ip.floor.trim();
        floorsSet.add(flr.startsWith("Floor") ? flr : `Floor ${flr}`);
      }
    });
    return Array.from(floorsSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [officeIps]);

  const sortedOfficeIps = useMemo(() => {
    return [...(officeIps || [])].sort((a, b) => {
      const flrA = (a.floor || "").replace(/\D/g, "");
      const flrB = (b.floor || "").replace(/\D/g, "");
      const numA = parseInt(flrA, 10);
      const numB = parseInt(flrB, 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return (a.ip_address || "").localeCompare(b.ip_address || "");
    });
  }, [officeIps]);

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

  const loading = networksLoading || settingsLoading || officeIpsLoading;

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

  // --- Office IP Logic ---
  const openAddIpForm = () => {
    setEditingIpId(null);
    setIpFormData({
      ip_address: "",
      label: "",
      floor: existingFloors.length > 0 ? existingFloors[0] : "",
    });
    setIsCustomFloor(existingFloors.length === 0);
    setIsIpFormOpen(true);
  };

  const openEditIpForm = (item) => {
    setEditingIpId(item.id);
    const floorVal = item.floor || "";
    setIpFormData({
      ip_address: item.ip_address,
      label: item.label || "",
      floor: floorVal,
    });
    // If no existing floors or item's floor is custom, set custom mode
    if (existingFloors.length === 0 || (floorVal && !existingFloors.includes(floorVal))) {
      setIsCustomFloor(true);
    } else {
      setIsCustomFloor(false);
    }
    setIsIpFormOpen(true);
  };

  const closeIpForm = () => {
    setIsIpFormOpen(false);
    setIpFormData({ ip_address: "", label: "", floor: "" });
    setIsCustomFloor(false);
    setEditingIpId(null);
  };

  const saveIpMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingIpId) {
        await officeIpsApi.update(editingIpId, payload);
      } else {
        await officeIpsApi.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officeIps"] });
      toast.success(
        editingIpId
          ? "Office IP updated successfully!"
          : "Office IP added successfully!",
      );
      closeIpForm();
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Failed to save office IP";
      toast.error(typeof msg === "string" ? msg : "Failed to save office IP");
    },
  });

  const handleSaveIp = (e) => {
    e.preventDefault();
    if (!ipFormData.ip_address.trim()) {
      toast.error("IP address is required");
      return;
    }
    saveIpMutation.mutate(ipFormData);
  };
  const savingIp = saveIpMutation.isPending;

  const deleteIpMutation = useMutation({
    mutationFn: (id) => officeIpsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officeIps"] });
      toast.success("Office IP deleted successfully");
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Failed to delete office IP";
      toast.error(typeof msg === "string" ? msg : "Failed to delete office IP");
    },
    onSettled: () => {
      setDeletingIpId(null);
    },
  });

  const handleDeleteIp = (id) => {
    setDeletingIpId(id);
    deleteIpMutation.mutate(id);
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

        {/* Side-by-side Grid: WiFi Networks & Office IP Addresses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: WiFi Networks List Card */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
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

            <div className="divide-y divide-stone-100 max-h-[224px] overflow-y-auto flex-1">
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

          {/* Right Column: Office IP Addresses List Card */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-stone-50/50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-display font-bold text-stone-800 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  Office IP Addresses
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Authorized public IPs or CIDR blocks for office Wi-Fi check-in.
                </p>
              </div>
              {!isIpFormOpen && (
                <Button variant="primary" size="sm" onClick={openAddIpForm}>
                  <Plus className="w-4 h-4" />
                  Add IP Address
                </Button>
              )}
            </div>

            {isIpFormOpen ? (
              <div className="p-6 bg-stone-50 border-b border-stone-100">
                <form
                  onSubmit={handleSaveIp}
                  className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm"
                >
                  <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                    {editingIpId ? "Edit Office IP" : "Add New Office IP"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                        IP Address / CIDR *
                      </label>
                      <input
                        type="text"
                        value={ipFormData.ip_address}
                        onChange={(e) =>
                          setIpFormData({ ...ipFormData, ip_address: e.target.value })
                        }
                        placeholder="e.g. 38.20.140.122"
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                        required
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-stone-700">
                          Floor
                        </label>
                        {existingFloors.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomFloor((prev) => !prev);
                              if (!isCustomFloor) {
                                setIpFormData({ ...ipFormData, floor: "" });
                              } else {
                                setIpFormData({ ...ipFormData, floor: existingFloors[0] || "" });
                              }
                            }}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {isCustomFloor ? "Select from list" : "+ Add new"}
                          </button>
                        )}
                      </div>

                      {existingFloors.length === 0 || isCustomFloor ? (
                        <input
                          type="text"
                          value={ipFormData.floor}
                          onChange={(e) =>
                            setIpFormData({ ...ipFormData, floor: e.target.value })
                          }
                          placeholder={
                            existingFloors.length === 0
                              ? "Type floor (e.g. Floor 7)"
                              : "Type new floor name..."
                          }
                          className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                        />
                      ) : (
                        <select
                          value={ipFormData.floor}
                          onChange={(e) => {
                            if (e.target.value === "__add_new__") {
                              setIsCustomFloor(true);
                              setIpFormData({ ...ipFormData, floor: "" });
                            } else {
                              setIpFormData({ ...ipFormData, floor: e.target.value });
                            }
                          }}
                          className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all cursor-pointer"
                        >
                          <option value="">-- Select Floor --</option>
                          {existingFloors.map((flr) => (
                            <option key={flr} value={flr}>
                              {flr}
                            </option>
                          ))}
                          <option value="__add_new__">+ Add new floor...</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                        Label / ISP Name
                      </label>
                      <input
                        type="text"
                        value={ipFormData.label}
                        onChange={(e) =>
                          setIpFormData({ ...ipFormData, label: e.target.value })
                        }
                        placeholder="e.g. Primary Airtel Fiber"
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                    <Button
                      type="button"
                      variant="cancel"
                      onClick={closeIpForm}
                      disabled={savingIp}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={savingIp}
                      isLoading={savingIp}
                    >
                      {!savingIp && <Save className="w-4 h-4" />}
                      {editingIpId ? "Save Changes" : "Add IP"}
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}

            {/* List container showing ~3 items at a time and scrollable if more */}
            <div className="divide-y divide-stone-100 max-h-[260px] overflow-y-auto flex-1">
              {sortedOfficeIps.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-sm">
                  No office IP addresses configured yet.
                </div>
              ) : (
                sortedOfficeIps.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold font-mono text-stone-800">
                            {item.ip_address}
                          </span>
                          {item.floor && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                              <Building2 className="w-3 h-3 text-blue-500" />
                              {item.floor.startsWith("Floor") ? item.floor : `Floor ${item.floor}`}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {item.label ? item.label : "Authorized Office Gateway"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditIpForm(item)}
                        className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit"
                        disabled={isIpFormOpen}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIpDeleteConfirm(item.id)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                        disabled={deletingIpId === item.id || isIpFormOpen}
                      >
                        {deletingIpId === item.id ? (
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

            <div className="p-3.5 bg-stone-50/70 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>WFO check-ins require connection from one of these authorized public IPs.</span>
            </div>
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
      <ConfirmDialog
        isOpen={ipDeleteConfirm !== null}
        onClose={() => setIpDeleteConfirm(null)}
        onConfirm={() => {
          handleDeleteIp(ipDeleteConfirm);
          setIpDeleteConfirm(null);
        }}
        title="Delete Office IP"
        message="Are you sure you want to delete this authorized office IP? Employees checking in from this network may be blocked."
        isPending={deletingIpId !== null}
      />
    </>
  );
};

export default AdminCompanySettingsPage;
