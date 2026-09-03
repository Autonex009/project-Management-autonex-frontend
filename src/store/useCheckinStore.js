import { create } from "zustand";

const useCheckinStore = create((set) => ({
  isDismissed: false,
  isOpenManually: false,
  dismiss: () => set({ isDismissed: true, isOpenManually: false }),
  open: () => set({ isOpenManually: true }),
}));

export default useCheckinStore;