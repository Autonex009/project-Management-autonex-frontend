import { create } from "zustand";

const useCheckinStore = create((set) => ({
  isDismissed: false,
  isOpenManually: false,
  isModalOpen: false,
  canLoadDashboard: false,
  setCanLoadDashboard: (allowed) => set({ canLoadDashboard: Boolean(allowed) }),
  setModalOpen: (open) => set({ isModalOpen: Boolean(open) }),
  dismiss: () => set({ isDismissed: true, isOpenManually: false, isModalOpen: false, canLoadDashboard: true }),
  open: () => set({ isOpenManually: true, isModalOpen: true }),
  reset: () => set({ isDismissed: false, isOpenManually: false, isModalOpen: false, canLoadDashboard: false }),
}));

export default useCheckinStore;