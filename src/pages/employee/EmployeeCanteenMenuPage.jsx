import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Utensils,
  Plus,
  Save,
  Trash2,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
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

  useEffect(() => {
    if (canteenMenuData && canteenMenuData.length > 0) {
      setMenuItems(canteenMenuData);
      setHasChanges(false);
    } else {
      setMenuItems([
        { id: "item-default-1", name: "Veg Thali", is_veg: true, extra_charge: 0 },
      ]);
    }
  }, [canteenMenuData]);

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
      { id: uniqueId, name: "", is_veg: true, extra_charge: 0 },
    ]);
    setHasChanges(true);
  };

  const handleRemoveMenuItem = (index) => {
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleUpdateMenuItem = (index, field, value) => {
    setMenuItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setHasChanges(true);
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
      if (menuItems[i].extra_charge < 0) {
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner / Info */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-stone-900 flex items-center gap-2">
                Daily Canteen Lunch Menu Management
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Live Sync
                </span>
              </h1>
              <p className="text-xs text-stone-600 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Employees select from this menu during WFO check-in. Booking closes strictly at 11:00 AM IST daily.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
              disabled={saveMenuMutation.isPending}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
            >
              <Save className="w-4 h-4" />
              Save Menu
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table Card (Matches Admin Style exactly) */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-stone-50/50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-display font-bold text-stone-800">
              Today's Menu Items ({menuItems.length})
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Specify meal title, dietary category (Veg / Non-Veg), and optional extra charges.
            </p>
          </div>
          {hasChanges && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="p-6">
          {menuItems.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-sm">
              <Utensils className="w-8 h-8 mx-auto text-stone-300 mb-2" />
              No menu items configured yet. Click "+ Add Item" above to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-16">Sr.</th>
                    <th className="py-2.5 px-3 min-w-[240px]">Menu Option</th>
                    <th className="py-2.5 px-3 w-48">Dietary Type</th>
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
                          placeholder="e.g. Veg Thali, Pav Bhaji, Bhurji Pav..."
                          className="w-full px-3 py-1.5 rounded-lg border border-stone-200 text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
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
                            step="5"
                            value={item.extra_charge}
                            onChange={(e) =>
                              handleUpdateMenuItem(
                                index,
                                "extra_charge",
                                Math.max(0, parseFloat(e.target.value) || 0)
                              )
                            }
                            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-stone-200 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
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
  );
};

export default EmployeeCanteenMenuPage;
