import { create } from "zustand";

const useProjectsStore = create((set) => ({
  // Filters and State
  selectedOrganization: "all",
  selectedPm: "all",
  selectedTeamLead: "all",
  selectedStatus: "all",
  selectedPriority: "all",
  projectView: "active", // 'active' | 'archived' | 'development'
  autonexOnly: false,
  subProjectSearch: "",
  currentPage: 1,
  filtersOpen: false,

  // Setters
  setSelectedOrganization: (selectedOrganization) => set({ selectedOrganization }),
  setSelectedPm: (selectedPm) => set({ selectedPm }),
  setSelectedTeamLead: (selectedTeamLead) => set({ selectedTeamLead }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus }),
  setSelectedPriority: (selectedPriority) => set({ selectedPriority }),
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
      selectedOrganization: "all",
      selectedPm: "all",
      selectedTeamLead: "all",
      selectedStatus: "all",
      selectedPriority: "all",
      projectView: "active",
      autonexOnly: false,
      subProjectSearch: "",
      currentPage: 1,
      filtersOpen: false,
    }),
}));

export default useProjectsStore;
