import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Utensils,
  Plus,
  Save,
  Trash2,
  Clock,
  CheckCircle2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Eye,
} from "lucide-react";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { canteenMenuApi } from "../../services/api";
import toast from "react-hot-toast";

const EmployeeCanteenMenuPage = () => {
  const queryClient = useQueryClient();

  const { data: canteenMenuData = [], isLoading } = useQuery({
    queryKey: ["canteenMenu"],
    queryFn: () => canteenMenuApi.getMenu(),
    staleTime: 5 * 60 * 1000,
  });

  const [menuItems, setMenuItems] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewSelectedId, setPreviewSelectedId] = useState(null);

  // Training Module drag system state
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    if (canteenMenuData && canteenMenuData.length > 0) {
      setMenuItems(canteenMenuData);
      setPreviewSelectedId(canteenMenuData[0]?.id || null);
      setHasChanges(false);
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

  const saveMenuMutation = useMutation({
    mutationFn: (items) => canteenMenuApi.updateMenu(items),
    onSuccess: (savedItems) => {
      // Zero-Network Cache Surgery: patch TanStack Query in RAM directly
      queryClient.setQueryData(["canteenMenu"], savedItems);
      setHasChanges(false);
      toast.success("Canteen lunch menu saved and published successfully!");
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Failed to save canteen menu. Please try again.";
      toast.error(typeof msg === "string" ? msg : "Failed to save canteen menu.");
    },
  });

  const handleAddMenuItem = () => {
    const uniqueId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setMenuItems((prev) => [
      ...prev,
      { id: uniqueId, name: "", is_veg: true, extra_charge: "" },
    ]);
    setHasChanges(true);
    toast.success("Added new meal option");
  };

  const handleRemoveMenuItem = (index) => {
    const itemToRemove = menuItems[index];
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
    toast.success(`Removed "${itemToRemove?.name || `Option #${index + 1}`}"`);
  };

  const handleDuplicateMenuItem = (index) => {
    const itemToDuplicate = menuItems[index];
    const uniqueId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
    setHasChanges(true);
    toast.success("Option duplicated");
  };

  const handleUpdateMenuItem = (index, field, value) => {
    setMenuItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setHasChanges(true);
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
    setHasChanges(true);

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
    setHasChanges(true);
    toast.success(`Shifted #${index + 1} to #${index}`, { id: "menu-move-toast" });
  };

  const handleMoveDown = (index) => {
    if (index >= menuItems.length - 1) return;
    const reordered = [...menuItems];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index + 1, 0, moved);
    setMenuItems(reordered);
    setHasChanges(true);
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
    setHasChanges(false);
    toast("Reverted menu to last saved state", { icon: "↩️" });
  };

  const handleSaveMenu = () => {
    if (menuItems.length === 0) {
      toast.error("Please add at least one menu item before saving.");
      return;
    }

    for (let i = 0; i < menuItems.length; i++) {
      const trimmedName = (menuItems[i].name || "").trim();
      if (!trimmedName) {
        toast.error(`Item #${i + 1} name cannot be empty.`);
        return;
      }
      const charge = Number(menuItems[i].extra_charge) || 0;
      if (charge < 0) {
        toast.error(`Item #${i + 1} extra charge cannot be negative.`);
        return;
      }
    }

    const payload = menuItems.map((m) => ({
      ...m,
      name: m.name.trim(),
      extra_charge: Number(m.extra_charge) || 0,
    }));

    saveMenuMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Top Banner / Info Card */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-display font-bold text-stone-900">
                  Daily Canteen Lunch Menu
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Booking closes strictly at 11:00 AM IST daily.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {hasChanges && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetMenu}
                className="flex items-center gap-1 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddMenuItem}
              className="flex items-center gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveMenu}
              isLoading={saveMenuMutation.isPending}
              disabled={saveMenuMutation.isPending}
              className="flex items-center gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
            >
              <Save className="w-3.5 h-3.5" />
              Save Menu
              {hasChanges && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse ml-0.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Responsive Grid: Menu Items (Left) + Live Check-in Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols on desktop, full-width on mobile): Menu Items */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-stone-50/50 border-b border-stone-200 px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-800">
                Today's Menu Items ({menuItems.length})
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Drag rows or use arrows to reorder meal options.
              </p>
            </div>
            {hasChanges && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Unsaved
              </span>
            )}
          </div>

          {/* Items List (Mobile-Optimized Responsive Cards) */}
          <div className="p-3 sm:p-5 space-y-2.5">
            {menuItems.length === 0 ? (
              <div className="text-center py-10 text-stone-400 text-sm">
                <Utensils className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                No menu items configured yet. Click "+ Add Item" above to create one.
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
                  className={`group relative bg-white border rounded-xl p-3 sm:p-3.5 transition-all flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 ${
                    dragOverIndex === i && dragIndex !== null && dragIndex !== i
                      ? "border-amber-400 border-dashed bg-amber-50/40"
                      : "border-slate-200/80 hover:border-slate-300"
                  } ${dragIndex === i ? "opacity-40" : ""}`}
                >
                  {/* Top / Left: Drag Handle, Shift Arrows, Rank & Meal Name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Grip Handle */}
                    <span
                      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0 p-1 touch-none"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>

                    {/* Accessible Up/Down Buttons (Essential for 1-tap mobile sorting!) */}
                    <div className="flex flex-col -space-y-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(i)}
                        disabled={i === 0}
                        className="p-0.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded transition-colors"
                        title="Move Up"
                        aria-label="Move item up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(i)}
                        disabled={i === menuItems.length - 1}
                        className="p-0.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded transition-colors"
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

                    {/* Meal Name Input (Full width on mobile!) */}
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateMenuItem(i, "name", e.target.value)}
                      onDragStart={(e) => e.stopPropagation()}
                      placeholder="e.g. Veg Thali, Pav Bhaji, Bhurji Pav..."
                      className="flex-1 min-w-0 px-3 py-1.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all"
                    />
                  </div>

                  {/* Bottom / Right Controls (Veg/Non-Veg, Extra Charge, Actions) */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 justify-between sm:justify-end shrink-0 pl-7 sm:pl-0">
                    {/* Dietary Segmented Switch */}
                    <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
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

                    {/* Extra Charge Input (No up/down stepper arrows, blank when 0!) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="relative w-20 sm:w-24">
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
                          className="w-full pl-5 pr-2 py-1 text-xs font-semibold text-slate-800 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all text-right"
                        />
                      </div>
                      {Number(item.extra_charge) > 0 ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          +₹{item.extra_charge}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Free
                        </span>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDuplicateMenuItem(i)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
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

        {/* Right Column (5 cols on desktop, responsive card below on mobile): Live Check-in Preview */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl shadow-sm p-4 sm:p-5 space-y-3 lg:sticky lg:top-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-800">Check-in Modal Preview</h3>
                <p className="text-[11px] text-stone-400">Live preview of what employees see</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Cutoff: 11:00 AM
            </span>
          </div>

          {/* Simulated Card from DailyCheckInModal */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                checked
                readOnly
                className="w-4 h-4 accent-amber-600"
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

            <div className="pt-2 border-t border-amber-100 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                Today's Meal Options:
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
                            ? "border-amber-500 bg-white ring-1 ring-amber-400 shadow-2xs"
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
  );
};

export default EmployeeCanteenMenuPage;
