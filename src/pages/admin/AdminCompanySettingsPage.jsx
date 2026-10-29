import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  MapPin,
  ExternalLink,
  Sparkles,
  Wifi,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  Globe,
  Utensils,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save,
  RotateCcw,
  Eye,
  Loader2,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { wifiNetworksApi, companySettingsApi, canteenMenuApi } from "../../services/api";
import toast from "react-hot-toast";

const AdminCompanySettingsPage = () => {
  const queryClient = useQueryClient();

  // Navigation tabs matching shared components (image copy 2.png)
  const TABS = [
    { id: "general", label: "General" },
    { id: "network", label: "Office Wi-Fi & Security" },
    { id: "canteen", label: "Lunch Menu" },
  ];

  const [activeTab, setActiveTab] = useState("general");

  // --------------------------------------------------------------------------
  // 1. General Workplace Settings State
  // --------------------------------------------------------------------------
  const [generalSettings, setGeneralSettings] = useState({
    office_address: "",
    google_maps_link: "",
    company_perks: "",
  });
  const [isPerksVisualMode, setIsPerksVisualMode] = useState(true);
  const [newPerkInput, setNewPerkInput] = useState("");

  // --------------------------------------------------------------------------
  // 2. Office Wi-Fi / IP Restriction State
  // --------------------------------------------------------------------------
  const [checkinIpList, setCheckinIpList] = useState("");
  const [isIpRestrictionEnabled, setIsIpRestrictionEnabled] = useState(true);
  const [detectingIp, setDetectingIp] = useState(false);
  const [detectedIp, setDetectedIp] = useState(null);
  const [copiedWifiId, setCopiedWifiId] = useState(null);

  // WiFi Modal State
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);
  const [editingWifiId, setEditingWifiId] = useState(null);
  const [wifiFormData, setWifiFormData] = useState({ name: "", password: "" });
  const [deletingWifiId, setDeletingWifiId] = useState(null);
  const [wifiDeleteConfirm, setWifiDeleteConfirm] = useState(null);

  // --------------------------------------------------------------------------
  // 3. Daily Canteen Lunch Menu State (Training Module drag system)
  // --------------------------------------------------------------------------
  const [menuItems, setMenuItems] = useState([]);
  const [hasMenuChanges, setHasMenuChanges] = useState(false);
  const [previewSelectedId, setPreviewSelectedId] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // --------------------------------------------------------------------------
  // Data Queries
  // --------------------------------------------------------------------------
  const { data: networks = [], isLoading: networksLoading } = useQuery({
    queryKey: ["wifiNetworks"],
    queryFn: () => wifiNetworksApi.getAll(),
  });

  const { data: settingsData = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["companySettings"],
    queryFn: () => companySettingsApi.getAll(),
  });

  const { data: canteenMenuData = [], isLoading: canteenMenuLoading } = useQuery({
    queryKey: ["canteenMenu"],
    queryFn: () => canteenMenuApi.getMenu(),
    staleTime: 5 * 60 * 1000,
  });

  // Sync settings when fetched
  useEffect(() => {
    if (settingsData && settingsData.length > 0) {
      const map = {};
      settingsData.forEach((s) => {
        map[s.key] = s.value || "";
      });
      setGeneralSettings({
        office_address: map.office_address || "",
        google_maps_link: map.google_maps_link || "",
        company_perks: map.company_perks || "",
      });
      setCheckinIpList(map.checkin_ip_list || "");
      const toggleVal = (map.checkin_ip_restriction_enabled || "true").toLowerCase();
      setIsIpRestrictionEnabled(toggleVal !== "false" && toggleVal !== "0" && toggleVal !== "off");
    }
  }, [settingsData]);

  // Sync canteen menu
  useEffect(() => {
    if (canteenMenuData && canteenMenuData.length > 0) {
      setMenuItems(canteenMenuData);
      setPreviewSelectedId(canteenMenuData[0]?.id || null);
      setHasMenuChanges(false);
    } else {
      const defaultItem = {
        id: "item-default-1",
        name: "Standard Veg Thali",
        is_veg: true,
        extra_charge: 0,
      };
      setMenuItems([defaultItem]);
      setPreviewSelectedId(defaultItem.id);
    }
  }, [canteenMenuData]);

  useEffect(() => {
    if (menuItems.length > 0) {
      if (!previewSelectedId || !menuItems.find((i) => i.id === previewSelectedId)) {
        setPreviewSelectedId(menuItems[0].id);
      }
    } else {
      setPreviewSelectedId(null);
    }
  }, [menuItems, previewSelectedId]);

  const perksList = useMemo(() => {
    return generalSettings.company_perks
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
  }, [generalSettings.company_perks]);

  // --------------------------------------------------------------------------
  // Mutations: General Settings (Preserving Promise.allSettled error handling)
  // --------------------------------------------------------------------------
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

      const ok = succeeded.map((k) => SETTINGS_LABELS[k]).join(", ");
      const bad = failed.map((k) => SETTINGS_LABELS[k]).join(", ");
      toast.error(`Partially saved (${ok}). Failed: ${bad}. Try again for the failed fields.`);
    },
    onError: () => {
      toast.error("Failed to save general settings");
    },
  });

  const handleSaveGeneral = (e) => {
    e?.preventDefault();
    saveGeneralMutation.mutate(generalSettings);
  };

  const handleAddPerk = (e) => {
    e?.preventDefault();
    const trimmed = newPerkInput.trim();
    if (!trimmed) return;
    const currentList = perksList;
    const updated = [...currentList, trimmed].join("\n");
    setGeneralSettings((prev) => ({ ...prev, company_perks: updated }));
    setNewPerkInput("");
  };

  const handleRemovePerk = (indexToRemove) => {
    const updated = perksList.filter((_, i) => i !== indexToRemove).join("\n");
    setGeneralSettings((prev) => ({ ...prev, company_perks: updated }));
  };

  // --------------------------------------------------------------------------
  // Mutations: Wi-Fi Networks
  // --------------------------------------------------------------------------
  const openAddWifi = () => {
    setEditingWifiId(null);
    setWifiFormData({ name: "", password: "" });
    setIsWifiModalOpen(true);
  };

  const openEditWifi = (network) => {
    setEditingWifiId(network.id);
    setWifiFormData({ name: network.name, password: network.password || "" });
    setIsWifiModalOpen(true);
  };

  const saveWifiMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingWifiId) {
        await wifiNetworksApi.update(editingWifiId, payload);
      } else {
        await wifiNetworksApi.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wifiNetworks"] });
      toast.success(
        editingWifiId
          ? "WiFi network updated successfully!"
          : "WiFi network added successfully!",
      );
      setIsWifiModalOpen(false);
      setEditingWifiId(null);
      setWifiFormData({ name: "", password: "" });
    },
    onError: () => {
      toast.error(
        editingWifiId ? "Failed to update network" : "Failed to add network",
      );
    },
  });

  const handleSaveWifi = (e) => {
    e.preventDefault();
    if (!wifiFormData.name.trim()) {
      toast.error("Network name is required");
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    saveWifiMutation.mutate({ ...wifiFormData, updated_by: user.id });
  };

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
      setDeletingWifiId(null);
    },
  });

  const handleCopyPassword = (network) => {
    if (!network.password) return;
    navigator.clipboard.writeText(network.password);
    setCopiedWifiId(network.id);
    toast.success(`${network.name} password copied!`);
    setTimeout(() => setCopiedWifiId(null), 2000);
  };

  // --------------------------------------------------------------------------
  // Mutations: IP Restriction Policy
  // --------------------------------------------------------------------------
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
    } catch {
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

  // --------------------------------------------------------------------------
  // Mutations: Daily Canteen Lunch Menu
  // --------------------------------------------------------------------------
  const saveMenuMutation = useMutation({
    mutationFn: (items) => canteenMenuApi.updateMenu(items),
    onSuccess: (savedItems) => {
      queryClient.setQueryData(["canteenMenu"], savedItems);
      setHasMenuChanges(false);
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
      { id: uniqueId, name: "", is_veg: true, extra_charge: "" },
    ]);
    setHasMenuChanges(true);
    toast.success("Added new meal option");
  };

  const handleRemoveMenuItem = (index) => {
    const itemToRemove = menuItems[index];
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
    setHasMenuChanges(true);
    toast.success(`Removed "${itemToRemove?.name || `Option #${index + 1}`}"`);
  };

  const handleDuplicateMenuItem = (index) => {
    const itemToDuplicate = menuItems[index];
    const uniqueId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicate = {
      ...itemToDuplicate,
      id: uniqueId,
      name: `${itemToDuplicate.name} (Copy)`.trim(),
    };
    setMenuItems((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, duplicate);
      return next;
    });
    setHasMenuChanges(true);
    toast.success("Option duplicated");
  };

  const handleUpdateMenuItem = (index, field, value) => {
    setMenuItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setHasMenuChanges(true);
  };

  // --------------------------------------------------------------------------
  // Training Module Drag System (like AdminModulesList.jsx)
  // --------------------------------------------------------------------------
  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...menuItems];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    setDragIndex(null);
    setDragOverIndex(null);
    setMenuItems(reordered);
    setHasMenuChanges(true);

    toast.success(`Moved #${dragIndex + 1} to position #${dropIndex + 1}. Remember to Save Menu.`, {
      id: "menu-reorder-toast",
    });
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const reordered = [...menuItems];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index - 1, 0, moved);
    setMenuItems(reordered);
    setHasMenuChanges(true);
    toast.success(`Shifted #${index + 1} to #${index}`, { id: "menu-move-toast" });
  };

  const handleMoveDown = (index) => {
    if (index >= menuItems.length - 1) return;
    const reordered = [...menuItems];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index + 1, 0, moved);
    setMenuItems(reordered);
    setHasMenuChanges(true);
    toast.success(`Shifted #${index + 1} to #${index + 2}`, { id: "menu-move-toast" });
  };

  const handleResetMenu = () => {
    if (canteenMenuData && canteenMenuData.length > 0) {
      setMenuItems(canteenMenuData);
    } else {
      setMenuItems([
        { id: "item-default-1", name: "Standard Veg Thali", is_veg: true, extra_charge: 0 },
      ]);
    }
    setHasMenuChanges(false);
    toast("Reverted menu to last saved state", { icon: "↩️" });
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
      const charge = Number(menuItems[i].extra_charge) || 0;
      if (charge < 0) {
        toast.error(`Item #${i + 1} extra charge cannot be negative.`);
        return;
      }
    }
    const payload = menuItems.map((item) => ({
      ...item,
      extra_charge: Number(item.extra_charge) || 0,
    }));
    saveMenuMutation.mutate(payload);
  };

  const isPageLoading = networksLoading || settingsLoading || canteenMenuLoading;

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-stone-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading settings...</span>
        </div>
      </div>
    );
  }

  const configuredIpsCount = checkinIpList
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean).length;

  return (
    <div className="space-y-5 w-full">
      {/* ==================================================================== */}
      {/* NAVIGATION TABS + STATUS BADGES (MATCHING IMAGE COPY 2.PNG)          */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Tab Navigation (Matching SignupRequestsPage / PMLeavesPage) */}
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 w-fit">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-md transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                {tab.id === "canteen" && menuItems.length > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-medium ${
                      hasMenuChanges
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {menuItems.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Powai HQ and WFO Status Badges */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100/80 text-slate-700 text-xs font-medium border border-slate-200/70">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Powai HQ</span>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              isIpRestrictionEnabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isIpRestrictionEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span>{isIpRestrictionEnabled ? "WFO Protected" : "WFO Bypass Active"}</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: GENERAL INFORMATION                                           */}
      {/* ==================================================================== */}
      {activeTab === "general" && (
        <form
          onSubmit={handleSaveGeneral}
          className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="bg-stone-50/50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-800 flex items-center gap-2">
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
              disabled={saveGeneralMutation.isPending}
              isLoading={saveGeneralMutation.isPending}
            >
              {!saveGeneralMutation.isPending && <Save className="w-4 h-4" />}
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-stone-700">
                      Google Maps Link
                    </label>
                    {generalSettings.google_maps_link.trim() && (
                      <a
                        href={generalSettings.google_maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Test Link
                      </a>
                    )}
                  </div>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Employee Perks & Benefits
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPerksVisualMode(!isPerksVisualMode)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {isPerksVisualMode ? "Edit as Text" : "View as Chips"}
                  </button>
                </div>

                {isPerksVisualMode ? (
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newPerkInput}
                        onChange={(e) => setNewPerkInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPerk();
                          }
                        }}
                        placeholder="Add a perk and press Enter..."
                        className="flex-1 px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddPerk}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </Button>
                    </div>

                    <div className="flex-1 p-3 bg-stone-50/70 border border-stone-200 rounded-xl overflow-y-auto max-h-[160px] space-y-1.5">
                      {perksList.length === 0 ? (
                        <p className="text-xs text-stone-400 italic py-4 text-center">
                          No perks entered yet. Add one above.
                        </p>
                      ) : (
                        perksList.map((perk, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-800 group"
                          >
                            <span className="truncate">{perk}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePerk(i)}
                              className="text-stone-400 hover:text-red-600 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete perk"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
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
                )}
                <p className="text-[11px] font-medium text-stone-400 mt-1.5 ml-1">
                  Enter one perk per line. Displayed as a list to employees.
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: OFFICE WI-FI & SECURITY (REVAMPED 2-COLUMN BALANCED LAYOUT)    */}
      {/* ==================================================================== */}
      {activeTab === "network" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Column 1: Office Wi-Fi Networks */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-stone-50/50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-stone-800 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-blue-600" />
                    Office WiFi Networks
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Manage wireless networks available at the office.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={openAddWifi}>
                  <Plus className="w-4 h-4" />
                  Add Network
                </Button>
              </div>

              <div className="p-4 space-y-2.5">
                {networks.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-xs italic border border-dashed border-stone-200 rounded-xl">
                    No WiFi networks configured yet. Click "+ Add Network" to add one.
                  </div>
                ) : (
                  networks.map((network) => (
                    <div
                      key={network.id}
                      className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/40 hover:bg-stone-50 transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Wifi className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-stone-800 truncate">{network.name}</p>
                          <p className="text-xs text-stone-500 font-mono mt-0.5 truncate">
                            {network.password
                              ? `Password: ${network.password}`
                              : "Open Network (No Password)"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {network.password && (
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(network)}
                            className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-stone-200"
                            title="Copy Password"
                          >
                            {copiedWifiId === network.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditWifi(network)}
                          className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-stone-200"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWifiDeleteConfirm(network.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-stone-50/30 border-t border-stone-100 text-xs text-stone-400 flex items-center justify-between">
              <span>{networks.length} network(s) configured</span>
              <span>Visible in Employee Portal</span>
            </div>
          </div>

          {/* Column 2: Office Wi-Fi & Check-in IP Whitelist */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-stone-50/50 border-b border-stone-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-stone-800">
                        Check-in IP Whitelist
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
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
                      Restricts WFO check-ins to authorized office networks.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveIpSettings}
                  disabled={saveIpSettingsMutation.isPending}
                  isLoading={saveIpSettingsMutation.isPending}
                  className="shrink-0"
                >
                  {!saveIpSettingsMutation.isPending && <Save className="w-4 h-4" />}
                  Save IP Policy
                </Button>
              </div>

              <div className="p-5 space-y-4">
                {/* Emergency Toggle Card */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Radio className={`w-3.5 h-3.5 shrink-0 ${isIpRestrictionEnabled ? "text-emerald-600" : "text-amber-500"}`} />
                      <span className="text-xs font-bold text-stone-800">
                        Master IP Restriction Toggle
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-normal">
                      Turn <span className="font-semibold text-rose-600">OFF</span> during ISP outages to allow WFO check-in from any network.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isIpRestrictionEnabled}
                    onClick={() => setIsIpRestrictionEnabled(!isIpRestrictionEnabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shrink-0 ${
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
                      Allowed Office Public IPs & Subnets
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleDetectMyIp}
                        disabled={detectingIp}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-all shadow-2xs"
                      >
                        {detectingIp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3 text-blue-500" />}
                        Detect My IP
                      </button>
                      {detectedIp && (
                        <button
                          type="button"
                          onClick={handleAddDetectedIp}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all"
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-800 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-stone-400 resize-none"
                  />
                  <div className="flex items-center justify-between mt-1.5 text-[11px] text-stone-400">
                    <span>Supports individual IPv4 addresses or CIDR blocks.</span>
                    {checkinIpList.trim() && (
                      <span className="font-mono text-stone-500">
                        {configuredIpsCount} IP(s) configured
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-stone-50/30 border-t border-stone-100 text-xs text-stone-400 flex items-center justify-between">
              <span>Policy: {isIpRestrictionEnabled ? "Strict Enforcement" : "Emergency Bypass"}</span>
              <span>Auto-validated on Check-in</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: DAILY CANTEEN LUNCH MENU                                      */}
      {/* ==================================================================== */}
      {activeTab === "canteen" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (7 cols): Menu Editor (Using Training Module drag system) */}
            <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-stone-50/50 border-b border-stone-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-stone-800">Daily Canteen Lunch Menu</h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Drag rows to reorder meal options.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasMenuChanges && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleResetMenu}
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAddMenuItem}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveMenu}
                    disabled={saveMenuMutation.isPending}
                    isLoading={saveMenuMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    {!saveMenuMutation.isPending && <Save className="w-3.5 h-3.5" />}
                    Save Menu
                    {hasMenuChanges && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse ml-0.5" />
                    )}
                  </Button>
                </div>
              </div>


              {/* Items List using Training Module Drag System (like AdminModulesList) */}
              <div className="p-5 space-y-2.5">
                {menuItems.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-sm">
                    No menu items configured. Click "+ Add Item" to create one.
                  </div>
                ) : (
                  menuItems.map((item, i) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        setDragIndex(i);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverIndex !== i) setDragOverIndex(i);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(i);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`group relative bg-white border rounded-xl p-3 sm:p-3.5 transition-all flex flex-col sm:flex-row sm:items-center gap-3 ${
                        dragOverIndex === i && dragIndex !== null && dragIndex !== i
                          ? "border-indigo-400 border-dashed bg-indigo-50/40"
                          : "border-slate-200/80 hover:border-slate-300"
                      } ${dragIndex === i ? "opacity-40" : ""}`}
                    >
                      {/* Left: Drag Handle, Step Rank & Shift Controls */}
                      <div className="flex items-center gap-2">
                        {/* Grip Handle matching Training Module drag style */}
                        <span
                          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0 p-1"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>

                        {/* Accessible Up/Down Buttons */}
                        <div className="flex flex-col -space-y-1">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(i)}
                            disabled={i === 0}
                            className="p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded transition-colors"
                            title="Move Up"
                            aria-label="Move item up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(i)}
                            disabled={i === menuItems.length - 1}
                            className="p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded transition-colors"
                            title="Move Down"
                            aria-label="Move item down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Position Rank */}
                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center ml-0.5 shrink-0">
                          #{i + 1}
                        </span>
                      </div>

                      {/* Center: Meal Name Input */}
                      <div className="flex-1 min-w-[180px]">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateMenuItem(i, "name", e.target.value)}
                          onDragStart={(e) => e.stopPropagation()}
                          placeholder="e.g. Veg Thali, Chicken Biryani, Paneer Masala..."
                          className="w-full px-3 py-1.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                      </div>

                      {/* Right Controls: Veg/Non-Veg Toggle, Extra Charge, Actions */}
                      <div className="flex flex-wrap items-center gap-2.5 justify-between sm:justify-end">
                        {/* Dietary Segmented Switch */}
                        <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateMenuItem(i, "is_veg", true)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                              item.is_veg
                                ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Veg
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateMenuItem(i, "is_veg", false)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                              !item.is_veg
                                ? "bg-white text-rose-700 shadow-xs border border-rose-200"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Non-Veg
                          </button>
                        </div>

                        {/* Extra Charge Input */}
                        <div className="flex items-center gap-1.5">
                          <div className="relative w-24">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-xs text-slate-400 font-semibold select-none">
                              ₹
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={
                                item.extra_charge === 0 || item.extra_charge === "0"
                                  ? ""
                                  : item.extra_charge
                              }
                              onChange={(e) => {
                                const sanitized = e.target.value.replace(/[^0-9]/g, "");
                                handleUpdateMenuItem(i, "extra_charge", sanitized);
                              }}
                              onDragStart={(e) => e.stopPropagation()}
                              placeholder="0"
                              className="w-full pl-5 pr-2 py-1 text-xs font-semibold text-slate-800 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-right"
                            />
                          </div>
                          {Number(item.extra_charge) > 0 ? (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              +₹{item.extra_charge}
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Free
                            </span>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleDuplicateMenuItem(i)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Duplicate Option"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMenuItem(i)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove Option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column (5 cols): Live Check-in Preview */}
            <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl shadow-sm p-5 space-y-3 sticky top-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-800">Employee Check-in Preview</h3>
                    <p className="text-[11px] text-stone-400">Live preview of check-in lunch selection</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Cutoff: 11:00 AM
                </span>
              </div>

              {/* Simulated Card from DailyCheckInModal */}
              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked
                    readOnly
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Canteen (6th Floor)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Choose from today's prepared menu options.
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-100/70 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block">
                    Select Today's Meal Option:
                  </span>
                  {menuItems.length === 0 ? (
                    <p className="text-xs text-stone-400 italic py-2">
                      Standard meal will be served today.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {menuItems.map((item, idx) => {
                        const isSelected = previewSelectedId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPreviewSelectedId(item.id)}
                            className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                              isSelected
                                ? "border-indigo-500 bg-white ring-1 ring-indigo-400 shadow-2xs"
                                : "border-slate-200 bg-white/70 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs shrink-0">{item.is_veg ? "🟢" : "🔴"}</span>
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {item.name || `Option #${idx + 1}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span
                                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                  Number(item.extra_charge) > 0
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {Number(item.extra_charge) > 0 ? `+₹${item.extra_charge}` : "Free"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ADD / EDIT WI-FI MODAL                                               */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isWifiModalOpen}
        onClose={() => {
          setIsWifiModalOpen(false);
          setEditingWifiId(null);
        }}
        size="md"
      >
        <form onSubmit={handleSaveWifi}>
          <Modal.Header
            onClose={() => {
              setIsWifiModalOpen(false);
              setEditingWifiId(null);
            }}
          >
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-stone-800">
                {editingWifiId ? "Edit WiFi Network" : "Add New WiFi Network"}
              </h3>
            </div>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Network Name (SSID) *
              </label>
              <input
                type="text"
                value={wifiFormData.name}
                onChange={(e) => setWifiFormData({ ...wifiFormData, name: e.target.value })}
                placeholder="e.g. Autonex-5G"
                required
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Password
              </label>
              <input
                type="text"
                value={wifiFormData.password}
                onChange={(e) => setWifiFormData({ ...wifiFormData, password: e.target.value })}
                placeholder="Leave blank for open network"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
              />
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button
              type="button"
              variant="cancel"
              onClick={() => {
                setIsWifiModalOpen(false);
                setEditingWifiId(null);
              }}
              disabled={saveWifiMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saveWifiMutation.isPending}
              isLoading={saveWifiMutation.isPending}
            >
              {!saveWifiMutation.isPending && <Save className="w-4 h-4" />}
              {editingWifiId ? "Save Changes" : "Add Network"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* DELETE CONFIRMATION DIALOG                                           */}
      {/* ==================================================================== */}
      <ConfirmDialog
        isOpen={wifiDeleteConfirm !== null}
        onClose={() => setWifiDeleteConfirm(null)}
        onConfirm={() => {
          if (wifiDeleteConfirm) {
            setDeletingWifiId(wifiDeleteConfirm);
            deleteWifiMutation.mutate(wifiDeleteConfirm);
            setWifiDeleteConfirm(null);
          }
        }}
        title="Delete WiFi Network"
        message="Are you sure you want to delete this WiFi network? This action cannot be undone."
        isPending={deletingWifiId !== null}
      />
    </div>
  );
};

export default AdminCompanySettingsPage;
