import { create } from "zustand";

const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (!val || val === "all") return [];
  return [val];
};

const useProjectsStore = create((set) => ({
  // Filters and State (stored as arrays for multi-select support)
  selectedOrganization: [],
  selectedPm: [],
  selectedTeamLead: [],
  selectedStatus: [],
  selectedPriority: [],
  projectView: "active", // 'active' | 'archived' | 'development'
  autonexOnly: false,
  subProjectSearch: "",
  currentPage: 1,
  filtersOpen: false,

  // Setters
  setSelectedOrganization: (selectedOrganization) => set({ selectedOrganization: toArray(selectedOrganization) }),
  setSelectedPm: (selectedPm) => set({ selectedPm: toArray(selectedPm) }),
  setSelectedTeamLead: (selectedTeamLead) => set({ selectedTeamLead: toArray(selectedTeamLead) }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus: toArray(selectedStatus) }),
  setSelectedPriority: (selectedPriority) => set({ selectedPriority: toArray(selectedPriority) }),
  setProjectView: (projectView) => set({ projectView }),
  setAutonexOnly: (updater) =>
    set((state) => ({
      autonexOnly: typeof updater === "function" ? updater(state.autonexOnly) : updater,
    })),
  setSubProjectSearch: (subProjectSearch) => set({ subProjectSearch }),
  setCurrentPage: (updater) =>
    set((state) => ({
      currentPage: typeof updater === "function" ? updater(state.currentPage) : updater,
    })),
  setFiltersOpen: (updater) =>
    set((state) => ({
      filtersOpen: typeof updater === "function" ? updater(state.filtersOpen) : updater,
    })),

  // Reset
  resetFilters: () =>
    set({
      selectedOrganization: [],
      selectedPm: [],
      selectedTeamLead: [],
      selectedStatus: [],
      selectedPriority: [],
      projectView: "active",
      autonexOnly: false,
      subProjectSearch: "",
      currentPage: 1,
      filtersOpen: false,
    }),
}));

export default useProjectsStore;
